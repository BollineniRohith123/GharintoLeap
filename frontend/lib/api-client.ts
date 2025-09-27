/**
 * API Client for Gharinto Leap Frontend
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = 'http://localhost:4000';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Type definitions for entities
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country?: string;
  avatarUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  budget: number;
  startDate: string;
  endDate?: string;
  customerId: number;
  designerId?: number;
  projectManagerId?: number;
  location: string;
  progress: number;
  customer?: User;
  designer?: User;
  projectManager?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  projectType: string;
  budgetRange: string;
  description: string;
  status: string;
  assignedTo?: number;
  assignedUser?: User;
  source: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
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

  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    this.setToken(null);
  }

  // Users
  async getProfile() {
    return this.request('/users/profile');
  }

  async getUsers(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/users${query}`);
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects
  async getProjects(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/projects${query}`);
  }

  async createProject(projectData: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async updateProject(id: string, projectData: any) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Leads
  async getLeads(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/leads${query}`);
  }

  async createLead(leadData: any) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async getLead(id: string) {
    return this.request(`/leads/${id}`);
  }

  async updateLead(id: string, leadData: any) {
    return this.request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    });
  }

  async assignLead(id: string, assigneeId: string) {
    return this.request(`/leads/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigneeId }),
    });
  }

  async convertLead(id: string, projectData: any) {
    return this.request(`/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  // Materials
  async getMaterials(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/materials${query}`);
  }

  async getMaterialCategories() {
    return this.request('/materials/categories');
  }

  async createMaterial(materialData: any) {
    return this.request('/materials', {
      method: 'POST',
      body: JSON.stringify(materialData),
    });
  }

  // Vendors
  async getVendors(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request(`/vendors${query}`);
  }

  async createVendor(vendorData: any) {
    return this.request('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
  }

  // Analytics
  async getDashboardAnalytics() {
    return this.request('/analytics/dashboard');
  }

  async getLeadAnalytics() {
    return this.request('/analytics/leads');
  }

  async getProjectAnalytics() {
    return this.request('/analytics/projects');
  }

  // Search
  async search(query: string, type?: string) {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return this.request(`/search?${params}`);
  }

  // Health
  async healthCheck() {
    return this.request('/health');
  }

  // RBAC
  async getUserPermissions() {
    return this.request('/rbac/user-permissions');
  }

  async getUserMenus() {
    return this.request('/menus/user');
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  // Wallet & Transactions
  async getWallet() {
    return this.request('/wallet');
  }

  async getTransactions() {
    return this.request('/wallet/transactions');
  }

  // Quotations
  async getQuotations() {
    return this.request('/quotations');
  }

  async createQuotation(quotationData: any) {
    return this.request('/quotations', {
      method: 'POST',
      body: JSON.stringify(quotationData),
    });
  }

  // Invoices
  async getInvoices() {
    return this.request('/invoices');
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;
