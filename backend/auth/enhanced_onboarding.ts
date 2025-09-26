import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import db from "../db";
import { logger } from "../common/logger";
import { realtimeService } from "../system/realtime_service";
import { ValidationService, UserValidationRules } from "../common/validation";

const jwtSecret = secret("JWT_SECRET");

interface OnboardingStep {
  step: number;
  name: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  data?: Record<string, any>;
}

interface UserOnboardingStatus {
  userId: number;
  userType: string;
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  isCompleted: boolean;
  steps: OnboardingStep[];
  nextAction: string;
}

interface CompleteOnboardingStepRequest {
  step: number;
  data: Record<string, any>;
}

// Enhanced registration with role-specific onboarding
export const enhancedRegister = api(
  { expose: true, method: "POST", path: "/auth/enhanced-register" },
  async (req: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    city?: string;
    state?: string;
    userType: 'customer' | 'interior_designer' | 'vendor' | 'project_manager';
    referralCode?: string;
    marketingConsent?: boolean;
  }) => {
    // Enhanced validation
    const validationData = {
      email: req.email,
      first_name: req.firstName,
      last_name: req.lastName,
      password: req.password,
      phone: req.phone,
      city: req.city
    };
    ValidationService.validateAndThrow(validationData, UserValidationRules.create);

    // Additional business validations
    if (req.password.length < 8) {
      throw APIError.invalidArgument("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(req.password)) {
      throw APIError.invalidArgument("Password must contain uppercase, lowercase, and number");
    }

    if (!/^(\+91|0)?[6-9]\d{9}$/.test(req.phone)) {
      throw APIError.invalidArgument("Please provide a valid Indian mobile number");
    }

    try {
      const result = await db.tx(async (tx) => {
        // Check if user already exists
        const existingUser = await tx.queryRow`
          SELECT id FROM users WHERE email = ${req.email.toLowerCase()}
        `;

        if (existingUser) {
          throw APIError.alreadyExists("User with this email already exists");
        }

        // Check referral code if provided
        let referralUserId = null;
        if (req.referralCode) {
          const referrer = await tx.queryRow`
            SELECT id FROM users WHERE referral_code = ${req.referralCode}
          `;
          if (referrer) {
            referralUserId = referrer.id;
          }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(req.password, 12);

        // Generate unique referral code for new user
        const userReferralCode = `REF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Create user
        const user = await tx.queryRow`
          INSERT INTO users (
            email, password_hash, first_name, last_name, phone, city, state, country,
            referral_code, referred_by, marketing_consent_given, email_verification_token
          ) VALUES (
            ${req.email.toLowerCase()}, ${passwordHash}, ${req.firstName}, ${req.lastName}, 
            ${req.phone}, ${req.city}, ${req.state}, 'India',
            ${userReferralCode}, ${referralUserId}, ${req.marketingConsent || false},
            ${Math.random().toString(36).substr(2, 32)}
          ) RETURNING *
        `;

        // Assign primary role
        const role = await tx.queryRow`
          SELECT id FROM roles WHERE name = ${req.userType}
        `;

        if (role) {
          await tx.exec`
            INSERT INTO user_roles (user_id, role_id)
            VALUES (${user.id}, ${role.id})
          `;
        }

        // Create wallet
        await tx.exec`
          INSERT INTO wallets (user_id, balance, total_earned, total_spent)
          VALUES (${user.id}, 0, 0, 0)
        `;

        // Create user preferences with role-specific defaults
        const defaultPrefs = getDefaultPreferencesForRole(req.userType);
        await tx.exec`
          INSERT INTO user_preferences (
            user_id, email_notifications, push_notifications, sms_notifications,
            theme, language, timezone, realtime_updates
          ) VALUES (
            ${user.id}, ${defaultPrefs.emailNotifications}, ${defaultPrefs.pushNotifications},
            ${defaultPrefs.smsNotifications}, ${defaultPrefs.theme}, ${defaultPrefs.language},
            ${defaultPrefs.timezone}, ${defaultPrefs.realtimeUpdates}
          )
        `;

        // Initialize onboarding process
        await tx.exec`
          INSERT INTO user_onboarding (
            user_id, user_type, current_step, total_steps, is_completed
          ) VALUES (
            ${user.id}, ${req.userType}, 1, ${getOnboardingStepsCount(req.userType)}, false
          )
        `;

        // Handle referral rewards
        if (referralUserId) {
          await handleReferralReward(tx, referralUserId, user.id);
        }

        return { user, userReferralCode };
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userID: result.user.id.toString(),
          email: result.user.email,
          roles: [req.userType]
        },
        jwtSecret(),
        { expiresIn: "7d" }
      );

      // Log registration
      await logger.logUserAction(result.user.id, 'user_registered', 'user', result.user.id, {
        userType: req.userType,
        referralCode: req.referralCode,
        city: req.city
      });

      // Send welcome notification
      await realtimeService.sendNotification({
        userId: result.user.id,
        title: 'Welcome to Gharinto!',
        content: `Welcome ${req.firstName}! Let's complete your profile to get started.`,
        type: 'welcome',
        priority: 'medium'
      });

      // Send verification email (in production)
      await sendVerificationEmail(result.user.email, result.user.email_verification_token);

      return {
        success: true,
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          userType: req.userType,
          referralCode: result.userReferralCode,
          needsOnboarding: true
        }
      };

    } catch (error) {
      await logger.error('Auth', 'registration_failed', error as Error, {
        email: req.email,
        userType: req.userType
      });
      throw error instanceof APIError ? error : APIError.internal("Registration failed");
    }
  }
);

