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