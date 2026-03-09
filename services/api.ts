/**
 * SwiftYard API Client
 *
 * A comprehensive API client for communicating with the SwiftYard backend.
 * This client handles authentication, request/response transformation, and error handling.
 */

import {
  Appointment,
  Resource,
  Driver,
  Trailer,
  TrailerTypeDefinition,
  Carrier,
  AppSettings,
  DashboardMetrics,
  UserProfileData,
  RoleDefinition,
  Facility,
  Activity,
} from "../types";

// API Configuration
// In development, use Vite proxy (/api). In production, use Render backend.
const RENDER_URL = "https://swiftyard.onrender.com";
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : `${RENDER_URL}/api`);

// Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  message?: string;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
  mode?: "staff" | "carrier";
  facilityId?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    assignedFacilities: string[];
    carrierId?: string;
    facilityId?: string;
  };
}

export interface TokenRefreshResponse {
  token: string;
}

// Storage helpers
const TOKEN_KEY = "swiftyard_auth_token";
const USER_KEY = "swiftyard_user";

const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
const setToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token);
const removeToken = (): void => localStorage.removeItem(TOKEN_KEY);

const getUser = (): any => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};
const setUser = (user: any): void =>
  localStorage.setItem(USER_KEY, JSON.stringify(user));
const removeUser = (): void => localStorage.removeItem(USER_KEY);

// Request helper
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn("[API] No token found for request:", endpoint);
  }

  // Include facility ID from header if available
  const facilityId = localStorage.getItem("swiftyard_facility_id");
  if (facilityId && facilityId !== "null") {
    headers["X-Facility-ID"] = facilityId;
  }

  console.log(
    "[API] Request:",
    endpoint,
    "Token:",
    token ? "present" : "missing",
  );

  const attemptFetch = async () => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();

    if (!text) {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { success: true } as ApiResponse<T>;
    }

    const data = JSON.parse(text);
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }
    return data as ApiResponse<T>;
  };

  try {
    return await attemptFetch();
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn("[API] Network error (Render cold start?), retrying until awake...", endpoint);
      // Retry up to 15 times (approx 60 seconds) for Render free tier sleep
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 4000));
        try {
          return await attemptFetch();
        } catch (retryError: any) {
          if (i === 14 || !(retryError instanceof TypeError && retryError.message.includes("fetch"))) {
            console.error("API Retry Error:", retryError);
            return { success: false, error: { message: retryError.message || "Network error" } };
          }
          // Continue looping if still "Failed to fetch"
        }
      }
    }
    console.error("API Request Error:", error);
    return { success: false, error: { message: error.message || "Network error" } };
  }
}

// ==================== AUTH API ====================