// Get user onboarding status
export const getOnboardingStatus = api(
  { auth: true, expose: true, method: "GET", path: "/auth/onboarding/status" },
  async (): Promise<UserOnboardingStatus> => {
    const auth = getAuthData()!;
    
    const onboarding = await db.queryRow`
      SELECT uo.*, u.first_name, u.last_name
      FROM user_onboarding uo
      JOIN users u ON uo.user_id = u.id
      WHERE uo.user_id = ${auth.userID}
    `;

    if (!onboarding) {
      throw APIError.notFound("Onboarding record not found");
    }

    // Get role-specific onboarding steps
    const steps = getOnboardingStepsForRole(onboarding.user_type);
    
    // Get completed steps data
    const completedSteps = await db.queryAll`
      SELECT step_number, step_data, completed_at
      FROM user_onboarding_steps
      WHERE user_id = ${auth.userID}
      ORDER BY step_number
    `;

    const completedStepNumbers = new Set(completedSteps.map(s => s.step_number));
    
    // Enhance steps with completion status
    const enhancedSteps = steps.map(step => ({
      ...step,
      completed: completedStepNumbers.has(step.step),
      data: completedSteps.find(cs => cs.step_number === step.step)?.step_data
    }));

    const completedCount = enhancedSteps.filter(s => s.completed).length;
    const completionPercentage = Math.round((completedCount / steps.length) * 100);

    return {
      userId: parseInt(auth.userID),
      userType: onboarding.user_type,
      currentStep: onboarding.current_step,
      totalSteps: onboarding.total_steps,
      completionPercentage,
      isCompleted: onboarding.is_completed,
      steps: enhancedSteps,
      nextAction: getNextActionForStep(onboarding.current_step, onboarding.user_type)
    };
  }
);

