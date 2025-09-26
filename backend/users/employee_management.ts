import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";
import bcrypt from "bcryptjs";

interface CreateEmployeeRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  designation: string;
  reportingManagerId?: number;
  joiningDate: string;
  salary?: number;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  workLocation: string;
  skills?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  panNumber?: string;
  aadharNumber?: string;
  roles: string[];
}

interface UpdateEmployeeRequest {
  employeeId: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  designation?: string;
  reportingManagerId?: number;
  salary?: number;
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'intern';
  workLocation?: string;
  skills?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  panNumber?: string;
  aadharNumber?: string;
  isActive?: boolean;
}

interface EmployeeAttendanceRequest {
  employeeId?: number; // Optional for self-attendance
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday';
  notes?: string;
}

interface LeaveRequest {
  leaveType: 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity' | 'compensatory';
  startDate: string;
  endDate: string;
  reason: string;
}

interface EmployeeDetails {
  id: number;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  designation: string;
  reportingManager?: {
    id: number;
    name: string;
    email: string;
  };
  joiningDate: string;
  salary?: number;
  employmentType: string;
  workLocation: string;
  skills: string[];
  emergencyContact?: {
    name: string;
    phone: string;
  };
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
  };
  documents?: {
    panNumber: string;
    aadharNumber: string;
  };
  isActive: boolean;
  roles: string[];
  stats: {
    attendanceRate: number;
    leaveBalance: number;
    projectsAssigned: number;
    performanceScore: number;
  };
  recentAttendance: Array<{
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
    totalHours?: number;
  }>;
}

