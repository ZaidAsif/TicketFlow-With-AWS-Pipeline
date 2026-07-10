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

export interface TicketStats {
  total: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  category: string;
  contact_email?: string;
}

export interface UpdateTicketInput {
  status: 'open' | 'in_progress' | 'resolved';
}
