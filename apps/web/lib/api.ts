// API client for frontend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface Call {
  id: string;
  organizationId: string;
  fromNumber: string;
  toNumber: string;
  twilioCallSid?: string | null;
  startTime: string;
  endTime?: string | null;
  durationSeconds?: number | null;
  outcome?: string | null;
  recordingUrl?: string | null;
  transcript?: string | null;
  summary?: string | null;
  lead?: Lead | null;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  callId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  serviceRequested?: string | null;
  scheduledDate?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  call?: Call | null;
}

export interface CallsResponse {
  calls: Call[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  limit: number;
  offset: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: headers as HeadersInit,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return { data };
    } catch (error: any) {
      return {
        error: error.message || "Network error",
      };
    }
  }

  // Auth
  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: any }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    
    return result;
  }

  async register(email: string, password: string, organizationName: string) {
    const result = await this.request<{ token: string; user: any }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password, organizationName }),
      }
    );
    
    if (result.data?.token) {
      this.setToken(result.data.token);
    }
    
    return result;
  }

  logout() {
    this.setToken(null);
  }

  // Agent Profile
  async getAgentProfile() {
    return this.request("/api/profile/agent");
  }

  async updateAgentProfile(data: any) {
    return this.request("/api/profile/agent", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Business Profile
  async getBusinessProfile() {
    return this.request("/api/profile/business");
  }

  async updateBusinessProfile(data: any) {
    return this.request("/api/profile/business", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Metrics
  async getMetrics(days?: number) {
    const params = days ? `?days=${days}` : "";
    return this.request(`/api/metrics${params}`);
  }

  // Calls
  async getCalls(limit = 50, offset = 0) {
    return this.request<CallsResponse>(`/api/calls?limit=${limit}&offset=${offset}`);
  }

  async getCall(id: string) {
    return this.request<Call>(`/api/calls/${id}`);
  }

  // Leads
  async getLeads(limit = 50, offset = 0, status?: string) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (status) params.append("status", status);
    return this.request<LeadsResponse>(`/api/leads?${params}`);
  }

  async getLead(id: string) {
    return this.request<Lead>(`/api/leads/${id}`);
  }

  async updateLead(id: string, data: any) {
    return this.request(`/api/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Integrations
  async getIntegrations() {
    return this.request("/api/integrations");
  }

  async updateIntegrations(data: any) {
    return this.request("/api/integrations", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_URL);