// HR/Admin: Create new employee
export const createEmployee = api<CreateEmployeeRequest, { success: boolean; employeeId: number; tempPassword: string }>(
  { auth: true, expose: true, method: "POST", path: "/users/employees" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check HR permissions
    if (!auth.permissions.includes('employees.create')) {
      throw APIError.permissionDenied("Insufficient permissions to create employees");
    }

    // Validate input
    if (!req.email || !req.firstName || !req.lastName || !req.department || !req.designation) {
      throw APIError.invalidArgument("Email, name, department, and designation are required");
    }

    if (!req.roles.length) {
      throw APIError.invalidArgument("At least one role must be assigned");
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

        // Generate employee ID
        const employeeCount = await tx.queryRow`
          SELECT COUNT(*) as count FROM employee_profiles
        `;
        const employeeId = `EMP${String(parseInt(employeeCount?.count || '0') + 1).padStart(4, '0')}`;

        // Generate temporary password
        const tempPassword = `Temp${Math.random().toString(36).substr(2, 8)}!`;
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        // Create user account
        const user = await tx.queryRow`
          INSERT INTO users (
            email, password_hash, first_name, last_name, phone, is_active
          ) VALUES (
            ${req.email.toLowerCase()}, ${passwordHash}, ${req.firstName}, 
            ${req.lastName}, ${req.phone}, true
          ) RETURNING *
        `;

        // Assign roles
        for (const roleName of req.roles) {
          const role = await tx.queryRow`
            SELECT id FROM roles WHERE name = ${roleName}
          `;

          if (role) {
            await tx.exec`
              INSERT INTO user_roles (user_id, role_id, assigned_by)
              VALUES (${user.id}, ${role.id}, ${auth.userID})
            `;
          }
        }

        // Create employee profile
        await tx.exec`
          INSERT INTO employee_profiles (
            user_id, employee_id, department, designation, reporting_manager_id,
            joining_date, salary, employment_type, work_location, skills,
            emergency_contact_name, emergency_contact_phone, bank_account_number,
            bank_ifsc_code, pan_number, aadhar_number
          ) VALUES (
            ${user.id}, ${employeeId}, ${req.department}, ${req.designation}, ${req.reportingManagerId},
            ${req.joiningDate}, ${req.salary}, ${req.employmentType}, ${req.workLocation}, ${req.skills || []},
            ${req.emergencyContactName}, ${req.emergencyContactPhone}, ${req.bankAccountNumber},
            ${req.bankIfscCode}, ${req.panNumber}, ${req.aadharNumber}
          )
        `;

        // Create wallet and preferences
        await tx.exec`
          INSERT INTO wallets (user_id) VALUES (${user.id})
        `;

        await tx.exec`
          INSERT INTO user_preferences (user_id) VALUES (${user.id})
        `;

        // Log the creation
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, new_values
          ) VALUES (
            ${auth.userID}, 'employee_created', 'user', ${user.id},
            ${JSON.stringify({ ...req, tempPassword: '[REDACTED]' })}
          )
        `;

        return { employeeId: user.id, tempPassword, empId: employeeId };
      });

      // Send welcome notification
      await db.exec`
        INSERT INTO notifications (
          user_id, title, content, type, reference_type, reference_id
        ) VALUES (
          ${result.employeeId},
          'Welcome to Gharinto Team',
          'Your employee account has been created. Employee ID: ${result.empId}. Please login and change your password.',
          'welcome',
          'user',
          ${result.employeeId}
        )
      `;

      return {
        success: true,
        employeeId: result.employeeId,
        tempPassword: result.tempPassword
      };

    } catch (error) {
      console.error('Employee creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create employee");
    }
  }
);

// HR/Admin: Get all employees with details
export const getEmployees = api(
  { auth: true, expose: true, method: "GET", path: "/users/employees" },
  async (params: {
    page?: Query<number>;
    limit?: Query<number>;
    department?: Query<string>;
    designation?: Query<string>;
    status?: Query<'active' | 'inactive' | 'all'>;
    search?: Query<string>;
  }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('employees.view')) {
      throw APIError.permissionDenied("Insufficient permissions to view employees");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE ep.id IS NOT NULL";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.department) {
      whereClause += ` AND ep.department = $${paramIndex++}`;
      queryParams.push(params.department);
    }

    if (params.designation) {
      whereClause += ` AND ep.designation = $${paramIndex++}`;
      queryParams.push(params.designation);
    }

    if (params.status && params.status !== 'all') {
      const isActive = params.status === 'active';
      whereClause += ` AND u.is_active = $${paramIndex++}`;
      queryParams.push(isActive);
    }

    if (params.search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR ep.employee_id ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    const employees = await db.rawQueryAll(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
        ep.*,
        rm.first_name as rm_first_name, rm.last_name as rm_last_name, rm.email as rm_email,
        array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
      FROM users u
      JOIN employee_profiles ep ON u.id = ep.user_id
      LEFT JOIN users rm ON ep.reporting_manager_id = rm.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
               ep.id, ep.user_id, ep.employee_id, ep.department, ep.designation, ep.reporting_manager_id,
               ep.joining_date, ep.salary, ep.employment_type, ep.work_location, ep.skills,
               ep.emergency_contact_name, ep.emergency_contact_phone, ep.bank_account_number,
               ep.bank_ifsc_code, ep.pan_number, ep.aadhar_number, ep.is_active, ep.termination_date,
               ep.termination_reason, ep.created_at, ep.updated_at,
               rm.first_name, rm.last_name, rm.email
      ORDER BY ep.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, limit, offset);

    const totalResult = await db.rawQueryRow(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN employee_profiles ep ON u.id = ep.user_id
      ${whereClause}
    `, ...queryParams);

    // Get additional stats for each employee
    const employeeDetails = await Promise.all(
      employees.map(async (emp) => {
        // Get attendance rate (last 30 days)
        const attendanceStats = await db.queryRow`
          SELECT 
            COUNT(*) as total_days,
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days
          FROM employee_attendance
          WHERE user_id = ${emp.id}
          AND date >= CURRENT_DATE - INTERVAL '30 days'
        `;

        const attendanceRate = attendanceStats?.total_days > 0 
          ? (attendanceStats.present_days / attendanceStats.total_days) * 100 
          : 0;

        // Get project assignments
        const projectCount = await db.queryRow`
          SELECT COUNT(*) as count
          FROM project_team_members ptm
          JOIN projects p ON ptm.project_id = p.id
          WHERE ptm.team_member_id = ${emp.id}
          AND ptm.is_active = true
          AND p.status IN ('planning', 'in_progress', 'review')
        `;

        return {
          id: emp.id,
          employeeId: emp.employee_id,
          email: emp.email,
          firstName: emp.first_name,
          lastName: emp.last_name,
          phone: emp.phone,
          department: emp.department,
          designation: emp.designation,
          reportingManager: emp.reporting_manager_id ? {
            id: emp.reporting_manager_id,
            name: `${emp.rm_first_name} ${emp.rm_last_name}`,
            email: emp.rm_email
          } : undefined,
          joiningDate: emp.joining_date,
          salary: emp.salary,
          employmentType: emp.employment_type,
          workLocation: emp.work_location,
          skills: emp.skills || [],
          emergencyContact: emp.emergency_contact_name ? {
            name: emp.emergency_contact_name,
            phone: emp.emergency_contact_phone
          } : undefined,
          isActive: emp.is_active,
          roles: emp.roles || [],
          stats: {
            attendanceRate: Math.round(attendanceRate * 100) / 100,
            leaveBalance: 21, // Would calculate based on policy
            projectsAssigned: parseInt(projectCount?.count || '0'),
            performanceScore: 85 // Would calculate based on actual metrics
          }
        };
      })
    );

    return {
      employees: employeeDetails,
      total: totalResult?.total || 0,
      page,
      limit
    };
  }
);

