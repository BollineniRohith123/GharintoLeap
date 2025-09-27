// API Client for Gharinto Leap Interior Design Marketplace
// Matches backend server.ts endpoints perfectly

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ==================== AUTH INTERFACES ====================
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  roles: string[];
  permissions: string[];
  menus?: Menu[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Menu {
  name: string;
  displayName: string;
  icon?: string;
  path?: string;
  children?: Menu[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  userType?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ==================== PROJECT INTERFACES ====================
export interface Project {
  id: number;
  title: string;
  description?: string;
  client: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  designer?: {
    id: number;
    name: string;
    email?: string;
  };
  projectManager?: {
    id: number;
    name: string;
    email?: string;
  };
  status: string;
  priority: string;
  budget: number;
  estimatedCost?: number;
  actualCost?: number;
  progressPercentage: number;
  startDate: string;
  endDate: string;
  estimatedEndDate?: string;
  city: string;
  address?: string;
  areaSqft?: number;
  propertyType: string;
  milestones?: ProjectMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: number;
  title: string;
  description?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: string;
  budget: number;
  actualCost?: number;
  sortOrder: number;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  clientId: number;
  designerId?: number;
  budget: number;
  startDate: string;
  endDate: string;
  city: string;
  address?: string;
  areaSqft?: number;
  propertyType: string;
  leadId?: number;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  designerId?: number;
  status?: string;
  priority?: string;
  budget?: number;
  estimatedCost?: number;
  actualCost?: number;
  progressPercentage?: number;
  startDate?: string;
  endDate?: string;
  estimatedEndDate?: string;
  city?: string;
  address?: string;
  areaSqft?: number;
  propertyType?: string;
}

// ==================== LEAD INTERFACES ====================
export interface Lead {
  id: number;
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  budgetMin?: number;
  budgetMax?: number;
  projectType: string;
  propertyType: string;
  timeline: string;
  description?: string;
  score: number;
  status: string;
  assignedTo?: {
    id: number;
    name: string;
  };
  convertedToProject?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadRequest {
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  budgetMin?: number;
  budgetMax?: number;
  projectType: string;
  propertyType: string;
  timeline: string;
  description?: string;
}

export interface UpdateLeadRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  budgetMin?: number;
  budgetMax?: number;
  projectType?: string;
  propertyType?: string;
  timeline?: string;
  description?: string;
  status?: string;
  score?: number;
}

// ==================== FINANCIAL INTERFACES ====================
export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  wallet_id: number;
  type: string;
  amount: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  client_id: number;
  project_id?: number;
  title: string;
  total_amount: number;
  status: string;
  valid_until: string;
  first_name?: string;
  last_name?: string;
  project_title?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  project_id?: number;
  amount: number;
  status: string;
  due_date: string;
  first_name?: string;
  last_name?: string;
  project_title?: string;
  created_at: string;
}

// ==================== MATERIAL INTERFACES ====================
export interface Material {
  id: number;
  name: string;
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  description?: string;
  unit: string;
  price: number;
  discountedPrice?: number;
  stockQuantity: number;
  minOrderQuantity?: number;
  leadTimeDays?: number;
  images?: string[];
  specifications?: Record<string, any>;
  vendor: {
    id: number;
    name: string;
    rating?: number;
  };
  createdAt: string;
}

export interface MaterialCategory {
  name: string;
  count: number;
}

// ==================== VENDOR INTERFACES ====================
export interface Vendor {
  id: number;
  userId: number;
  companyName: string;
  businessType: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city: string;
  state?: string;
  pincode?: string;
  isVerified: boolean;
  rating: number;
  totalOrders: number;
  materialCount: number;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
}

// ==================== OTHER INTERFACES ====================
export interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  employee_id: string;
  department: string;
  designation: string;
  joining_date: string;
  basic_salary: number;
  gross_salary: number;
  ctc: number;
}

export interface Complaint {
  id: number;
  complaint_number: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  project_id?: number;
  complainant_id: number;
  complainant_name: string;
  complainant_email: string;
  assigned_to?: number;
  project_title?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  read_at?: string;
}

// ==================== API CLIENT CLASS ====================
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:4000') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method: method.toUpperCase(),
      headers,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url.toString(), config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // ==================== AUTHENTICATION METHODS ====================
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('POST', '/auth/login', credentials);
    this.setToken(response.token);
    return response;
  }

  async register(userData: RegisterRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('POST', '/auth/register', userData);
    this.setToken(response.token);
    return response;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    return this.request('POST', '/auth/forgot-password', data);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return this.request('POST', '/auth/reset-password', data);
  }

  logout() {
    this.setToken(null);
  }

  // ==================== USER METHODS ====================
  async getUserProfile(): Promise<User> {
    return this.request('GET', '/users/profile');
  }

  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    city?: string;
    search?: string;
  }): Promise<PaginatedResponse<User> & { users: User[] }> {
    return this.request('GET', '/users', undefined, params);
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    city?: string;
    roles?: string[];
  }): Promise<User> {
    return this.request('POST', '/users', userData);
  }

  async getUserDetails(id: number): Promise<User> {
    return this.request('GET', `/users/${id}`);
  }

  async updateUser(id: number, userData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    isActive?: boolean;
    roles?: string[];
  }): Promise<User> {
    return this.request('PUT', `/users/${id}`, userData);
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    return this.request('DELETE', `/users/${id}`);
  }

  // ==================== PROJECT METHODS ====================
  async getProjects(params?: {
    page?: number;
    limit?: number;
    status?: string;
    city?: string;
    designerId?: number;
    clientId?: number;
  }): Promise<PaginatedResponse<Project> & { projects: Project[] }> {
    return this.request('GET', '/projects', undefined, params);
  }

  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    return this.request('POST', '/projects', projectData);
  }

  async getProjectDetails(id: number): Promise<Project> {
    return this.request('GET', `/projects/${id}`);
  }

  async updateProject(id: number, projectData: UpdateProjectRequest): Promise<Project> {
    return this.request('PUT', `/projects/${id}`, projectData);
  }

  async deleteProject(id: number): Promise<{ message: string }> {
    return this.request('DELETE', `/projects/${id}`);
  }

  // ==================== LEAD METHODS ====================
  async getLeads(params?: {
    page?: number;
    limit?: number;
    status?: string;
    city?: string;
    assignedTo?: number;
    minScore?: number;
  }): Promise<PaginatedResponse<Lead> & { leads: Lead[] }> {
    return this.request('GET', '/leads', undefined, params);
  }

  async createLead(leadData: CreateLeadRequest): Promise<Lead> {
    return this.request('POST', '/leads', leadData);
  }

  async getLeadDetails(id: number): Promise<Lead> {
    return this.request('GET', `/leads/${id}`);
  }

  async updateLead(id: number, leadData: UpdateLeadRequest): Promise<Lead> {
    return this.request('PUT', `/leads/${id}`, leadData);
  }

  async assignLead(id: number, assignedTo: number): Promise<{ message: string; leadId: number; assignedTo: number }> {
    return this.request('POST', `/leads/${id}/assign`, { assignedTo });
  }

  async convertLead(id: number, conversionData: {
    projectTitle: string;
    projectDescription?: string;
    budget: number;
    designerId?: number;
  }): Promise<{
    message: string;
    lead: { id: number; status: string };
    project: { id: number; title: string; createdAt: string };
  }> {
    return this.request('POST', `/leads/${id}/convert`, conversionData);
  }

  // ==================== FINANCIAL METHODS ====================
  async getUserWallet(): Promise<Wallet> {
    return this.request('GET', '/wallet');
  }

  async getWalletTransactions(): Promise<{ transactions: Transaction[] }> {
    return this.request('GET', '/wallet/transactions');
  }

  async getQuotations(): Promise<{ quotations: Quotation[] }> {
    return this.request('GET', '/quotations');
  }

  async createQuotation(quotationData: {
    clientId: number;
    projectId?: number;
    title: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
    validUntil: string;
  }): Promise<Quotation> {
    return this.request('POST', '/quotations', quotationData);
  }

  async getInvoices(): Promise<{ invoices: Invoice[] }> {
    return this.request('GET', '/invoices');
  }

  // ==================== EMPLOYEE METHODS ====================
  async getEmployees(): Promise<{ employees: Employee[] }> {
    return this.request('GET', '/employees');
  }

  async markAttendance(attendanceData: {
    userId?: number;
    date: string;
    checkInTime: string;
    checkOutTime: string;
    status: string;
  }): Promise<any> {
    return this.request('POST', '/employees/attendance', attendanceData);
  }

  // ==================== MATERIAL METHODS ====================
  async getMaterials(params?: {
    page?: number;
    limit?: number;
    category?: string;
    vendorId?: number;
    search?: string;
  }): Promise<PaginatedResponse<Material> & { materials: Material[] }> {
    return this.request('GET', '/materials', undefined, params);
  }

  async createMaterial(materialData: {
    vendorId?: number;
    name: string;
    category: string;
    subcategory?: string;
    brand?: string;
    model?: string;
    description?: string;
    unit: string;
    price: number;
    discountedPrice?: number;
    stockQuantity: number;
    minOrderQuantity?: number;
    leadTimeDays?: number;
    images?: string[];
    specifications?: Record<string, any>;
  }): Promise<Material> {
    return this.request('POST', '/materials', materialData);
  }

  async getMaterialCategories(): Promise<{ categories: MaterialCategory[] }> {
    return this.request('GET', '/materials/categories');
  }

  async getMaterialDetails(id: number): Promise<Material> {
    return this.request('GET', `/materials/${id}`);
  }

  async updateMaterial(id: number, materialData: {
    name?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    model?: string;
    description?: string;
    unit?: string;
    price?: number;
    discountedPrice?: number;
    stockQuantity?: number;
    minOrderQuantity?: number;
    leadTimeDays?: number;
    images?: string[];
    specifications?: Record<string, any>;
    isActive?: boolean;
  }): Promise<Material> {
    return this.request('PUT', `/materials/${id}`, materialData);
  }

  // ==================== VENDOR METHODS ====================
  async getVendors(params?: {
    page?: number;
    limit?: number;
    city?: string;
    businessType?: string;
    isVerified?: boolean;
  }): Promise<PaginatedResponse<Vendor> & { vendors: Vendor[] }> {
    return this.request('GET', '/vendors', undefined, params);
  }

  async createVendor(vendorData: {
    userId: number;
    companyName: string;
    businessType: string;
    gstNumber?: string;
    panNumber?: string;
    address?: string;
    city: string;
    state?: string;
    pincode?: string;
  }): Promise<Vendor> {
    return this.request('POST', '/vendors', vendorData);
  }

  async getVendorDetails(id: number): Promise<Vendor> {
    return this.request('GET', `/vendors/${id}`);
  }

  // ==================== COMMUNICATION METHODS ====================
  async getComplaints(): Promise<{ complaints: Complaint[] }> {
    return this.request('GET', '/complaints');
  }

  async createComplaint(complaintData: {
    title: string;
    description: string;
    priority?: string;
    projectId?: number;
  }): Promise<Complaint> {
    return this.request('POST', '/complaints', complaintData);
  }

  async getNotifications(): Promise<{ notifications: Notification[] }> {
    return this.request('GET', '/notifications');
  }

  async markNotificationAsRead(id: number): Promise<{ message: string }> {
    return this.request('PUT', `/notifications/${id}/read`);
  }

  // ==================== HEALTH & SYSTEM METHODS ====================
  async getSystemHealth(): Promise<{
    status: string;
    timestamp: string;
    database: string;
  }> {
    return this.request('GET', '/health');
  }

  async getDatabaseHealth(): Promise<{
    status: string;
    database: string;
    timestamp: string;
  }> {
    return this.request('GET', '/health/db');
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();
export default apiClient;

// Export the class as well for advanced usage
export { ApiClient };