const API_BASE = '/api';

// --- Token management ---
export function getToken() {
  return localStorage.getItem('escrow_token');
}

export function setToken(token) {
  localStorage.setItem('escrow_token', token);
}

export function clearToken() {
  localStorage.removeItem('escrow_token');
}

// --- Core fetch wrapper ---
async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Cannot connect to server. Make sure the backend is running.');
  }

  if (res.status === 401 && !path.startsWith('/auth/')) {
    clearToken();
    window.location.reload();
    throw new Error('Session expired');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error (${res.status}). Please try again.`);
  }

  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.code = data?.error?.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

// --- Auth ---
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function register(username, email, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  setToken(data.token);
  return data;
}

export async function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, password) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

// --- Escrows ---
export async function getEscrows(filters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.role) params.set('role', filters.role);
  const qs = params.toString();
  return request(`/escrows${qs ? `?${qs}` : ''}`);
}

export async function getEscrow(id) {
  return request(`/escrows/${id}`);
}

export async function createEscrow(data) {
  return request('/escrows', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function agreeEscrow(id) {
  return request(`/escrows/${id}/agree`, { method: 'POST' });
}

export async function fundEscrow(id) {
  return request(`/escrows/${id}/fund`, { method: 'POST' });
}

export async function shipEscrow(id, data) {
  return request(`/escrows/${id}/ship`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deliverEscrow(id, data) {
  return request(`/escrows/${id}/deliver`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function receiveEscrow(id) {
  return request(`/escrows/${id}/receive`, { method: 'POST' });
}

export async function acceptEscrow(id) {
  return request(`/escrows/${id}/accept`, { method: 'POST' });
}

export async function rejectEscrow(id, data) {
  return request(`/escrows/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function returnShipEscrow(id, data) {
  return request(`/escrows/${id}/return-ship`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refundEscrow(id) {
  return request(`/escrows/${id}/refund`, { method: 'POST' });
}

export async function releaseEscrow(id) {
  return request(`/escrows/${id}/release`, { method: 'POST' });
}

export async function disputeEscrow(id, data) {
  return request(`/escrows/${id}/dispute`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function resolveEscrow(id, data) {
  return request(`/escrows/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Messages ---
export async function getMessages(escrowId) {
  return request(`/escrows/${escrowId}/messages`);
}

export async function sendMessage(escrowId, body) {
  return request(`/escrows/${escrowId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

// --- Wallet ---
export async function getWalletBalance() {
  return request('/wallet/balance');
}

export async function getWalletTransactions() {
  return request('/wallet/transactions');
}

export async function getEscrowBalance(escrowId) {
  return request(`/wallet/escrow-balance/${escrowId}`);
}

// --- Admin ---
export async function getAdminStats() {
  return request('/admin/stats');
}

export async function getAdminDisputes() {
  return request('/admin/disputes');
}

export async function getAdminUsers(page = 1) {
  return request(`/admin/users?page=${page}`);
}

export async function changeUserRole(userId, role) {
  return request(`/admin/users/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export async function resolveDispute(escrowId, data) {
  return request(`/admin/disputes/${escrowId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAdminFees() {
  return request('/admin/fees');
}

export async function getAdminAuditLog(limit = 50, offset = 0) {
  return request(`/admin/audit-log?limit=${limit}&offset=${offset}`);
}

export async function getAdminEscrows(page = 1, status = '') {
  const params = new URLSearchParams({ page });
  if (status) params.set('status', status);
  return request(`/admin/escrows?${params}`);
}