// HR/Admin: Get employee details
export const getEmployeeDetails = api<{ employeeId: number }, EmployeeDetails>(
  { auth: true, expose: true, method: "GET", path: "/users/employees/:employeeId" },
  async ({ employeeId }) => {
    const auth = getAuthData()!;
    
    // Check permissions (can view own details or have employee view permission)
    if (parseInt(auth.userID) !== employeeId && !auth.permissions.includes('employees.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    const employee = await db.queryRow`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active,
        ep.*,
        rm.first_name as rm_first_name, rm.last_name as rm_last_name, rm.email as rm_email,
        array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
      FROM users u
      JOIN employee_profiles ep ON u.id = ep.user_id
      LEFT JOIN users rm ON ep.reporting_manager_id = rm.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ${employeeId}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active,
               ep.id, ep.user_id, ep.employee_id, ep.department, ep.designation, ep.reporting_manager_id,
               ep.joining_date, ep.salary, ep.employment_type, ep.work_location, ep.skills,
               ep.emergency_contact_name, ep.emergency_contact_phone, ep.bank_account_number,
               ep.bank_ifsc_code, ep.pan_number, ep.aadhar_number, ep.is_active, ep.termination_date,
               ep.termination_reason, ep.created_at, ep.updated_at,
               rm.first_name, rm.last_name, rm.email
    `;

    if (!employee) {
      throw APIError.notFound("Employee not found");
    }

    // Get recent attendance (last 10 days)
    const recentAttendance = await db.queryAll`
      SELECT date, status, check_in_time, check_out_time, total_hours
      FROM employee_attendance
      WHERE user_id = ${employeeId}
      ORDER BY date DESC
      LIMIT 10
    `;

    // Get attendance statistics
    const attendanceStats = await db.queryRow`
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days
      FROM employee_attendance
      WHERE user_id = ${employeeId}
      AND date >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const attendanceRate = attendanceStats?.total_days > 0 
      ? (attendanceStats.present_days / attendanceStats.total_days) * 100 
      : 0;

    // Get project assignments
    const projectCount = await db.queryRow`
      SELECT COUNT(*) as count
      FROM project_team_members ptm
      JOIN projects p ON ptm.project_id = p.id
      WHERE ptm.team_member_id = ${employeeId}
      AND ptm.is_active = true
      AND p.status IN ('planning', 'in_progress', 'review')
    `;

    return {
      id: employee.id,
      employeeId: employee.employee_id,
      email: employee.email,
      firstName: employee.first_name,
      lastName: employee.last_name,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      reportingManager: employee.reporting_manager_id ? {
        id: employee.reporting_manager_id,
        name: `${employee.rm_first_name} ${employee.rm_last_name}`,
        email: employee.rm_email
      } : undefined,
      joiningDate: employee.joining_date,
      salary: employee.salary,
      employmentType: employee.employment_type,
      workLocation: employee.work_location,
      skills: employee.skills || [],
      emergencyContact: employee.emergency_contact_name ? {
        name: employee.emergency_contact_name,
        phone: employee.emergency_contact_phone
      } : undefined,
      bankDetails: employee.bank_account_number ? {
        accountNumber: employee.bank_account_number,
        ifscCode: employee.bank_ifsc_code
      } : undefined,
      documents: {
        panNumber: employee.pan_number,
        aadharNumber: employee.aadhar_number
      },
      isActive: employee.is_active,
      roles: employee.roles || [],
      stats: {
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        leaveBalance: 21,
        projectsAssigned: parseInt(projectCount?.count || '0'),
        performanceScore: 85
      },
      recentAttendance: recentAttendance.map(att => ({
        date: att.date,
        status: att.status,
        checkIn: att.check_in_time,
        checkOut: att.check_out_time,
        totalHours: att.total_hours
      }))
    };
  }
);

// Employee/HR: Mark attendance
export const markAttendance = api<EmployeeAttendanceRequest, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/users/employees/attendance" },
  async (req) => {
    const auth = getAuthData()!;
    
    const employeeId = req.employeeId || parseInt(auth.userID);
    
    // Check permissions (can mark own attendance or have HR permissions)
    if (employeeId !== parseInt(auth.userID) && !auth.permissions.includes('employees.manage')) {
      throw APIError.permissionDenied("Can only mark own attendance or need HR permissions");
    }

    try {
      // Calculate total hours if both check-in and check-out are provided
      let totalHours = null;
      if (req.checkInTime && req.checkOutTime) {
        const checkIn = new Date(`${req.date}T${req.checkInTime}`);
        const checkOut = new Date(`${req.date}T${req.checkOutTime}`);
        totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      }

      await db.exec`
        INSERT INTO employee_attendance (
          user_id, date, check_in_time, check_out_time, total_hours, status, notes
        ) VALUES (
          ${employeeId}, ${req.date}, 
          ${req.checkInTime ? `${req.date}T${req.checkInTime}` : null},
          ${req.checkOutTime ? `${req.date}T${req.checkOutTime}` : null},
          ${totalHours}, ${req.status}, ${req.notes}
        )
        ON CONFLICT (user_id, date) DO UPDATE SET
          check_in_time = EXCLUDED.check_in_time,
          check_out_time = EXCLUDED.check_out_time,
          total_hours = EXCLUDED.total_hours,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes
      `;

      return { success: true };

    } catch (error) {
      console.error('Mark attendance error:', error);
      throw APIError.internal("Failed to mark attendance");
    }
  }
);

// Employee: Apply for leave
export const applyLeave = api<LeaveRequest, { leaveId: number }>(
  { auth: true, expose: true, method: "POST", path: "/users/employees/leave" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate dates
    const startDate = new Date(req.startDate);
    const endDate = new Date(req.endDate);
    
    if (endDate < startDate) {
      throw APIError.invalidArgument("End date cannot be before start date");
    }

    if (startDate < new Date()) {
      throw APIError.invalidArgument("Cannot apply for leave in the past");
    }

    // Calculate days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    try {
      const leave = await db.queryRow`
        INSERT INTO employee_leaves (
          user_id, leave_type, start_date, end_date, days_count, reason
        ) VALUES (
          ${auth.userID}, ${req.leaveType}, ${req.startDate}, ${req.endDate}, ${daysDiff}, ${req.reason}
        ) RETURNING *
      `;

      // Notify reporting manager
      const employee = await db.queryRow`
        SELECT reporting_manager_id FROM employee_profiles WHERE user_id = ${auth.userID}
      `;

      if (employee?.reporting_manager_id) {
        await db.exec`
          INSERT INTO notifications (
            user_id, title, content, type, reference_type, reference_id
          ) VALUES (
            ${employee.reporting_manager_id},
            'New Leave Request',
            'A team member has applied for ${req.leaveType} leave from ${req.startDate} to ${req.endDate}',
            'leave_request',
            'leave',
            ${leave.id}
          )
        `;
      }

      return { leaveId: leave.id };

    } catch (error) {
      console.error('Apply leave error:', error);
      throw APIError.internal("Failed to apply for leave");
    }
  }
);

