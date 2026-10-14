import axios from "axios";

// Create instance pointing to our self-hosted backend
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

// ==========================================
// API ENDPOINTS HANDLERS
// ==========================================

export const authAPI = {
  register: (data: any) => api.post("/auth/register", data).then((res) => res.data),
  login: (data: any) => api.post("/auth/login", data).then((res) => res.data),
  verify: () => api.get("/auth/verify").then((res) => res.data),
};

export const userAPI = {
  getProfile: () => api.get("/users/profile").then((res) => res.data),
  updateProfile: (data: any) => api.patch("/users/profile", data).then((res) => res.data),
  getById: (id: number) => api.get(`/users/${id}`).then((res) => res.data),
  listAll: (params?: any) => api.get("/users", { params }).then((res) => res.data),
  changePassword: (data: any) => api.put("/users/change-password", data).then((res) => res.data),
  updateProfilePicture: (url: string) => api.put("/users/profile-picture", { url }).then((res) => res.data),
  getCustomerDetails: (id: number) => api.get(`/admin/customers/${id}`).then((res) => res.data),
};

export const ticketAPI = {
  create: (data: any) => api.post("/tickets", data).then((res) => res.data),
  list: (params?: any) => api.get("/tickets", { params }).then((res) => res.data),
  getDetails: (id: number) => api.get(`/tickets/${id}`).then((res) => res.data),
  getMessages: (id: number, params?: any) => api.get(`/tickets/${id}/messages`, { params }).then((res) => res.data),
  update: (id: number, data: any) => api.patch(`/tickets/${id}`, data).then((res) => res.data),
  addReply: (id: number, data: any) => api.post(`/tickets/${id}/reply`, data).then((res) => res.data),
  close: (id: number) => api.post(`/tickets/${id}/close`).then((res) => res.data),
  escalate: (id: number) => api.post(`/tickets/${id}/escalate`).then((res) => res.data),
  assign: (id: number, agentId: number) => api.post(`/tickets/${id}/assign`, { agentId }).then((res) => res.data),
  autoAssign: (id: number) => api.post(`/tickets/${id}/auto-assign`).then((res) => res.data),
};

export const chatAPI = {
  sendMessage: (participantId: number, data: any) => api.post(`/chat/${participantId}/message`, data).then((res) => res.data),
  getHistory: (participantId: number, params?: any) => api.get(`/chat/${participantId}/history`, { params }).then((res) => res.data),
};

export const notificationAPI = {
  list: () => api.get("/notifications").then((res) => res.data),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`).then((res) => res.data),
  delete: (id: number) => api.delete(`/notifications/${id}`).then((res) => res.data),
};

export const kbAPI = {
  list: (params?: any) => api.get("/kb", { params }).then((res) => res.data),
  getDetails: (id: number) => api.get(`/kb/${id}`).then((res) => res.data),
  create: (data: any) => api.post("/kb", data).then((res) => res.data),
  update: (id: number, data: any) => api.put(`/kb/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/kb/${id}`).then((res) => res.data),
};

export const aiAPI = {
  analyzeTicket: (data: { subject: string; description: string }) => api.post("/ai/analyze-ticket", data).then((res) => res.data),
  suggestReply: (data: any) => api.post("/ai/suggest-reply", data).then((res) => res.data),
  draftKb: (data: { title: string; problemDescription?: string; keywords?: string }) => api.post("/ai/draft-kb", data).then((res) => res.data),
};

export const agentAPI = {
  list: () => api.get("/agents").then((res) => res.data),
  getDetails: (id: number) => api.get(`/agents/${id}`).then((res) => res.data),
  updateAvailability: (id: number, isAvailable: boolean) => api.patch(`/agents/${id}`, { isAvailable }).then((res) => res.data),
  getAvailableTickets: () => api.get("/agents/available-tickets").then((res) => res.data),
  acceptTicket: (ticketId: number) => api.post(`/agents/tickets/${ticketId}/accept`).then((res) => res.data),
  getMyTickets: () => api.get("/agents/my-tickets").then((res) => res.data),
};

export const uploadAPI = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/cloudinary", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }).then((res) => res.data);
  },
};