export const authApi = {
  login: async (
    credentials: LoginCredentials,
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      setToken(response.data.token);
      setUser(response.data.user);
    }

    return response;
  },

  signup: async (data: {
    email: string;
    password: string;
    displayName: string;
    facilityId: string;
    role?: string;
    carrierId?: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      setToken(response.data.token);
      setUser(response.data.user);
    }

    return response;
  },

  logout: (): void => {
    removeToken();
    removeUser();
    localStorage.removeItem("swiftyard_facility_id");
  },

  clerkLogin: async (
    token: string,
    mode?: "staff" | "carrier",
    facilityId?: string,
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await request<AuthResponse>("/auth/clerk-login", {
      method: "POST",
      body: JSON.stringify({ token, mode, facilityId }),
    });

    if (response.success && response.data) {
      setToken(response.data.token);
      setUser(response.data.user);
    }

    return response;
  },

  clerkSignup: async (
    token: string,
    facilityId: string,
    role?: string,
    carrierId?: string,
    firstName?: string,
    lastName?: string,
    username?: string
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await request<AuthResponse>("/auth/clerk-signup", {
      method: "POST",
      body: JSON.stringify({ token, facilityId, role, carrierId, firstName, lastName, username }),
    });

    if (response.success && response.data) {
      setToken(response.data.token);
      setUser(response.data.user);
    }

    return response;
  },

  getCurrentUser: async (): Promise<
    ApiResponse<{ user: UserProfileData; carrier?: Carrier }>
  > => {
    return request("/auth/me");
  },

  updateProfile: async (data: {
    displayName?: string;
    email?: string;
    photoURL?: string;
  }): Promise<ApiResponse<UserProfileData>> => {
    return request("/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<void>> => {
    return request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  setPassword: async (token: string, password: string): Promise<ApiResponse<AuthResponse>> => {
    return request("/auth/set-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },

  getToken: (): string | null => getToken(),
  getUser: (): any => getUser(),
  isAuthenticated: (): boolean => !!getToken(),
};

// ==================== DRIVER LOGIN API ====================

export const driverLoginApi = {
  findByTrailer: async (
    trailerNumber: string,
  ): Promise<ApiResponse<{ drivers: any[]; trailerNumber: string; trailer?: any }>> => {
    return request("/auth/driver-login", {
      method: "POST",
      body: JSON.stringify({ trailerNumber }),
    });
  },
};

// ==================== APPOINTMENTS API ====================

export const appointmentsApi = {
  getAll: async (
    facilityId?: string | null,
  ): Promise<ApiResponse<Appointment[]>> => {
    const params = new URLSearchParams();
    if (facilityId !== undefined) {
      params.set("facilityId", facilityId || "null");
    }
    const token = getToken();
    const endpoint = token ? "/appointments" : "/public/appointments";
    return request(
      `${endpoint}${params.toString() ? `?${params.toString()}` : ""}`,
    );
  },

  getById: async (id: string): Promise<ApiResponse<Appointment>> => {
    return request(`/appointments/${id}`);
  },

  create: async (
    data: Partial<Appointment>,
  ): Promise<ApiResponse<Appointment>> => {
    return request("/appointments/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: Partial<Appointment>,
  ): Promise<ApiResponse<Appointment>> => {
    return request("/appointments/save", {
      method: "POST",
      body: JSON.stringify({ id, ...data }),
    });
  },

  bulkUpdate: async (
    updates: { id: string, updates: Partial<Appointment> }[]
  ): Promise<ApiResponse<Appointment[]>> => {
    return request("/appointments/bulk-update", {
      method: "POST",
      body: JSON.stringify({ updates }),
    });
  },

  cancel: async (id: string): Promise<ApiResponse<Appointment>> => {
    return request(`/appointments/${id}/cancel`, {
      method: "POST",
    });
  },

  checkIn: async (
    id: string,
    actualTime?: string,
    dockId?: string,
  ): Promise<ApiResponse<Appointment>> => {
    return request(`/appointments/${id}/checkin`, {
      method: "POST",
      body: JSON.stringify({ actualTime, dockId }),
    });
  },

  checkOut: async (
    id: string,
    dockId?: string,
  ): Promise<ApiResponse<Appointment>> => {
    return request(`/appointments/${id}/checkout`, {
      method: "POST",
      body: JSON.stringify({ dockId }),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return request(`/appointments/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== TRAILERS API ====================

export const trailersApi = {
  getAll: async (): Promise<ApiResponse<Trailer[]>> => {
    // Drivers have no JWT — use public endpoint so they can fetch trailer data
    const token = getToken();
    if (!token) return request("/public/trailers");
    return request("/trailers");
  },

  getById: async (id: string): Promise<ApiResponse<Trailer>> => {
    // Drivers have no JWT — use public endpoint
    const token = getToken();
    if (!token) return request(`/public/trailers/${id}`);
    return request(`/trailers/${id}`);
  },

  create: async (data: Partial<Trailer>): Promise<ApiResponse<Trailer>> => {
    return request("/trailers/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: Partial<Trailer>,
  ): Promise<ApiResponse<Trailer>> => {
    // Check if user is authenticated - if not, use public driver endpoint
    const token = getToken();
    if (!token) {
      return request("/public/trailers/driver/update-status", {
        method: "POST",
        body: JSON.stringify({ trailerId: id, ...data }),
      });
    }
    return request("/trailers/save", {
      method: "POST",
      body: JSON.stringify({ id, ...data }),
    });
  },

  gateOut: async (
    id: string,
    checkOutWeight?: number,
    checkOutDocNumber?: string,
  ): Promise<ApiResponse<Trailer>> => {
    return request(`/trailers/${id}/gateout`, {
      method: "POST",
      body: JSON.stringify({ checkOutWeight, checkOutDocNumber }),
    });
  },

  moveToYard: async (
    id: string,
    slotId: string,
    appointmentId?: string,
  ): Promise<ApiResponse<Trailer>> => {
    // Check if user is authenticated - if not, use public driver endpoint
    const token = getToken();
    if (!token) {
      return request(`/public/trailers/driver/move-to-yard`, {
        method: "POST",
        body: JSON.stringify({ trailerId: id, slotId, appointmentId }),
      });
    }
    return request(`/trailers/${id}/move-to-yard`, {
      method: "POST",
      body: JSON.stringify({ slotId, appointmentId }),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return request(`/trailers/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== RESOURCES API ====================

export const resourcesApi = {
  getAll: async (): Promise<ApiResponse<Resource[]>> => {
    // Drivers have no JWT — use public endpoint so docks list is populated
    const token = getToken();
    if (!token) return request("/public/resources");
    return request("/resources");
  },

  getById: async (id: string): Promise<ApiResponse<Resource>> => {
    const token = getToken();
    if (!token) return request(`/public/resources/${id}`);
    return request(`/resources/${id}`);
  },

  create: async (data: Partial<Resource>): Promise<ApiResponse<Resource>> => {
    return request("/resources/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: Partial<Resource>,
  ): Promise<ApiResponse<Resource>> => {
    return request("/resources/save", {
      method: "POST",
      body: JSON.stringify({ id, ...data }),
    });
  },

  clear: async (id: string): Promise<ApiResponse<Resource>> => {
    return request(`/resources/${id}/clear`, {
      method: "POST",
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return request(`/resources/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== DRIVERS API ====================

export const driversApi = {
  getAll: async (): Promise<ApiResponse<Driver[]>> => {
    return request("/drivers");
  },

  getById: async (id: string): Promise<ApiResponse<Driver>> => {
    return request(`/drivers/${id}`);
  },

  create: async (data: Partial<Driver>): Promise<ApiResponse<Driver>> => {
    return request("/drivers/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: Partial<Driver>,
  ): Promise<ApiResponse<Driver>> => {
    return request("/drivers/save", {
      method: "POST",
      body: JSON.stringify({ id, ...data }),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return request(`/drivers/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== CARRIERS API ====================

export const carriersApi = {
  getAll: async (): Promise<ApiResponse<Carrier[]>> => {
    const token = getToken();
    return request(token ? "/carriers" : "/public/carriers");
  },

  getById: async (id: string): Promise<ApiResponse<Carrier>> => {
    return request(`/carriers/${id}`);
  },

  create: async (data: Partial<Carrier>): Promise<ApiResponse<Carrier>> => {
    return request("/carriers/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: Partial<Carrier>,
  ): Promise<ApiResponse<Carrier>> => {
    return request("/carriers/save", {
      method: "POST",
      body: JSON.stringify({ id, ...data }),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return request(`/carriers/${id}`, {
      method: "DELETE",
    });
  },

  getPublic: async (): Promise<ApiResponse<Carrier[]>> => {
    return request("/public/carriers");
  },
};

// ==================== TRAILER TYPES API ====================

export const trailerTypesApi = {
  getAll: async (): Promise<ApiResponse<TrailerTypeDefinition[]>> => {
    return request("/trailer-types");
  },

  getById: async (id: string): Promise<ApiResponse<TrailerTypeDefinition>> => {
    return request(`/trailer-types/${id}`);
  },

  create: async (
    data: Partial<TrailerTypeDefinition>,
  ): Promise<ApiResponse<TrailerTypeDefinition>> => {
    return request("/trailer-types/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (
    id: string,
    data: Partial<TrailerTypeDefinition>,
  ): Promise<ApiResponse<TrailerTypeDefinition>> => {
    return request("/trailer-types/save", {
      method: "POST",
      body: JSON.stringify({ id, ...data }),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return request(`/trailer-types/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== ADMIN API ====================

export const adminApi = {
  // Users
  getUsers: async (): Promise<ApiResponse<UserProfileData[]>> => {
    return request("/admin/users");
  },

  getUser: async (uid: string): Promise<ApiResponse<UserProfileData>> => {
    return request(`/admin/users/${uid}`);
  },

  createUser: async (
    data: Partial<UserProfileData> & { password?: string; sendInvite?: boolean },
  ): Promise<ApiResponse<UserProfileData>> => {
    return request("/admin/users/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateUser: async (
    uid: string,
    data: Partial<UserProfileData>,
  ): Promise<ApiResponse<UserProfileData>> => {
    return request("/admin/users/save", {
      method: "POST",
      body: JSON.stringify({ uid, ...data }),
    });
  },

  deleteUser: async (uid: string): Promise<ApiResponse<void>> => {
    return request(`/admin/users/${uid}`, {
      method: "DELETE",
    });
  },

  // Roles
  getRoles: async (): Promise<ApiResponse<RoleDefinition[]>> => {
    return request("/admin/roles");
  },

  getRole: async (id: string): Promise<ApiResponse<RoleDefinition>> => {
    return request(`/admin/roles/${id}`);
  },

  createRole: async (
    data: Partial<RoleDefinition>,
  ): Promise<ApiResponse<RoleDefinition>> => {
    return request("/admin/roles/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateRole: async (
    id: string,
    data: Partial<RoleDefinition>,
  ): Promise<ApiResponse<RoleDefinition>> => {
    return request("/admin/roles/save", {
      method: "POST",
      body: JSON.stringify({ id, ...data }),
    });
  },

  deleteRole: async (id: string): Promise<ApiResponse<void>> => {
    return request(`/admin/roles/${id}`, {
      method: "DELETE",
    });
  },

  // Public Facilities (for all authenticated users including carriers)
  getAllFacilities: async (): Promise<ApiResponse<Facility[]>> => {
    return request("/facilities");
  },

  // Roles (for all authenticated users)
  getAllRoles: async (): Promise<ApiResponse<any[]>> => {
    return request("/roles");
  },

  // Facilities
  getFacilities: async (): Promise<ApiResponse<Facility[]>> => {
    return request("/admin/facilities");
  },

  getFacility: async (id: string): Promise<ApiResponse<Facility>> => {
    return request(`/admin/facilities/${id}`);
  },

  createFacility: async (
    data: Partial<Facility>,
  ): Promise<ApiResponse<Facility>> => {
    return request("/admin/facilities/save", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateFacility: async (
    id: string,
    data: Partial<Facility>,
  ): Promise<ApiResponse<Facility>> => {
    return request("/admin/facilities/save", {
      method: "POST",
      body: JSON.stringify({ id, ...data }),
    });
  },

  deleteFacility: async (id: string): Promise<ApiResponse<void>> => {
    return request(`/admin/facilities/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== SETTINGS API ====================

export const settingsApi = {
  get: async (): Promise<ApiResponse<AppSettings>> => {
    return request("/settings");
  },

  update: async (data: AppSettings): Promise<ApiResponse<AppSettings>> => {
    return request("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  getAll: async (): Promise<ApiResponse<any[]>> => {
    const token = getToken();
    return request(token ? "/settings/all/list" : "/public/settings/all/list");
  },
};

// ==================== ACTIVITIES API ====================

export const activitiesApi = {
  getAll: async (facilityId?: string | null): Promise<ApiResponse<Activity[]>> => {
    const params = new URLSearchParams();
    if (facilityId) params.set("facilityId", facilityId);
    return request(`/activities?${params.toString()}`);
  },

  log: async (data: Partial<Activity>): Promise<ApiResponse<Activity>> => {
    return request("/activities/log", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ==================== FACILITIES API ====================

export const facilitiesApi = {
  getAll: async (): Promise<ApiResponse<Facility[]>> => {
    return request("/facilities");
  },

  getPublic: async (): Promise<ApiResponse<Facility[]>> => {
    return request("/public/facilities");
  },
};

// ==================== DASHBOARD API ====================

export const dashboardApi = {
  getMetrics: async (): Promise<ApiResponse<DashboardMetrics>> => {
    return request("/dashboard/metrics");
  },
};

// ==================== FACILITY CONTEXT ====================

export const setFacilityContext = (facilityId: string | null): void => {
  if (facilityId) {
    localStorage.setItem("swiftyard_facility_id", facilityId);
  } else {
    localStorage.removeItem("swiftyard_facility_id");
  }
};

export const getFacilityContext = (): string | null => {
  return localStorage.getItem("swiftyard_facility_id");
};

// ==================== EXPORT ALL ====================

export const api = {
  auth: authApi,
  driverLogin: driverLoginApi,
  appointments: appointmentsApi,
  trailers: trailersApi,
  resources: resourcesApi,
  drivers: driversApi,
  carriers: carriersApi,
  trailerTypes: trailerTypesApi,
  admin: adminApi,
  settings: settingsApi,
  facilities: facilitiesApi,
  dashboard: dashboardApi,
  activities: activitiesApi,
  setFacilityContext,
  getFacilityContext,
};

export default api;