// Manager/HR: Approve/Reject leave
export const updateLeaveStatus = api(
  { auth: true, expose: true, method: "PUT", path: "/users/employees/leave/:leaveId" },
  async (req: {
    leaveId: number;
    status: 'approved' | 'rejected';
    rejectionReason?: string
  }) => {
    const auth = getAuthData()!;

    // Get leave details
    const leave = await db.queryRow`
      SELECT el.*, ep.reporting_manager_id
      FROM employee_leaves el
      JOIN employee_profiles ep ON el.user_id = ep.user_id
      WHERE el.id = ${req.leaveId}
    `;

    if (!leave) {
      throw APIError.notFound("Leave request not found");
    }

    // Check permissions (reporting manager or HR)
    const canApprove = leave.reporting_manager_id === parseInt(auth.userID) ||
                      auth.permissions.includes('employees.manage');

    if (!canApprove) {
      throw APIError.permissionDenied("Insufficient permissions to approve/reject leave");
    }

    try {
      await db.tx(async (tx) => {
        // Update leave status
        await tx.exec`
          UPDATE employee_leaves
          SET status = ${req.status},
              rejection_reason = ${req.rejectionReason},
              approved_by = ${auth.userID},
              approved_at = NOW(),
              updated_at = NOW()
          WHERE id = ${req.leaveId}
        `;

        // Notify employee
        await tx.exec`
          INSERT INTO notifications (
            user_id, title, content, type, reference_type, reference_id
          ) VALUES (
            ${leave.user_id},
            'Leave Request ${req.status === 'approved' ? 'Approved' : 'Rejected'}',
            'Your leave request from ${leave.start_date} to ${leave.end_date} has been ${req.status}${req.rejectionReason ? '. Reason: ' + req.rejectionReason : ''}',
            'leave_${req.status}',
            'leave',
            ${req.leaveId}
          )
        `;

        // Log audit trail
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, new_values
          ) VALUES (
            ${auth.userID}, 'leave_${req.status}', 'leave', ${req.leaveId},
            ${JSON.stringify({ status: req.status, rejectionReason: req.rejectionReason })}
          )
        `;
      });

      return { success: true };

    } catch (error) {
      console.error('Leave status update error:', error);
      throw APIError.internal("Failed to update leave status");
    }
  }
);

// HR/Admin: Update employee details
export const updateEmployee = api<UpdateEmployeeRequest, { success: boolean }>(
  { auth: true, expose: true, method: "PUT", path: "/users/employees/:employeeId" },
  async (req) => {
    const auth = getAuthData()!;

    // Check HR permissions
    if (!auth.permissions.includes('employees.manage')) {
      throw APIError.permissionDenied("Insufficient permissions to update employees");
    }

    // Check if employee exists
    const employee = await db.queryRow`
      SELECT u.id, ep.id as profile_id
      FROM users u
      JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE u.id = ${req.employeeId}
    `;

    if (!employee) {
      throw APIError.notFound("Employee not found");
    }

    try {
      await db.tx(async (tx) => {
        // Update user table
        const userUpdates: string[] = [];
        const userValues: any[] = [];
        let userParamIndex = 1;

        if (req.firstName) {
          userUpdates.push(`first_name = $${userParamIndex++}`);
          userValues.push(req.firstName);
        }
        if (req.lastName) {
          userUpdates.push(`last_name = $${userParamIndex++}`);
          userValues.push(req.lastName);
        }
        if (req.phone) {
          userUpdates.push(`phone = $${userParamIndex++}`);
          userValues.push(req.phone);
        }
        if (req.isActive !== undefined) {
          userUpdates.push(`is_active = $${userParamIndex++}`);
          userValues.push(req.isActive);
        }

        if (userUpdates.length > 0) {
          userUpdates.push(`updated_at = NOW()`);
          await tx.rawQuery(`
            UPDATE users
            SET ${userUpdates.join(', ')}
            WHERE id = $${userParamIndex}
          `, ...userValues, req.employeeId);
        }

        // Update employee profile
        const profileUpdates: string[] = [];
        const profileValues: any[] = [];
        let profileParamIndex = 1;

        if (req.department) {
          profileUpdates.push(`department = $${profileParamIndex++}`);
          profileValues.push(req.department);
        }
        if (req.designation) {
          profileUpdates.push(`designation = $${profileParamIndex++}`);
          profileValues.push(req.designation);
        }
        if (req.reportingManagerId !== undefined) {
          profileUpdates.push(`reporting_manager_id = $${profileParamIndex++}`);
          profileValues.push(req.reportingManagerId);
        }
        if (req.salary !== undefined) {
          profileUpdates.push(`salary = $${profileParamIndex++}`);
          profileValues.push(req.salary);
        }
        if (req.employmentType) {
          profileUpdates.push(`employment_type = $${profileParamIndex++}`);
          profileValues.push(req.employmentType);
        }
        if (req.workLocation) {
          profileUpdates.push(`work_location = $${profileParamIndex++}`);
          profileValues.push(req.workLocation);
        }
        if (req.skills) {
          profileUpdates.push(`skills = $${profileParamIndex++}`);
          profileValues.push(req.skills);
        }
        if (req.emergencyContactName) {
          profileUpdates.push(`emergency_contact_name = $${profileParamIndex++}`);
          profileValues.push(req.emergencyContactName);
        }
        if (req.emergencyContactPhone) {
          profileUpdates.push(`emergency_contact_phone = $${profileParamIndex++}`);
          profileValues.push(req.emergencyContactPhone);
        }
        if (req.bankAccountNumber) {
          profileUpdates.push(`bank_account_number = $${profileParamIndex++}`);
          profileValues.push(req.bankAccountNumber);
        }
        if (req.bankIfscCode) {
          profileUpdates.push(`bank_ifsc_code = $${profileParamIndex++}`);
          profileValues.push(req.bankIfscCode);
        }
        if (req.panNumber) {
          profileUpdates.push(`pan_number = $${profileParamIndex++}`);
          profileValues.push(req.panNumber);
        }
        if (req.aadharNumber) {
          profileUpdates.push(`aadhar_number = $${profileParamIndex++}`);
          profileValues.push(req.aadharNumber);
        }

        if (profileUpdates.length > 0) {
          profileUpdates.push(`updated_at = NOW()`);
          await tx.rawQuery(`
            UPDATE employee_profiles
            SET ${profileUpdates.join(', ')}
            WHERE user_id = $${profileParamIndex}
          `, ...profileValues, req.employeeId);
        }

        // Log audit trail
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, new_values
          ) VALUES (
            ${auth.userID}, 'employee_updated', 'user', ${req.employeeId},
            ${JSON.stringify(req)}
          )
        `;
      });

      return { success: true };

    } catch (error) {
      console.error('Employee update error:', error);
      throw APIError.internal("Failed to update employee");
    }
  }
);