// Complete onboarding step
export const completeOnboardingStep = api(
  { auth: true, expose: true, method: "POST", path: "/auth/onboarding/complete-step" },
  async (req: CompleteOnboardingStepRequest) => {
    const auth = getAuthData()!;
    
    try {
      const result = await db.tx(async (tx) => {
        // Get current onboarding status
        const onboarding = await tx.queryRow`
          SELECT * FROM user_onboarding WHERE user_id = ${auth.userID}
        `;

        if (!onboarding) {
          throw APIError.notFound("Onboarding record not found");
        }

        if (onboarding.is_completed) {
          throw APIError.invalidArgument("Onboarding already completed");
        }

        // Validate step number
        if (req.step < 1 || req.step > onboarding.total_steps) {
          throw APIError.invalidArgument(`Invalid step number. Must be between 1 and ${onboarding.total_steps}`);
        }

        // Validate step data based on role and step
        await validateStepData(onboarding.user_type, req.step, req.data);

        // Process step-specific logic
        await processStepCompletion(tx, parseInt(auth.userID), onboarding.user_type, req.step, req.data);

        // Record step completion
        await tx.exec`
          INSERT INTO user_onboarding_steps (user_id, step_number, step_data, completed_at)
          VALUES (${auth.userID}, ${req.step}, ${JSON.stringify(req.data)}, NOW())
          ON CONFLICT (user_id, step_number) DO UPDATE SET
            step_data = EXCLUDED.step_data,
            completed_at = EXCLUDED.completed_at
        `;

        // Update current step
        const nextStep = req.step + 1;
        const isCompleted = nextStep > onboarding.total_steps;

        await tx.exec`
          UPDATE user_onboarding 
          SET 
            current_step = ${isCompleted ? onboarding.total_steps : nextStep},
            is_completed = ${isCompleted},
            completed_at = ${isCompleted ? 'NOW()' : null}
          WHERE user_id = ${auth.userID}
        `;

        return { isCompleted, nextStep: isCompleted ? null : nextStep };
      });

      // Log step completion
      await logger.logUserAction(parseInt(auth.userID), 'onboarding_step_completed', 'onboarding', req.step, {
        step: req.step,
        dataKeys: Object.keys(req.data)
      });

      // Send completion notification
      if (result.isCompleted) {
        await realtimeService.sendNotification({
          userId: parseInt(auth.userID),
          title: 'Onboarding Complete!',
          content: 'Welcome to Gharinto! Your profile is now complete and you can start using all features.',
          type: 'onboarding_complete',
          priority: 'high'
        });

        // Grant onboarding completion bonus
        await grantOnboardingBonus(parseInt(auth.userID));
      } else {
        await realtimeService.sendNotification({
          userId: parseInt(auth.userID),
          title: 'Step Complete!',
          content: `Great progress! You've completed step ${req.step}. Let's continue with the next step.`,
          type: 'onboarding_progress',
          priority: 'medium'
        });
      }

      return {
        success: true,
        stepCompleted: req.step,
        isOnboardingComplete: result.isCompleted,
        nextStep: result.nextStep
      };

    } catch (error) {
      await logger.error('Auth', 'onboarding_step_failed', error as Error, {
        userId: auth.userID,
        step: req.step
      });
      throw error instanceof APIError ? error : APIError.internal("Failed to complete onboarding step");
    }
  }
);

// Helper functions
function getDefaultPreferencesForRole(userType: string) {
  const defaults = {
    customer: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      theme: 'light',
      language: 'en',
      timezone: 'Asia/Kolkata',
      realtimeUpdates: true
    },
    interior_designer: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: true,
      theme: 'light',
      language: 'en',
      timezone: 'Asia/Kolkata',
      realtimeUpdates: true
    },
    vendor: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: true,
      theme: 'light',
      language: 'en',
      timezone: 'Asia/Kolkata',
      realtimeUpdates: true
    },
    project_manager: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: true,
      theme: 'dark',
      language: 'en',
      timezone: 'Asia/Kolkata',
      realtimeUpdates: true
    }
  };

  return defaults[userType] || defaults.customer;
}

function getOnboardingStepsCount(userType: string): number {
  const stepCounts = {
    customer: 5,
    interior_designer: 8,
    vendor: 7,
    project_manager: 6
  };
  return stepCounts[userType] || 5;
}

