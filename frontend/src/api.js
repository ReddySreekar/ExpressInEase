const API_BASE = '/api';

export const CATEGORIES = [
  { key: 'all', emoji: '✨', label: 'All' },
  { key: 'thoughts', emoji: '💭', label: 'Thoughts' },
  { key: 'confessions', emoji: '💬', label: 'Confessions' },
  { key: 'stories', emoji: '📝', label: 'Stories' },
  { key: 'gratitude', emoji: '🙏', label: 'Gratitude' },
  { key: 'rants', emoji: '🔥', label: 'Rants' },
  { key: 'ideas', emoji: '💡', label: 'Ideas' },
  { key: 'feelings', emoji: '🎭', label: 'Feelings' },
  { key: 'latenight', emoji: '🌙', label: 'Late Night' },
];

export const REACTION_EMOJIS = ['❤️', '🤗', '😢', '🔥', '💡', '👏'];

// ─── Helper: get auth headers ─────────────────────────────────
function authHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function getToken() {
  return localStorage.getItem('eie_token');
}

// ─── Auth API ─────────────────────────────────────────────────
export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function registerUser(username, password, referralCode) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, referralCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function getMe(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Auth check failed');
  return res.json();
}

// ─── Posts API ────────────────────────────────────────────────
export async function fetchPosts(category = 'all', page = 1, search = '') {
  let url = `${API_BASE}/posts?page=${page}`;
  if (category && category !== 'all') url += `&category=${category}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  const res = await fetch(url, {
    headers: authHeaders(getToken()),
  });
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export async function createPost(content, category) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: authHeaders(getToken()),
    body: JSON.stringify({ content, category }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create post');
  return data;
}

export async function addReaction(postId, emoji) {
  const res = await fetch(`${API_BASE}/posts/${postId}/react`, {
    method: 'POST',
    headers: authHeaders(getToken()),
    body: JSON.stringify({ emoji }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to react');
  return data;
}

export async function deletePost(postId) {
  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: 'DELETE',
    headers: authHeaders(getToken()),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete post');
  return data;
}

export async function reportPost(postId, reason, details) {
  const res = await fetch(`${API_BASE}/posts/${postId}/report`, {
    method: 'POST',
    headers: authHeaders(getToken()),
    body: JSON.stringify({ reason, details }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to report post');
  return data;
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// ─── Admin API ────────────────────────────────────────────────
export async function adminGetPosts(page = 1) {
  const res = await fetch(`${API_BASE}/admin/posts?page=${page}&limit=20`, {
    headers: authHeaders(getToken()),
  });
  if (!res.ok) throw new Error('Failed to fetch admin posts');
  return res.json();
}

export async function adminGetPostDetail(postId) {
  const res = await fetch(`${API_BASE}/admin/posts/${postId}`, {
    headers: authHeaders(getToken()),
  });
  if (!res.ok) throw new Error('Failed to fetch post detail');
  return res.json();
}

export async function adminGetReports(status = 'all') {
  const res = await fetch(`${API_BASE}/admin/reports?status=${status}`, {
    headers: authHeaders(getToken()),
  });
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function adminReviewReport(reportId, status, adminNotes, shouldDeletePost) {
  const res = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
    method: 'PUT',
    headers: authHeaders(getToken()),
    body: JSON.stringify({ status, adminNotes, deletePost: shouldDeletePost }),
  });
  if (!res.ok) throw new Error('Failed to review report');
  return res.json();
}

export async function adminGetUsers() {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: authHeaders(getToken()),
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}
