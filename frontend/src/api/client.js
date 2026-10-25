export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem('token', token);
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem('token');
    } catch {
      /* storage unavailable */
    }
  },
};

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export function qs(params) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') sp.set(key, value);
  }
  const str = sp.toString();
  return str ? `?${str}` : '';
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get();
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Please try again.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new ApiError(
      res.status,
      data?.error || 'ERROR',
      data?.message || 'Something went wrong',
      data?.details
    );
    if (token && (res.status === 401 || err.code === 'ACCOUNT_BLOCKED')) {
      tokenStore.clear();
      onUnauthorized();
    }
    throw err;
  }
  return data;
}

// превращает details из ответа API в { поле: сообщение }
export function fieldErrors(err) {
  const out = {};
  if (Array.isArray(err?.details)) {
    for (const d of err.details) {
      if (d.field && !out[d.field]) out[d.field] = d.message;
    }
  }
  return out;
}