function getOnboardingStepsForRole(userType: string): OnboardingStep[] {
  const stepDefinitions = {
    customer: [
      {
        step: 1,
        name: 'profile_basic',
        title: 'Complete Basic Profile',
        description: 'Add your basic information and contact details',
        required: true,
        completed: false
      },
      {
        step: 2,
        name: 'preferences',
        title: 'Set Your Preferences',
        description: 'Tell us about your design preferences and budget range',
        required: true,
        completed: false
      },
      {
        step: 3,
        name: 'project_details',
        title: 'Project Information',
        description: 'Share details about your upcoming project',
        required: false,
        completed: false
      },
      {
        step: 4,
        name: 'payment_setup',
        title: 'Payment Setup',
        description: 'Add payment methods and verify your account',
        required: true,
        completed: false
      },
      {
        step: 5,
        name: 'welcome_tour',
        title: 'Platform Tour',
        description: 'Take a quick tour of the platform features',
        required: false,
        completed: false
      }
    ],
    interior_designer: [
      {
        step: 1,
        name: 'profile_basic',
        title: 'Basic Profile',
        description: 'Complete your basic professional information',
        required: true,
        completed: false
      },
      {
        step: 2,
        name: 'professional_details',
        title: 'Professional Details',
        description: 'Add your qualifications, experience, and specializations',
        required: true,
        completed: false
      },
      {
        step: 3,
        name: 'portfolio',
        title: 'Portfolio Upload',
        description: 'Showcase your best work with a portfolio',
        required: true,
        completed: false
      },
      {
        step: 4,
        name: 'certifications',
        title: 'Certifications & Documents',
        description: 'Upload your certifications and professional documents',
        required: true,
        completed: false
      },
      {
        step: 5,
        name: 'service_areas',
        title: 'Service Areas',
        description: 'Define your service locations and availability',
        required: true,
        completed: false
      },
      {
        step: 6,
        name: 'pricing',
        title: 'Pricing Structure',
        description: 'Set your pricing for different types of projects',
        required: true,
        completed: false
      },
      {
        step: 7,
        name: 'bank_details',
        title: 'Banking Information',
        description: 'Add bank details for payments',
        required: true,
        completed: false
      },
      {
        step: 8,
        name: 'verification',
        title: 'Profile Verification',
        description: 'Complete identity and professional verification',
        required: true,
        completed: false
      }
    ],
    vendor: [
      {
        step: 1,
        name: 'company_profile',
        title: 'Company Profile',
        description: 'Add your company information and details',
        required: true,
        completed: false
      },
      {
        step: 2,
        name: 'business_details',
        title: 'Business Details',
        description: 'Business registration, GST, and legal information',
        required: true,
        completed: false
      },
      {
        step: 3,
        name: 'product_catalog',
        title: 'Product Catalog',
        description: 'Add your products and services catalog',
        required: true,
        completed: false
      },
      {
        step: 4,
        name: 'pricing_inventory',
        title: 'Pricing & Inventory',
        description: 'Set up your pricing and inventory management',
        required: true,
        completed: false
      },
      {
        step: 5,
        name: 'delivery_areas',
        title: 'Delivery Areas',
        description: 'Define your delivery locations and policies',
        required: true,
        completed: false
      },
      {
        step: 6,
        name: 'bank_details',
        title: 'Banking Information',
        description: 'Add bank details for payments',
        required: true,
        completed: false
      },
      {
        step: 7,
        name: 'verification',
        title: 'Business Verification',
        description: 'Complete business verification process',
        required: true,
        completed: false
      }
    ],
    project_manager: [
      {
        step: 1,
        name: 'profile_basic',
        title: 'Basic Profile',
        description: 'Complete your basic professional information',
        required: true,
        completed: false
      },
      {
        step: 2,
        name: 'experience_skills',
        title: 'Experience & Skills',
        description: 'Detail your project management experience and skills',
        required: true,
        completed: false
      },
      {
        step: 3,
        name: 'certifications',
        title: 'Certifications',
        description: 'Upload your project management certifications',
        required: true,
        completed: false
      },
      {
        step: 4,
        name: 'availability',
        title: 'Availability',
        description: 'Set your availability and working preferences',
        required: true,
        completed: false
      },
      {
        step: 5,
        name: 'team_preferences',
        title: 'Team Preferences',
        description: 'Define your team management preferences',
        required: false,
        completed: false
      },
      {
        step: 6,
        name: 'tools_setup',
        title: 'Tools Setup',
        description: 'Configure your project management tools and workflows',
        required: false,
        completed: false
      }
    ]
  };

  return stepDefinitions[userType] || stepDefinitions.customer;
}

