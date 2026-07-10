'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Calendar,
  History,
  ArrowRight,
} from 'lucide-react';
import { apiGet, apiPatch, Ticket, StatusHistory } from '@/lib/api';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';

function getAuth() {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookie = cookies.find(c => c.startsWith('admin_session='));
  if (authCookie) {
    return `Basic ${decodeURIComponent(authCookie.split('=')[1])}`;
  }
  return null;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'var(--color-warning)' },
  { value: 'in_progress', label: 'In Progress', color: 'var(--color-primary)' },
  { value: 'resolved', label: 'Resolved', color: 'var(--color-success)' },
];

function TicketDetail() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const ticketId = params.id;

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.push('/admin?error=session_expired');
      return;
    }
    loadTicket(auth);
  }, [ticketId]);

  async function loadTicket(auth: string) {
    try {
      const res = await apiGet<{ ticket: Ticket; history: StatusHistory[] }>(
        `/api/admin/tickets/${ticketId}`,
        auth
      );
      if (res.success && res.data) {
        setTicket(res.data.ticket);
        setHistory(res.data.history);
      } else {
        setError('Ticket not found');
      }
    } catch (err) {
      setError('Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    const auth = getAuth();
    if (!auth || !ticket) return;

    setIsUpdating(true);
    setError('');

    try {
      const res = await apiPatch<{ ticket: Ticket }>(
        `/api/admin/tickets/${ticketId}`,
        { status: newStatus },
        auth
      );

      if (res.success && res.data) {
        setTicket(res.data.ticket);
        showToast(`Status updated to "${newStatus.replace('_', ' ')}"`, 'success');
        await loadTicket(auth);
      } else {
        setError(res.error || 'Failed to update status');
        showToast(res.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      setError('Failed to update ticket status');
      showToast('Failed to update ticket status', 'error');
    } finally {
      setIsUpdating(false);
    }
  }

  function getStatusLabel(status: string) {
    return status.replace('_', ' ');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (isLoading) {
    return (
      <div className="container pt-2xl">
        <div className="skeleton skeleton-w-40" style={{ height: 32, marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 200, marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <>
        <Header adminView />
        <main className="page-section">
          <div className="container">
            <div className="empty-state">
              <div className="empty-state-icon">
                <AlertCircle size={48} />
              </div>
              <div className="empty-state-title">{error}</div>
              <a href="/admin/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Back to Dashboard
              </a>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!ticket) return null;

  return (
    <>
      <Header adminView />
      <main className="page-section">
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="animate-fade-in">
            {/* Back link */}
            <a href="/admin/dashboard" className="back-link">
              <ArrowLeft size={16} />
              Back to Dashboard
            </a>

            {/* Messages */}
            {error && (
              <div className="alert alert-danger mb-lg">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Main Ticket Card */}
            <div className="card mb-xl">
              <div className="card-header flex items-start justify-between flex-wrap gap-lg">
                <div>
                  <div className="flex items-center gap-md mb-md">
                    <span className="text-sm font-bold text-muted">Ticket #{ticket.id}</span>
                    <span className={`status-badge ${ticket.status}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold m-0">{ticket.title}</h1>
                </div>
                <span className="category-tag">{ticket.category}</span>
              </div>

              <div className="card-body">
                <div className="mb-xl">
                  <div className="meta-label">Description</div>
                  <p className="pre-wrap leading-relaxed" style={{ fontSize: '0.9375rem' }}>
                    {ticket.description}
                  </p>
                </div>

                {ticket.contact_email && (
                  <div className="mb-xl">
                    <div className="meta-label flex items-center gap-xs">
                      <Mail size={14} />
                      Contact Email
                    </div>
                    <a href={`mailto:${ticket.contact_email}`} className="meta-value">
                      {ticket.contact_email}
                    </a>
                  </div>
                )}

                <div className="flex gap-2xl text-sm text-muted">
                  <div className="flex items-center gap-xs">
                    <Calendar size={14} />
                    <strong>Created:</strong> {formatDate(ticket.created_at)}
                  </div>
                  <div className="flex items-center gap-xs">
                    <Clock size={14} />
                    <strong>Updated:</strong> {formatDate(ticket.updated_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="card mb-xl">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Update Status</h2>
              </div>
              <div className="card-body">
                <div className="flex flex-wrap gap-md">
                  {STATUS_OPTIONS.map((option) => {
                    const isCurrent = ticket.status === option.value;
                    return (
                      <button
                        key={option.value}
                        className={`btn btn-status${isCurrent ? ' btn-status-active' : ''}`}
                        onClick={() => handleStatusChange(option.value)}
                        disabled={isCurrent || isUpdating}
                        style={{
                          background: isCurrent ? option.color : undefined,
                          color: isCurrent ? 'white' : undefined,
                          border: isCurrent ? 'none' : undefined,
                          opacity: isUpdating ? 0.6 : 1,
                        }}
                      >
                        {isUpdating && !isCurrent ? (
                          <><span className="spinner" /> Updating...</>
                        ) : (
                          <>
                            {option.label}
                            {isCurrent && <CheckCircle2 size={16} />}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold flex items-center gap-sm">
                  <History size={18} />
                  Status History
                </h2>
              </div>
              {history.length === 0 ? (
                <div className="card-body">
                  <div className="empty-state" style={{ padding: '1.5rem' }}>
                    <div className="empty-state-description">No history recorded yet.</div>
                  </div>
                </div>
              ) : (
                <div className="timeline">
                  {history.map((entry, index) => {
                    const dotClass = entry.new_status === 'resolved' ? 'timeline-dot-success' :
                      entry.new_status === 'in_progress' ? 'timeline-dot-primary' : 'timeline-dot-warning';

                    return (
                      <div key={entry.id} className="timeline-item">
                        <div className={`timeline-dot ${dotClass}`}>
                          {history.length - index}
                        </div>
                        <div className="timeline-content">
                          {entry.old_status ? (
                            <span>
                              Changed from{' '}
                              <span className={`status-badge status-badge-sm ${entry.old_status}`}>
                                {getStatusLabel(entry.old_status)}
                              </span>
                              {' '}<ArrowRight size={12} style={{ verticalAlign: 'middle', display: 'inline' }} />{' '}
                              <span className={`status-badge status-badge-sm ${entry.new_status}`}>
                                {getStatusLabel(entry.new_status)}
                              </span>
                            </span>
                          ) : (
                            <span>
                              <span className={`status-badge status-badge-sm ${entry.new_status}`}>
                                {getStatusLabel(entry.new_status)}
                              </span>
                              {' '}created
                            </span>
                          )}
                        </div>
                        <div className="timeline-date">
                          {formatDate(entry.changed_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<div className="container pt-2xl"><p>Loading ticket...</p></div>}>
      <TicketDetail />
    </Suspense>
  );
}
