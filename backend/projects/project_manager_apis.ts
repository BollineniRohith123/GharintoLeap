import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface CreateProjectManagerRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  state?: string;
  specializations: string[];
  maxProjects?: number;
  experienceYears: number;
  certifications?: string[];
  salary?: number;
  joiningDate: string;
}

interface UpdateProjectManagerRequest {
  managerId: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  state?: string;
  specializations?: string[];
  maxProjects?: number;
  experienceYears?: number;
  certifications?: string[];
  salary?: number;
  isActive?: boolean;
  adminNotes?: string;
}

interface ProjectManagerStats {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  state?: string;
  isActive: boolean;
  createdAt: string;
  stats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    onTimeCompletionRate: number;
    averageProjectValue: number;
    teamSize: number;
    totalRevenue: number;
  };
  profile: {
    specializations: string[];
    maxProjects: number;
    experienceYears: number;
    certifications: string[];
    salary?: number;
    joiningDate: string;
  };
  currentProjects: Array<{
    id: number;
    title: string;
    status: string;
    budget: number;
    startDate: string;
    expectedEndDate?: string;
    progressPercentage: number;
  }>;
}

interface TeamMemberRequest {
  projectId: number;
  userId: number;
  role: string;
  responsibilities?: string;
  startDate?: string;
  endDate?: string;
}