function getNextActionForStep(currentStep: number, userType: string): string {
  const actions = {
    1: 'Complete your basic profile information',
    2: 'Set your preferences and requirements',
    3: 'Add additional details based on your role',
    4: 'Set up payment and verification',
    5: 'Complete final setup steps'
  };

  return actions[currentStep] || 'Continue with onboarding';
}

async function validateStepData(userType: string, step: number, data: Record<string, any>) {
  // Role and step-specific validation logic
  const validations = {
    customer: {
      1: ['firstName', 'lastName', 'phone', 'city'],
      2: ['budgetRange', 'designStyle', 'projectType'],
      4: ['paymentMethod']
    },
    interior_designer: {
      1: ['firstName', 'lastName', 'phone', 'city'],
      2: ['experience', 'specializations', 'qualifications'],
      3: ['portfolioImages'],
      4: ['certificationDocuments'],
      5: ['serviceAreas', 'availability'],
      6: ['pricingStructure'],
      7: ['bankDetails'],
      8: ['identityDocuments']
    },
    vendor: {
      1: ['companyName', 'contactPerson', 'phone', 'address'],
      2: ['gstNumber', 'panNumber', 'businessRegistration'],
      3: ['productCategories'],
      4: ['pricingModel'],
      5: ['deliveryAreas'],
      6: ['bankDetails'],
      7: ['businessDocuments']
    },
    project_manager: {
      1: ['firstName', 'lastName', 'phone', 'city'],
      2: ['experience', 'skills', 'projectTypes'],
      3: ['certifications'],
      4: ['availability', 'workingHours'],
      5: ['teamSize', 'managementStyle'],
      6: ['tools', 'workflows']
    }
  };

  const requiredFields = validations[userType]?.[step] || [];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw APIError.invalidArgument(`Required field '${field}' is missing for step ${step}`);
    }
  }
}

async function processStepCompletion(tx: any, userId: number, userType: string, step: number, data: Record<string, any>) {
  // Process step-specific logic
  switch (userType) {
    case 'customer':
      await processCustomerStepCompletion(tx, userId, step, data);
      break;
    case 'interior_designer':
      await processDesignerStepCompletion(tx, userId, step, data);
      break;
    case 'vendor':
      await processVendorStepCompletion(tx, userId, step, data);
      break;
    case 'project_manager':
      await processPMStepCompletion(tx, userId, step, data);
      break;
  }
}

async function processCustomerStepCompletion(tx: any, userId: number, step: number, data: Record<string, any>) {
  switch (step) {
    case 1:
      // Update basic profile
      await tx.exec`
        UPDATE users 
        SET first_name = ${data.firstName}, last_name = ${data.lastName}, 
            phone = ${data.phone}, city = ${data.city}, state = ${data.state}
        WHERE id = ${userId}
      `;
      break;
    case 2:
      // Create customer preferences
      await tx.exec`
        INSERT INTO customer_preferences (
          user_id, budget_min, budget_max, design_styles, project_types, timeline
        ) VALUES (
          ${userId}, ${data.budgetMin}, ${data.budgetMax}, ${data.designStyles}, 
          ${data.projectTypes}, ${data.timeline}
        ) ON CONFLICT (user_id) DO UPDATE SET
          budget_min = EXCLUDED.budget_min,
          budget_max = EXCLUDED.budget_max,
          design_styles = EXCLUDED.design_styles,
          project_types = EXCLUDED.project_types,
          timeline = EXCLUDED.timeline
      `;
      break;
    case 4:
      // Process payment setup
      if (data.addWelcomeCredit) {
        await tx.exec`
          UPDATE wallets SET balance = balance + 1000 WHERE user_id = ${userId}
        `;
        await tx.exec`
          INSERT INTO transactions (wallet_id, type, amount, description, status)
          SELECT w.id, 'credit', 1000, 'Welcome bonus', 'completed'
          FROM wallets w WHERE w.user_id = ${userId}
        `;
      }
      break;
  }
}

