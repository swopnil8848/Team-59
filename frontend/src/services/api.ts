// Use Vite's local proxy (/api) in development to bypass CORS, otherwise fallback to the production IP.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "/api" : "http://13.220.64.204/api");

export function getAuthToken(): string | null {
  return localStorage.getItem("mindtrail:token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("mindtrail:token", token);
}

export function clearAuthToken(): void {
  localStorage.removeItem("mindtrail:token");
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "An API error occurred");
  }

  return data;
}

export const ApiService = {
  async register(email: string, password: string) {
    return apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async login(email: string, password: string) {
    return apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe() {
    return apiFetch("/users/me", {
      method: "GET",
    });
  },

  async updateMe(profileData: any) {
    return apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify(profileData),
    });
  },
};