// Admin: Create new project manager
export const createProjectManager = api<CreateProjectManagerRequest, { success: boolean; managerId: number }>(
  { auth: true, expose: true, method: "POST", path: "/projects/managers" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.create') || !auth.permissions.includes('projects.manage')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    // Validate input
    if (!req.email || !req.firstName || !req.lastName || !req.phone || !req.city) {
      throw APIError.invalidArgument("Email, name, phone, and city are required");
    }

    if (!req.specializations?.length) {
      throw APIError.invalidArgument("At least one specialization is required");
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

        // Create user account
        const user = await tx.queryRow`
          INSERT INTO users (
            email, password_hash, first_name, last_name, phone, city, state, country, is_active
          ) VALUES (
            ${req.email.toLowerCase()}, 
            '$2a$12$defaulthash', -- Will be reset on first login
            ${req.firstName}, ${req.lastName}, ${req.phone}, ${req.city}, ${req.state}, 'India', true
          ) RETURNING *
        `;

        // Get project manager role
        const pmRole = await tx.queryRow`
          SELECT id FROM roles WHERE name = 'project_manager'
        `;

        if (!pmRole) {
          throw APIError.internal("Project manager role not found");
        }

        // Assign project manager role
        await tx.exec`
          INSERT INTO user_roles (user_id, role_id, assigned_by)
          VALUES (${user.id}, ${pmRole.id}, ${auth.userID})
        `;

        // Create project manager profile
        await tx.exec`
          INSERT INTO project_manager_profiles (
            user_id, specializations, max_projects, experience_years, 
            certifications, salary, joining_date
          ) VALUES (
            ${user.id}, ${req.specializations}, ${req.maxProjects || 10}, ${req.experienceYears},
            ${req.certifications || []}, ${req.salary}, ${req.joiningDate}
          )
        `;

        // Create wallet
        await tx.exec`
          INSERT INTO wallets (user_id) VALUES (${user.id})
        `;

        // Create user preferences
        await tx.exec`
          INSERT INTO user_preferences (user_id) VALUES (${user.id})
        `;

        // Log creation
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, new_values
          ) VALUES (
            ${auth.userID}, 'project_manager_created', 'user', ${user.id},
            ${JSON.stringify(req)}
          )
        `;

        return { managerId: user.id };
      });

      // Send welcome notification
      await db.exec`
        INSERT INTO notifications (
          user_id, title, content, type, reference_type, reference_id
        ) VALUES (
          ${result.managerId},
          'Welcome to Gharinto Team',
          'Your project manager account has been created. Please login and set your password.',
          'welcome',
          'user',
          ${result.managerId}
        )
      `;

      return {
        success: true,
        managerId: result.managerId
      };

    } catch (error) {
      console.error('Project manager creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create project manager");
    }
  }
);

// Admin: Get all project managers with stats
export const getProjectManagers = api(
  { auth: true, expose: true, method: "GET", path: "/projects/managers" },
  async (): Promise<{ managers: ProjectManagerStats[] }> => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('projects.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    const managers = await db.queryAll`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.state, 
        u.is_active, u.created_at,
        pmp.specializations, pmp.max_projects, pmp.experience_years, 
        pmp.certifications, pmp.salary, pmp.joining_date,
        COUNT(p.id) as total_projects,
        COUNT(CASE WHEN p.status IN ('planning', 'in_progress', 'review') THEN 1 END) as active_projects,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_projects,
        AVG(p.budget) as avg_project_value,
        SUM(p.budget) as total_revenue,
        COUNT(CASE WHEN p.status = 'completed' AND p.end_date <= p.estimated_end_date THEN 1 END) as on_time_completions
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN project_manager_profiles pmp ON u.id = pmp.user_id
      LEFT JOIN projects p ON u.id = p.project_manager_id
      WHERE r.name = 'project_manager'
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.state, 
               u.is_active, u.created_at, pmp.specializations, pmp.max_projects, 
               pmp.experience_years, pmp.certifications, pmp.salary, pmp.joining_date
      ORDER BY u.first_name, u.last_name
    `;

    const managersWithDetails = await Promise.all(
      managers.map(async (manager) => {
        // Get current projects
        const currentProjects = await db.queryAll`
          SELECT id, title, status, budget, start_date, estimated_end_date, progress_percentage
          FROM projects
          WHERE project_manager_id = ${manager.id}
          AND status IN ('planning', 'in_progress', 'review')
          ORDER BY created_at DESC
        `;

        // Get team size (unique team members across all projects)
        const teamSizeResult = await db.queryRow`
          SELECT COUNT(DISTINCT team_member_id) as team_size
          FROM project_team_members ptm
          JOIN projects p ON ptm.project_id = p.id
          WHERE p.project_manager_id = ${manager.id}
          AND ptm.is_active = true
        `;

        const onTimeRate = manager.completed_projects > 0 
          ? (manager.on_time_completions / manager.completed_projects) * 100 
          : 0;

        return {
          id: manager.id,
          email: manager.email,
          firstName: manager.first_name,
          lastName: manager.last_name,
          phone: manager.phone,
          city: manager.city,
          state: manager.state,
          isActive: manager.is_active,
          createdAt: manager.created_at,
          stats: {
            totalProjects: parseInt(manager.total_projects || '0'),
            activeProjects: parseInt(manager.active_projects || '0'),
            completedProjects: parseInt(manager.completed_projects || '0'),
            onTimeCompletionRate: Math.round(onTimeRate * 100) / 100,
            averageProjectValue: parseInt(manager.avg_project_value || '0'),
            teamSize: parseInt(teamSizeResult?.team_size || '0'),
            totalRevenue: parseInt(manager.total_revenue || '0')
          },
          profile: {
            specializations: manager.specializations || [],
            maxProjects: manager.max_projects || 10,
            experienceYears: manager.experience_years || 0,
            certifications: manager.certifications || [],
            salary: manager.salary,
            joiningDate: manager.joining_date
          },
          currentProjects: currentProjects.map(p => ({
            id: p.id,
            title: p.title,
            status: p.status,
            budget: p.budget,
            startDate: p.start_date,
            expectedEndDate: p.estimated_end_date,
            progressPercentage: p.progress_percentage
          }))
        };
      })
    );

    return { managers: managersWithDetails };
  }
);

// Admin: Update project manager
export const updateProjectManager = api<UpdateProjectManagerRequest, { success: boolean }>(
  { auth: true, expose: true, method: "PUT", path: "/projects/managers/update" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.edit')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    try {
      await db.tx(async (tx) => {
        // Get current data for audit
        const currentUser = await tx.queryRow`
          SELECT u.*, pmp.*
          FROM users u
          LEFT JOIN project_manager_profiles pmp ON u.id = pmp.user_id
          WHERE u.id = ${req.managerId}
        `;

        if (!currentUser) {
          throw APIError.notFound("Project manager not found");
        }

        // Update user table
        const userUpdateFields: string[] = [];
        const userUpdateValues: any[] = [];
        let paramIndex = 1;

        if (req.firstName !== undefined) {
          userUpdateFields.push(`first_name = $${paramIndex++}`);
          userUpdateValues.push(req.firstName);
        }
        if (req.lastName !== undefined) {
          userUpdateFields.push(`last_name = $${paramIndex++}`);
          userUpdateValues.push(req.lastName);
        }
        if (req.phone !== undefined) {
          userUpdateFields.push(`phone = $${paramIndex++}`);
          userUpdateValues.push(req.phone);
        }
        if (req.city !== undefined) {
          userUpdateFields.push(`city = $${paramIndex++}`);
          userUpdateValues.push(req.city);
        }
        if (req.state !== undefined) {
          userUpdateFields.push(`state = $${paramIndex++}`);
          userUpdateValues.push(req.state);
        }
        if (req.isActive !== undefined) {
          userUpdateFields.push(`is_active = $${paramIndex++}`);
          userUpdateValues.push(req.isActive);
        }

        if (userUpdateFields.length > 0) {
          userUpdateFields.push(`updated_at = NOW()`);
          await tx.rawQuery(`
            UPDATE users 
            SET ${userUpdateFields.join(', ')}
            WHERE id = $${paramIndex}
          `, ...userUpdateValues, req.managerId);
        }

        // Update profile table
        const profileUpdateFields: string[] = [];
        const profileUpdateValues: any[] = [];
        paramIndex = 1;

        if (req.specializations !== undefined) {
          profileUpdateFields.push(`specializations = $${paramIndex++}`);
          profileUpdateValues.push(req.specializations);
        }
        if (req.maxProjects !== undefined) {
          profileUpdateFields.push(`max_projects = $${paramIndex++}`);
          profileUpdateValues.push(req.maxProjects);
        }
        if (req.experienceYears !== undefined) {
          profileUpdateFields.push(`experience_years = $${paramIndex++}`);
          profileUpdateValues.push(req.experienceYears);
        }
        if (req.certifications !== undefined) {
          profileUpdateFields.push(`certifications = $${paramIndex++}`);
          profileUpdateValues.push(req.certifications);
        }
        if (req.salary !== undefined) {
          profileUpdateFields.push(`salary = $${paramIndex++}`);
          profileUpdateValues.push(req.salary);
        }

        if (profileUpdateFields.length > 0) {
          // Check if profile exists
          const existingProfile = await tx.queryRow`
            SELECT id FROM project_manager_profiles WHERE user_id = ${req.managerId}
          `;

          if (existingProfile) {
            await tx.rawQuery(`
              UPDATE project_manager_profiles 
              SET ${profileUpdateFields.join(', ')}
              WHERE user_id = $${paramIndex}
            `, ...profileUpdateValues, req.managerId);
          } else {
            // Create profile if it doesn't exist
            await tx.exec`
              INSERT INTO project_manager_profiles (
                user_id, specializations, max_projects, experience_years, certifications, salary
              ) VALUES (
                ${req.managerId}, ${req.specializations || []}, ${req.maxProjects || 10}, 
                ${req.experienceYears || 0}, ${req.certifications || []}, ${req.salary}
              )
            `;
          }
        }

        // Log audit trail
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values
          ) VALUES (
            ${auth.userID}, 'project_manager_updated', 'user', ${req.managerId},
            ${JSON.stringify(currentUser)},
            ${JSON.stringify(req)}
          )
        `;
      });

      return { success: true };

    } catch (error) {
      console.error('Project manager update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update project manager");
    }
  }
);