async function processDesignerStepCompletion(tx: any, userId: number, step: number, data: Record<string, any>) {
  switch (step) {
    case 2:
      // Create designer profile
      await tx.exec`
        INSERT INTO designer_profiles (
          user_id, experience_years, specializations, qualifications, hourly_rate
        ) VALUES (
          ${userId}, ${data.experience}, ${data.specializations}, 
          ${data.qualifications}, ${data.hourlyRate}
        ) ON CONFLICT (user_id) DO UPDATE SET
          experience_years = EXCLUDED.experience_years,
          specializations = EXCLUDED.specializations,
          qualifications = EXCLUDED.qualifications,
          hourly_rate = EXCLUDED.hourly_rate
      `;
      break;
    case 5:
      // Update service areas
      await tx.exec`
        UPDATE designer_profiles 
        SET service_areas = ${data.serviceAreas}, availability = ${data.availability}
        WHERE user_id = ${userId}
      `;
      break;
    case 7:
      // Add bank details
      await tx.exec`
        UPDATE designer_profiles 
        SET bank_account_number = ${data.accountNumber}, 
            bank_ifsc_code = ${data.ifscCode},
            bank_account_holder = ${data.accountHolder}
        WHERE user_id = ${userId}
      `;
      break;
  }
}

async function processVendorStepCompletion(tx: any, userId: number, step: number, data: Record<string, any>) {
  switch (step) {
    case 1:
      // Create vendor profile
      await tx.exec`
        INSERT INTO vendors (
          user_id, company_name, business_type, address, city, state, pincode
        ) VALUES (
          ${userId}, ${data.companyName}, ${data.businessType}, 
          ${data.address}, ${data.city}, ${data.state}, ${data.pincode}
        ) ON CONFLICT (user_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          business_type = EXCLUDED.business_type,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          pincode = EXCLUDED.pincode
      `;
      break;
    case 2:
      // Add business details
      await tx.exec`
        UPDATE vendors 
        SET gst_number = ${data.gstNumber}, pan_number = ${data.panNumber}
        WHERE user_id = ${userId}
      `;
      break;
  }
}

async function processPMStepCompletion(tx: any, userId: number, step: number, data: Record<string, any>) {
  switch (step) {
    case 2:
      // Create or update PM profile
      await tx.exec`
        INSERT INTO project_manager_profiles (
          user_id, experience_years, specializations, max_projects
        ) VALUES (
          ${userId}, ${data.experience}, ${data.skills}, ${data.maxProjects || 10}
        ) ON CONFLICT (user_id) DO UPDATE SET
          experience_years = EXCLUDED.experience_years,
          specializations = EXCLUDED.specializations,
          max_projects = EXCLUDED.max_projects
      `;
      break;
  }
}

async function handleReferralReward(tx: any, referrerId: number, newUserId: number) {
  // Give referral bonus to referrer
  await tx.exec`
    UPDATE wallets SET balance = balance + 500 WHERE user_id = ${referrerId}
  `;

  await tx.exec`
    INSERT INTO transactions (wallet_id, type, amount, description, reference_type, reference_id, status)
    SELECT w.id, 'credit', 500, 'Referral bonus', 'referral', ${newUserId}, 'completed'
    FROM wallets w WHERE w.user_id = ${referrerId}
  `;

  // Give signup bonus to new user
  await tx.exec`
    UPDATE wallets SET balance = balance + 200 WHERE user_id = ${newUserId}
  `;

  await tx.exec`
    INSERT INTO transactions (wallet_id, type, amount, description, reference_type, reference_id, status)
    SELECT w.id, 'credit', 200, 'Signup bonus (referred)', 'signup_bonus', ${referrerId}, 'completed'
    FROM wallets w WHERE w.user_id = ${newUserId}
  `;
}

async function grantOnboardingBonus(userId: number) {
  await db.exec`
    UPDATE wallets SET balance = balance + 300 WHERE user_id = ${userId}
  `;

  await db.exec`
    INSERT INTO transactions (wallet_id, type, amount, description, reference_type, status)
    SELECT w.id, 'credit', 300, 'Onboarding completion bonus', 'onboarding_bonus', 'completed'
    FROM wallets w WHERE w.user_id = ${userId}
  `;
}

async function sendVerificationEmail(email: string, token: string) {
  // In production, integrate with email service
  logger.info('Auth', 'verification_email_sent', { email, token });
}