// HR/Admin: Delete/Terminate employee
export const terminateEmployee = api<{ employeeId: number; terminationReason: string; lastWorkingDay: string }, { success: boolean }>(
  { auth: true, expose: true, method: "DELETE", path: "/users/employees/:employeeId" },
  async (req) => {
    const auth = getAuthData()!;

    // Check HR permissions
    if (!auth.permissions.includes('employees.manage')) {
      throw APIError.permissionDenied("Insufficient permissions to terminate employees");
    }

    try {
      await db.tx(async (tx) => {
        // Update employee profile with termination details
        await tx.exec`
          UPDATE employee_profiles
          SET is_active = false,
              termination_date = ${req.lastWorkingDay},
              termination_reason = ${req.terminationReason},
              updated_at = NOW()
          WHERE user_id = ${req.employeeId}
        `;

        // Deactivate user account
        await tx.exec`
          UPDATE users
          SET is_active = false, updated_at = NOW()
          WHERE id = ${req.employeeId}
        `;

        // Log audit trail
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, new_values
          ) VALUES (
            ${auth.userID}, 'employee_terminated', 'user', ${req.employeeId},
            ${JSON.stringify({ terminationReason: req.terminationReason, lastWorkingDay: req.lastWorkingDay })}
          )
        `;

        // Send notification to employee
        await tx.exec`
          INSERT INTO notifications (
            user_id, title, content, type, reference_type, reference_id
          ) VALUES (
            ${req.employeeId},
            'Employment Termination Notice',
            'Your employment has been terminated. Last working day: ${req.lastWorkingDay}. Please contact HR for further details.',
            'termination',
            'user',
            ${req.employeeId}
          )
        `;
      });

      return { success: true };

    } catch (error) {
      console.error('Employee termination error:', error);
      throw APIError.internal("Failed to terminate employee");
    }
  }
);

// Performance Review APIs
interface PerformanceReviewRequest {
  employeeId: number;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  overallRating: number; // 1-5 scale
  goals: Array<{
    description: string;
    status: 'achieved' | 'partially_achieved' | 'not_achieved';
    comments?: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  managerComments: string;
  employeeSelfAssessment?: string;
  nextReviewDate: string;
}

// HR/Manager: Create performance review
export const createPerformanceReview = api<PerformanceReviewRequest, { reviewId: number }>(
  { auth: true, expose: true, method: "POST", path: "/users/employees/performance-review" },
  async (req) => {
    const auth = getAuthData()!;

    // Check permissions
    if (!auth.permissions.includes('employees.manage')) {
      throw APIError.permissionDenied("Insufficient permissions to create performance reviews");
    }

    // Validate rating
    if (req.overallRating < 1 || req.overallRating > 5) {
      throw APIError.invalidArgument("Overall rating must be between 1 and 5");
    }

    try {
      const review = await db.queryRow`
        INSERT INTO performance_reviews (
          employee_id, reviewer_id, review_period_start, review_period_end,
          overall_rating, goals, strengths, areas_for_improvement,
          manager_comments, employee_self_assessment, next_review_date
        ) VALUES (
          ${req.employeeId}, ${auth.userID}, ${req.reviewPeriodStart}, ${req.reviewPeriodEnd},
          ${req.overallRating}, ${JSON.stringify(req.goals)}, ${req.strengths},
          ${req.areasForImprovement}, ${req.managerComments}, ${req.employeeSelfAssessment},
          ${req.nextReviewDate}
        ) RETURNING id
      `;

      // Notify employee
      await db.exec`
        INSERT INTO notifications (
          user_id, title, content, type, reference_type, reference_id
        ) VALUES (
          ${req.employeeId},
          'Performance Review Completed',
          'Your performance review for the period ${req.reviewPeriodStart} to ${req.reviewPeriodEnd} has been completed. Overall rating: ${req.overallRating}/5',
          'performance_review',
          'performance_review',
          ${review.id}
        )
      `;

      // Log audit trail
      await db.exec`
        INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, new_values
        ) VALUES (
          ${auth.userID}, 'performance_review_created', 'performance_review', ${review.id},
          ${JSON.stringify({ employeeId: req.employeeId, overallRating: req.overallRating })}
        )
      `;

      return { reviewId: review.id };

    } catch (error) {
      console.error('Performance review creation error:', error);
      throw APIError.internal("Failed to create performance review");
    }
  }
);

// Get employee performance reviews
export const getPerformanceReviews = api<{ employeeId?: number; page?: Query<number>; limit?: Query<number> }, { reviews: any[]; total: number }>(
  { auth: true, expose: true, method: "GET", path: "/users/employees/performance-reviews" },
  async (params) => {
    const auth = getAuthData()!;

    const employeeId = params.employeeId || parseInt(auth.userID);
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Check permissions (can view own reviews or have HR permissions)
    if (employeeId !== parseInt(auth.userID) && !auth.permissions.includes('employees.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    const reviews = await db.queryAll`
      SELECT
        pr.*,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name,
        emp.first_name as employee_first_name,
        emp.last_name as employee_last_name
      FROM performance_reviews pr
      JOIN users reviewer ON pr.reviewer_id = reviewer.id
      JOIN users emp ON pr.employee_id = emp.id
      WHERE pr.employee_id = ${employeeId}
      ORDER BY pr.review_period_end DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalResult = await db.queryRow`
      SELECT COUNT(*) as total FROM performance_reviews WHERE employee_id = ${employeeId}
    `;

    return {
      reviews: reviews.map(review => ({
        id: review.id,
        reviewPeriod: {
          start: review.review_period_start,
          end: review.review_period_end
        },
        overallRating: review.overall_rating,
        goals: review.goals,
        strengths: review.strengths,
        areasForImprovement: review.areas_for_improvement,
        managerComments: review.manager_comments,
        employeeSelfAssessment: review.employee_self_assessment,
        nextReviewDate: review.next_review_date,
        reviewer: {
          name: `${review.reviewer_first_name} ${review.reviewer_last_name}`
        },
        employee: {
          name: `${review.employee_first_name} ${review.employee_last_name}`
        },
        createdAt: review.created_at
      })),
      total: totalResult?.total || 0
    };
  }
);

// Salary Management APIs
interface SalaryAdjustmentRequest {
  employeeId: number;
  newSalary: number;
  adjustmentType: 'increment' | 'decrement' | 'bonus' | 'deduction';
  reason: string;
  effectiveDate: string;
  isRecurring: boolean;
}

// HR/Admin: Adjust employee salary
export const adjustSalary = api<SalaryAdjustmentRequest, { success: boolean; adjustmentId: number }>(
  { auth: true, expose: true, method: "POST", path: "/users/employees/salary-adjustment" },
  async (req) => {
    const auth = getAuthData()!;

    // Check HR permissions
    if (!auth.permissions.includes('employees.manage')) {
      throw APIError.permissionDenied("Insufficient permissions to adjust salaries");
    }

    if (req.newSalary <= 0) {
      throw APIError.invalidArgument("Salary must be positive");
    }

    try {
      const result = await db.tx(async (tx) => {
        // Get current salary
        const currentEmployee = await tx.queryRow`
          SELECT salary FROM employee_profiles WHERE user_id = ${req.employeeId}
        `;

        if (!currentEmployee) {
          throw APIError.notFound("Employee not found");
        }

        // Create salary adjustment record
        const adjustment = await tx.queryRow`
          INSERT INTO salary_adjustments (
            employee_id, previous_salary, new_salary, adjustment_type,
            reason, effective_date, is_recurring, adjusted_by
          ) VALUES (
            ${req.employeeId}, ${currentEmployee.salary}, ${req.newSalary},
            ${req.adjustmentType}, ${req.reason}, ${req.effectiveDate},
            ${req.isRecurring}, ${auth.userID}
          ) RETURNING id
        `;

        // Update employee profile with new salary
        await tx.exec`
          UPDATE employee_profiles
          SET salary = ${req.newSalary}, updated_at = NOW()
          WHERE user_id = ${req.employeeId}
        `;

        // Log audit trail
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values
          ) VALUES (
            ${auth.userID}, 'salary_adjusted', 'employee', ${req.employeeId},
            ${JSON.stringify({ salary: currentEmployee.salary })},
            ${JSON.stringify({ salary: req.newSalary, reason: req.reason, type: req.adjustmentType })}
          )
        `;

        // Notify employee
        await tx.exec`
          INSERT INTO notifications (
            user_id, title, content, type, reference_type, reference_id
          ) VALUES (
            ${req.employeeId},
            'Salary Adjustment',
            'Your salary has been ${req.adjustmentType === 'increment' ? 'increased' : req.adjustmentType === 'decrement' ? 'decreased' : 'adjusted'} to ₹${req.newSalary}. Effective date: ${req.effectiveDate}',
            'salary_adjustment',
            'salary_adjustment',
            ${adjustment.id}
          )
        `;

        return { adjustmentId: adjustment.id };
      });

      return { success: true, adjustmentId: result.adjustmentId };

    } catch (error) {
      console.error('Salary adjustment error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to adjust salary");
    }
  }
);

// HR: Generate payroll for employees
export const generatePayroll = api<{ month: string; year: number; employeeIds?: number[] }, { payrollId: number; processedEmployees: number }>(
  { auth: true, expose: true, method: "POST", path: "/users/employees/payroll/generate" },
  async (req) => {
    const auth = getAuthData()!;

    // Check HR permissions
    if (!auth.permissions.includes('employees.manage')) {
      throw APIError.permissionDenied("Insufficient permissions to generate payroll");
    }

    try {
      const result = await db.tx(async (tx) => {
        // Create payroll batch
        const payrollBatch = await tx.queryRow`
          INSERT INTO payroll_batches (
            month, year, generated_by, status
          ) VALUES (
            ${req.month}, ${req.year}, ${auth.userID}, 'processing'
          ) RETURNING id
        `;

        // Get employees to process
        let employeeQuery = `
          SELECT
            u.id, u.first_name, u.last_name, u.email,
            ep.salary, ep.employee_id, ep.employment_type
          FROM users u
          JOIN employee_profiles ep ON u.id = ep.user_id
          WHERE u.is_active = true AND ep.is_active = true
        `;

        const queryParams: any[] = [];
        if (req.employeeIds && req.employeeIds.length > 0) {
          employeeQuery += ` AND u.id = ANY($1)`;
          queryParams.push(req.employeeIds);
        }

        const employees = await tx.rawQueryAll(employeeQuery, ...queryParams);

        let processedCount = 0;

        for (const employee of employees) {
          // Calculate attendance for the month
          const attendanceStats = await tx.queryRow`
            SELECT
              COUNT(*) as total_days,
              COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
              COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_days,
              COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_days
            FROM employee_attendance
            WHERE user_id = ${employee.id}
            AND EXTRACT(MONTH FROM date) = ${parseInt(req.month)}
            AND EXTRACT(YEAR FROM date) = ${req.year}
          `;

          // Calculate working days in month (assuming 22 working days)
          const workingDays = 22;
          const presentDays = (attendanceStats?.present_days || 0) + (attendanceStats?.half_days || 0) * 0.5;
          const attendancePercentage = (presentDays / workingDays) * 100;

          // Calculate basic salary
          const basicSalary = employee.salary || 0;
          const perDaySalary = basicSalary / workingDays;
          const earnedSalary = perDaySalary * presentDays;

          // Calculate deductions (simplified)
          const pf = basicSalary * 0.12; // 12% PF
          const esi = basicSalary * 0.0175; // 1.75% ESI
          const tax = basicSalary > 50000 ? basicSalary * 0.1 : 0; // Simplified tax

          const totalDeductions = pf + esi + tax;
          const netSalary = earnedSalary - totalDeductions;

          // Create payroll record
          await tx.exec`
            INSERT INTO payroll_records (
              batch_id, employee_id, month, year, basic_salary, earned_salary,
              pf_deduction, esi_deduction, tax_deduction, total_deductions,
              net_salary, attendance_percentage, working_days, present_days
            ) VALUES (
              ${payrollBatch.id}, ${employee.id}, ${req.month}, ${req.year},
              ${basicSalary}, ${earnedSalary}, ${pf}, ${esi}, ${tax},
              ${totalDeductions}, ${netSalary}, ${attendancePercentage},
              ${workingDays}, ${presentDays}
            )
          `;

          processedCount++;
        }

        // Update batch status
        await tx.exec`
          UPDATE payroll_batches
          SET status = 'completed', processed_employees = ${processedCount}, completed_at = NOW()
          WHERE id = ${payrollBatch.id}
        `;

        return { payrollId: payrollBatch.id, processedEmployees: processedCount };
      });

      return result;

    } catch (error) {
      console.error('Payroll generation error:', error);
      throw APIError.internal("Failed to generate payroll");
    }
  }
);

// Get employee payroll history
export const getPayrollHistory = api<{ employeeId?: number; year?: Query<number>; month?: Query<string> }, { payrolls: any[] }>(
  { auth: true, expose: true, method: "GET", path: "/users/employees/payroll" },
  async (params) => {
    const auth = getAuthData()!;

    const employeeId = params.employeeId || parseInt(auth.userID);

    // Check permissions (can view own payroll or have HR permissions)
    if (employeeId !== parseInt(auth.userID) && !auth.permissions.includes('employees.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    let whereClause = "WHERE pr.employee_id = $1";
    const queryParams: any[] = [employeeId];
    let paramIndex = 2;

    if (params.year) {
      whereClause += ` AND pr.year = $${paramIndex++}`;
      queryParams.push(params.year);
    }

    if (params.month) {
      whereClause += ` AND pr.month = $${paramIndex++}`;
      queryParams.push(params.month);
    }

    const payrolls = await db.rawQueryAll(`
      SELECT
        pr.*,
        pb.status as batch_status,
        pb.generated_by,
        gen_by.first_name as generated_by_name
      FROM payroll_records pr
      JOIN payroll_batches pb ON pr.batch_id = pb.id
      JOIN users gen_by ON pb.generated_by = gen_by.id
      ${whereClause}
      ORDER BY pr.year DESC, pr.month DESC
    `, ...queryParams);

    return {
      payrolls: payrolls.map(payroll => ({
        id: payroll.id,
        month: payroll.month,
        year: payroll.year,
        basicSalary: payroll.basic_salary,
        earnedSalary: payroll.earned_salary,
        deductions: {
          pf: payroll.pf_deduction,
          esi: payroll.esi_deduction,
          tax: payroll.tax_deduction,
          total: payroll.total_deductions
        },
        netSalary: payroll.net_salary,
        attendance: {
          percentage: payroll.attendance_percentage,
          workingDays: payroll.working_days,
          presentDays: payroll.present_days
        },
        batchStatus: payroll.batch_status,
        generatedBy: payroll.generated_by_name,
        createdAt: payroll.created_at
      }))
    };
  }
);

    if (!canApprove) {
      throw APIError.permissionDenied("Insufficient permissions to approve/reject leave");
    }

    try {
      await db.exec`
        UPDATE employee_leaves 
        SET 
          status = ${req.status},
          approved_by = ${auth.userID},
          approved_at = NOW(),
          rejection_reason = ${req.rejectionReason}
        WHERE id = ${req.leaveId}
      `;

      // Notify employee
      await db.exec`
        INSERT INTO notifications (
          user_id, title, content, type, reference_type, reference_id
        ) VALUES (
          ${leave.user_id},
          'Leave Request ${req.status === 'approved' ? 'Approved' : 'Rejected'}',
          'Your leave request from ${leave.start_date} to ${leave.end_date} has been ${req.status}${req.rejectionReason ? '. Reason: ' + req.rejectionReason : ''}',
          'leave_${req.status}',
          'leave',
          ${req.leaveId}
        )
      `;

      return { success: true };

    } catch (error) {
      console.error('Update leave status error:', error);
      throw APIError.internal("Failed to update leave status");
    }
  }
);