// Project Manager: Add team member to project
export const addTeamMember = api<TeamMemberRequest, { success: boolean; teamMemberId: number }>(
  { auth: true, expose: true, method: "POST", path: "/projects/:projectId/team" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Verify project manager permissions
    const project = await db.queryRow`
      SELECT id, project_manager_id, title 
      FROM projects 
      WHERE id = ${req.projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    // Check if user is the project manager or has admin permissions
    if (project.project_manager_id !== parseInt(auth.userID) && !auth.permissions.includes('projects.manage')) {
      throw APIError.permissionDenied("Only the project manager can add team members");
    }

    // Verify team member exists
    const teamMember = await db.queryRow`
      SELECT id, first_name, last_name FROM users WHERE id = ${req.userId} AND is_active = true
    `;

    if (!teamMember) {
      throw APIError.notFound("Team member not found");
    }

    try {
      const result = await db.tx(async (tx) => {
        // Check if already a team member
        const existing = await tx.queryRow`
          SELECT id FROM project_team_members 
          WHERE project_id = ${req.projectId} AND team_member_id = ${req.userId} AND is_active = true
        `;

        if (existing) {
          throw APIError.alreadyExists("User is already a team member");
        }

        // Add team member
        const teamMemberRecord = await tx.queryRow`
          INSERT INTO project_team_members (
            project_id, team_member_id, role, responsibilities, start_date, end_date, added_by
          ) VALUES (
            ${req.projectId}, ${req.userId}, ${req.role}, ${req.responsibilities},
            ${req.startDate || new Date().toISOString().split('T')[0]}, ${req.endDate}, ${auth.userID}
          ) RETURNING *
        `;

        // Create notification for team member
        await tx.exec`
          INSERT INTO notifications (
            user_id, title, content, type, reference_type, reference_id
          ) VALUES (
            ${req.userId},
            'Added to Project Team',
            'You have been added as ${req.role} to project "${project.title}"',
            'team_assignment',
            'project',
            ${req.projectId}
          )
        `;

        return { teamMemberId: teamMemberRecord.id };
      });

      return {
        success: true,
        teamMemberId: result.teamMemberId
      };

    } catch (error) {
      console.error('Add team member error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to add team member");
    }
  }
);

// Project Manager: Get team information for project
export const getProjectTeam = api(
  { auth: true, expose: true, method: "GET", path: "/projects/:projectId/team" },
  async ({ projectId }: { projectId: number }) => {
    const auth = getAuthData()!;
    
    // Verify access to project
    const project = await db.queryRow`
      SELECT id, project_manager_id, client_id, designer_id, title 
      FROM projects 
      WHERE id = ${projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    // Check permissions
    const hasAccess = project.project_manager_id === parseInt(auth.userID) ||
                     project.client_id === parseInt(auth.userID) ||
                     project.designer_id === parseInt(auth.userID) ||
                     auth.permissions.includes('projects.view');

    if (!hasAccess) {
      throw APIError.permissionDenied("Access denied to project team information");
    }

    // Get team members
    const teamMembers = await db.queryAll`
      SELECT 
        ptm.*,
        u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
        added_by_user.first_name as added_by_name
      FROM project_team_members ptm
      JOIN users u ON ptm.team_member_id = u.id
      LEFT JOIN users added_by_user ON ptm.added_by = added_by_user.id
      WHERE ptm.project_id = ${projectId} AND ptm.is_active = true
      ORDER BY ptm.created_at DESC
    `;

    // Get core team (PM, Designer, Client)
    const coreTeam = await db.queryRow`
      SELECT 
        pm.first_name as pm_first_name, pm.last_name as pm_last_name, pm.email as pm_email,
        d.first_name as designer_first_name, d.last_name as designer_last_name, d.email as designer_email,
        c.first_name as client_first_name, c.last_name as client_last_name, c.email as client_email
      FROM projects p
      LEFT JOIN users pm ON p.project_manager_id = pm.id
      LEFT JOIN users d ON p.designer_id = d.id
      LEFT JOIN users c ON p.client_id = c.id
      WHERE p.id = ${projectId}
    `;

    return {
      projectId,
      projectTitle: project.title,
      coreTeam: {
        projectManager: coreTeam ? {
          id: project.project_manager_id,
          name: `${coreTeam.pm_first_name} ${coreTeam.pm_last_name}`,
          email: coreTeam.pm_email,
          role: 'Project Manager'
        } : null,
        designer: coreTeam && project.designer_id ? {
          id: project.designer_id,
          name: `${coreTeam.designer_first_name} ${coreTeam.designer_last_name}`,
          email: coreTeam.designer_email,
          role: 'Interior Designer'
        } : null,
        client: coreTeam ? {
          id: project.client_id,
          name: `${coreTeam.client_first_name} ${coreTeam.client_last_name}`,
          email: coreTeam.client_email,
          role: 'Client'
        } : null
      },
      teamMembers: teamMembers.map(member => ({
        id: member.id,
        userId: member.team_member_id,
        name: `${member.first_name} ${member.last_name}`,
        email: member.email,
        phone: member.phone,
        avatarUrl: member.avatar_url,
        role: member.role,
        responsibilities: member.responsibilities,
        startDate: member.start_date,
        endDate: member.end_date,
        addedBy: member.added_by_name,
        addedAt: member.created_at
      }))
    };
  }
);

// Project Manager: Remove team member
export const removeTeamMember = api(
  { auth: true, expose: true, method: "DELETE", path: "/projects/:projectId/team/:teamMemberId" },
  async ({ projectId, teamMemberId }: { projectId: number; teamMemberId: number }) => {
    const auth = getAuthData()!;
    
    // Verify project manager permissions
    const project = await db.queryRow`
      SELECT id, project_manager_id, title 
      FROM projects 
      WHERE id = ${projectId}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    if (project.project_manager_id !== parseInt(auth.userID) && !auth.permissions.includes('projects.manage')) {
      throw APIError.permissionDenied("Only the project manager can remove team members");
    }

    try {
      const teamMember = await db.queryRow`
        UPDATE project_team_members 
        SET is_active = false, removed_at = NOW(), removed_by = ${auth.userID}
        WHERE id = ${teamMemberId} AND project_id = ${projectId}
        RETURNING team_member_id
      `;

      if (!teamMember) {
        throw APIError.notFound("Team member not found");
      }

      // Create notification
      await db.exec`
        INSERT INTO notifications (
          user_id, title, content, type, reference_type, reference_id
        ) VALUES (
          ${teamMember.team_member_id},
          'Removed from Project Team',
          'You have been removed from project "${project.title}"',
          'team_removal',
          'project',
          ${projectId}
        )
      `;

      return { success: true };

    } catch (error) {
      console.error('Remove team member error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to remove team member");
    }
  }
);