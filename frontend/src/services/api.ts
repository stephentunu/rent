const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken(): string | null { return localStorage.getItem("auth_token"); }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface AuthUser {
  id: string; email: string; full_name: string | null; phone: string | null;
  avatar_url: string | null; company: string | null; bio: string | null;
  website: string | null; is_agent: boolean; is_verified: boolean; role: string;
}
export interface AuthResponse { token: string; user: AuthUser; }

export const authApi = {
  signUp: (email: string, password: string, full_name?: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, full_name }) }),
  signIn: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<AuthUser>("/auth/me"),
  updateProfile: (updates: Partial<AuthUser>) =>
    request<AuthUser>("/auth/profile", { method: "PUT", body: JSON.stringify(updates) }),
  changePassword: (current_password: string, new_password: string) =>
    request<any>("/auth/change-password", { method: "PUT", body: JSON.stringify({ current_password, new_password }) }),
  forgotPassword: (email: string) =>
    request<any>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, new_password: string) =>
    request<any>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password }) }),
};

export interface PropertyFilters {
  listingType?: "sale" | "rent"; categoryId?: string; locationId?: string;
  isFeatured?: boolean; isNewProject?: boolean; limit?: number;
}
export const propertiesApi = {
  list: (filters?: PropertyFilters) => {
    const p = new URLSearchParams();
    if (filters?.listingType) p.set("listing_type", filters.listingType);
    if (filters?.categoryId) p.set("category_id", filters.categoryId);
    if (filters?.locationId) p.set("location_id", filters.locationId);
    if (filters?.isFeatured) p.set("is_featured", "true");
    if (filters?.isNewProject) p.set("is_new_project", "true");
    if (filters?.limit) p.set("limit", String(filters.limit));
    return request<any[]>(`/properties?${p}`);
  },
  byIds: (ids: string[]) => request<any[]>(`/properties?ids=${ids.join(",")}`),
  get: (id: string) => request<any>(`/properties/${id}`),
  create: (data: any) => request<any>("/properties", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/properties/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/properties/${id}`, { method: "DELETE" }),
  myListings: () => request<any[]>("/properties/mine"),
  approve: (id: string) => request<any>(`/properties/${id}/approve`, { method: "PUT" }),
  toggleFeatured: (id: string, is_featured: boolean) =>
    request<any>(`/properties/${id}/featured`, { method: "PUT", body: JSON.stringify({ is_featured }) }),
  analytics: (id: string) => request<any>(`/properties/${id}/analytics`),
  getReviews: (id: string) => request<any[]>(`/properties/${id}/reviews`),
  addReview: (id: string, rating: number, comment?: string) =>
    request<any>(`/properties/${id}/reviews`, { method: "POST", body: JSON.stringify({ rating, comment }) }),
};

export const categoriesApi = { list: () => request<any[]>("/categories") };
export const locationsApi  = { list: () => request<any[]>("/locations") };

export const agentsApi = {
  list: () => request<any[]>("/agents"),
  get: (id: string) => request<any>(`/agents/${id}`),
  verify: (id: string, is_verified: boolean) =>
    request<any>(`/admin/agents/${id}/verify`, { method: "PUT", body: JSON.stringify({ is_verified }) }),
  addReview: (id: string, rating: number, comment?: string) =>
    request<any>(`/agents/${id}/reviews`, { method: "POST", body: JSON.stringify({ rating, comment }) }),
};

export const statsApi = { get: () => request<{ properties: number; agents: number; locations: number }>("/stats") };

export const favoritesApi = {
  list: () => request<any[]>("/favorites"),
  check: (propertyId: string) => request<{ isFavorited: boolean }>(`/favorites/${propertyId}`),
  add: (propertyId: string) =>
    request<void>("/favorites", { method: "POST", body: JSON.stringify({ property_id: propertyId }) }),
  remove: (propertyId: string) => request<void>(`/favorites/${propertyId}`, { method: "DELETE" }),
};

export const inquiriesApi = {
  create: (data: { property_id: string; name: string; email: string; phone?: string; message: string }) =>
    request<void>("/inquiries", { method: "POST", body: JSON.stringify(data) }),
  list: () => request<any[]>("/inquiries"),
};

export const messagesApi = {
  getConversations: () => request<any[]>("/conversations"),
  getMessages: (id: string) => request<any[]>(`/conversations/${id}/messages`),
  sendMessage: (id: string, content: string) =>
    request<any>(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
  markRead: (id: string) => request<void>(`/conversations/${id}/read`, { method: "PUT" }),
  startConversation: (propertyId: string, ownerId: string) =>
    request<any>("/conversations", { method: "POST", body: JSON.stringify({ property_id: propertyId, owner_id: ownerId }) }),
  unreadCount: () => request<{ count: number }>("/conversations/unread-count"),
};

export const paymentsApi = {
  stkPush: (data: { phone: string; amount: number; propertyId: string; accountReference: string }) =>
    request<{ success: boolean; message?: string }>("/payments/mpesa/stk-push", { method: "POST", body: JSON.stringify(data) }),
  list: () => request<any[]>("/payments"),
  subscribe: (plan_id: string, phone: string) =>
    request<any>("/payments/subscribe", { method: "POST", body: JSON.stringify({ plan_id, phone }) }),
};

export const walletApi = {
  get: () => request<any>("/wallet"),
  transactions: () => request<any[]>("/wallet/transactions"),
};

export const notificationsApi = {
  list: () => request<any[]>("/notifications"),
  markRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => request<any>("/notifications/read-all", { method: "PUT" }),
};

export const plansApi = { list: () => request<any[]>("/plans") };

export const savedSearchesApi = {
  list: () => request<any[]>("/saved-searches"),
  save: (name: string, filters: any, notify?: boolean) =>
    request<any>("/saved-searches", { method: "POST", body: JSON.stringify({ name, filters, notify }) }),
  delete: (id: string) => request<void>(`/saved-searches/${id}`, { method: "DELETE" }),
};

export const adminApi = {
  isAdmin: () => request<{ isAdmin: boolean }>("/admin/check"),
  profiles: () => request<any[]>("/admin/profiles"),
  agents: () => request<any[]>("/admin/agents"),
  properties: () => request<any[]>("/admin/properties"),
  payments: () => request<any[]>("/admin/payments"),
  inquiries: () => request<any[]>("/admin/inquiries"),
  userRoles: () => request<any[]>("/admin/user-roles"),
  wallets: () => request<any[]>("/admin/wallets"),
  walletTransactions: () => request<any[]>("/admin/wallet-transactions"),
  commissionConfig: () => request<any[]>("/admin/commission-config"),
};

export const uploadApi = {
  uploadImage: async (file: File): Promise<string> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${BASE_URL}/upload/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url as string;
  },
};
