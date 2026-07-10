const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();
  return data;
}

export function getBaseUrl() {
  return API_URL;
}

export function apiGet<T>(path: string, auth?: string) {
  return request<T>(path, {
    method: 'GET',
    ...(auth ? { headers: { Authorization: auth } } : {}),
  });
}

export function apiPost<T>(path: string, body: any, auth?: string) {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...(auth ? { headers: { Authorization: auth } } : {}),
  });
}

export function apiPatch<T>(path: string, body: any, auth: string) {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      Authorization: auth,
    },
  });
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketStats {
  total: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

export interface Category {
  id: number;
  name: string;
}

export interface StatusHistory {
  id: number;
  ticket_id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: Pagination;
}
