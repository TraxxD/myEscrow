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

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Session expired');
  }

  const data = await res.json();

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

export async function fundEscrow(id) {
  return request(`/escrows/${id}/fund`, { method: 'POST' });
}

export async function deliverEscrow(id, data) {
  return request(`/escrows/${id}/deliver`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
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

// --- Wallet ---
export async function getWalletBalance() {
  return request('/wallet/balance');
}

export async function getWalletTransactions() {
  return request('/wallet/transactions');
}
