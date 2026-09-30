const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.data = data; // lets callers check things like `err.data.private`
    throw err;
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/auth/me", { token }),
  getCards: (token) => request("/cards", { token }),
  createCard: (payload, token) => request("/cards", { method: "POST", body: payload, token }),
  updateCard: (id, payload, token) => request(`/cards/${id}`, { method: "PUT", body: payload, token }),
  deleteCard: (id, token) => request(`/cards/${id}`, { method: "DELETE", token }),

  startMpesaUpgrade: (phone, token) => request("/payments/mpesa/stkpush", { method: "POST", body: { phone }, token }),
  getMpesaStatus: (checkoutRequestID, token) => request(`/payments/mpesa/status/${checkoutRequestID}`, { token }),

  // Public routes — no token required, though an optional one is sent when the
  // visitor happens to be logged in (needed for the invite-by-email access check)
  getPublicCard: (slug, { code, link, token } = {}) => {
    const params = new URLSearchParams();
    if (code) params.set("code", code);
    if (link) params.set("link", link);
    const qs = params.toString() ? `?${params}` : "";
    return request(`/cards/public/${slug}${qs}`, { token });
  },
  submitLead: (slug, payload) => request(`/cards/public/${slug}/lead`, { method: "POST", body: payload }),

  // File uploads use FormData, not JSON, so this bypasses the request() helper above
  uploadFile: async (file, type, token) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Upload failed.");
    return data; // { url, type: "image" | "video" }
  },
};

// Frontend cards use `id`, `photo`, `banner`, `pdf`, `leads`.
// The backend's Card model uses `_id`, `photoUrl`, `bannerUrl`, `pdfUrl`, `leadCount`.
// These two convert between the shapes at the API boundary.
export function toServerPayload(card) {
  const { id, photo, banner, pdf, leads, views, status, ...rest } = card;
  return {
    ...rest,
    photoUrl: photo || undefined,
    bannerUrl: banner || undefined,
    pdfUrl: pdf || undefined,
    status,
    slug: card.slug,
  };
}

export function fromServerCard(card) {
  return {
    ...card,
    id: card._id,
    photo: card.photoUrl || null,
    banner: card.bannerUrl || null,
    pdf: card.pdfUrl || null,
    leads: card.leadCount || 0,
    views: card.views || 0,
  };
}
