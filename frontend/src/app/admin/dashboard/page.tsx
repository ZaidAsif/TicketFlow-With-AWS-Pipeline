'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import { apiGet, Ticket, TicketStats, Pagination } from '@/lib/api';
import Header from '@/components/Header';

function getAuth() {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookie = cookies.find(c => c.startsWith('admin_session='));
  if (authCookie) {
    return `Basic ${decodeURIComponent(authCookie.split('=')[1])}`;
  }
  return null;
}

type SortField = 'id' | 'title' | 'status' | 'category' | 'created_at';
type SortDir = 'asc' | 'desc';

const STATUS_COLORS: Record<string, string> = {
  open: 'var(--color-warning)',
  in_progress: 'var(--color-primary)',
  resolved: 'var(--color-success)',
};

function DashboardContent() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const loadData = useCallback(async (auth: string) => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      params.set('sort', `${sortField} ${sortDir}`);
      params.set('page', String(page));
      params.set('limit', '10');

      const [ticketsRes, statsRes] = await Promise.all([
        apiGet<Ticket[]>(`/api/admin/tickets?${params.toString()}`, auth) as Promise<{ success: boolean; data?: Ticket[]; pagination?: Pagination; error?: string }>,
        apiGet<TicketStats>('/api/admin/tickets/stats', auth),
      ]);

      if (ticketsRes.success && ticketsRes.data) {
        setTickets(ticketsRes.data);
        if (ticketsRes.pagination) {
          setPagination(ticketsRes.pagination);
        }
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, sortField, sortDir, page]);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.push('/admin?error=session_expired');
      return;
    }
    loadData(auth);
  }, [router, loadData]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
    setIsLoading(true);
  }

  function handleFilter() {
    setPage(1);
    setIsLoading(true);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setIsLoading(true);
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} className="sort-icon" /> : <ChevronDown size={14} className="sort-icon" />;
  }

  function getStatusLabel(status: string) {
    return status.replace('_', ' ');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getStatusPercent(count: number): number {
    if (!stats || stats.total === 0) return 0;
    return Math.round((count / stats.total) * 100);
  }

  if (isLoading && tickets.length === 0) {
    return (
      <div className="container pt-2xl">
        <div className="skeleton skeleton-h-12 skeleton-w-60 skeleton-mb" />
        <div className="skeleton skeleton-h-20 skeleton-mb" />
        <div className="skeleton skeleton-h-40" />
      </div>
    );
  }

  return (
    <>
      <Header adminView />
      <main className="page-section">
        <div className="container">
          <div className="animate-fade-in">
            <div className="section-header">
              <div>
                <h1 className="section-title">Dashboard</h1>
                <p className="section-subtitle">
                  {stats ? `${stats.total} total ticket${stats.total !== 1 ? 's' : ''}` : 'Loading...'}
                </p>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setPage(1);
                  setIsLoading(true);
                  const auth = getAuth();
                  if (auth) loadData(auth);
                }}
                disabled={isLoading}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* Enhanced Stats Cards */}
            {stats && (
              <div className="stats-grid stagger-children">
                <div className="card">
                  <div className="stat-card">
                    <div className="stat-card-label">
                      <ClipboardList size={14} />
                      Total
                    </div>
                    <div className="stat-card-value" style={{ color: 'var(--color-primary)' }}>
                      {stats.total}
                    </div>
                    <div className="stat-card-bar">
                      <div
                        className="stat-card-bar-fill"
                        style={{ width: '100%', background: 'var(--color-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                {stats.byStatus.map(s => {
                  return (
                    <div className="card" key={s.status}>
                      <div className="stat-card">
                        <div className="stat-card-label">
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: STATUS_COLORS[s.status] || 'var(--color-text-muted)',
                              display: 'inline-block',
                            }}
                          />
                          {getStatusLabel(s.status)}
                        </div>
                        <div className="stat-card-value" style={{ color: STATUS_COLORS[s.status] || 'var(--color-text)' }}>
                          {s.count}
                        </div>
                        <div className="stat-card-bar">
                          <div
                            className="stat-card-bar-fill"
                            style={{
                              width: `${getStatusPercent(s.count)}%`,
                              background: STATUS_COLORS[s.status] || 'var(--color-text-muted)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filters */}
            <div className="filter-bar">
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <select
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Category</label>
                <select
                  className="form-select form-select-sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {stats?.byCategory.map(c => (
                    <option key={c.category} value={c.category}>{c.category}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-sm btn-primary"
                onClick={handleFilter}
                disabled={isLoading}
              >
                <Filter size={14} />
                {isLoading ? 'Filtering...' : 'Apply Filters'}
              </button>
            </div>

            {error && (
              <div className="alert alert-danger mb-xl">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Data Table */}
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-lg">
                  Tickets{' '}
                  {tickets.length > 0 && (
                    <span className="text-muted font-medium">
                      ({pagination ? `${pagination.total}` : tickets.length})
                    </span>
                  )}
                </h2>
              </div>

              {tickets.length === 0 ? (
                <div className="card-body">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <ClipboardList size={48} />
                    </div>
                    <div className="empty-state-title">No tickets found</div>
                    <div className="empty-state-description">
                      {statusFilter || categoryFilter
                        ? 'No tickets match the current filters. Try adjusting your filter criteria.'
                        : 'No tickets have been submitted yet. Tickets will appear here once users submit them.'}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th onClick={() => handleSort('id')} className={sortField === 'id' ? 'sorted' : ''}>
                            ID{getSortIcon('id')}
                          </th>
                          <th onClick={() => handleSort('title')} className={sortField === 'title' ? 'sorted' : ''}>
                            Title{getSortIcon('title')}
                          </th>
                          <th onClick={() => handleSort('status')} className={sortField === 'status' ? 'sorted' : ''}>
                            Status{getSortIcon('status')}
                          </th>
                          <th onClick={() => handleSort('category')} className={sortField === 'category' ? 'sorted' : ''}>
                            Category{getSortIcon('category')}
                          </th>
                          <th onClick={() => handleSort('created_at')} className={sortField === 'created_at' ? 'sorted' : ''}>
                            Date{getSortIcon('created_at')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((ticket) => (
                          <tr
                            key={ticket.id}
                            onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                          >
                            <td>
                              <span className="cell-id">#{ticket.id}</span>
                            </td>
                            <td>
                              <span className="cell-title">{ticket.title}</span>
                            </td>
                            <td>
                              <span className={`status-badge ${ticket.status}`}>
                                {getStatusLabel(ticket.status)}
                              </span>
                            </td>
                            <td>
                              <span className="category-tag">{ticket.category}</span>
                            </td>
                            <td>
                              <span className="cell-date">{formatDate(ticket.created_at)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="pagination">
                      <div className="pagination-info">
                        Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                      </div>
                      <div className="pagination-controls">
                        <button
                          className="pagination-btn"
                          disabled={!pagination.hasPrev}
                          onClick={() => handlePageChange(page - 1)}
                          aria-label="Previous page"
                        >
                          <ChevronLeft size={16} />
                        </button>

                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(p => {
                            return p === 1 || p === pagination.totalPages ||
                              Math.abs(p - page) <= 1;
                          })
                          .map((p, idx, arr) => {
                            const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                            return (
                              <span key={p} className="flex items-center">
                                {showEllipsis && <span className="pagination-btn-dots">...</span>}
                                <button
                                  className={`pagination-btn${p === page ? ' active' : ''}`}
                                  onClick={() => handlePageChange(p)}
                                >
                                  {p}
                                </button>
                              </span>
                            );
                          })}

                        <button
                          className="pagination-btn"
                          disabled={!pagination.hasNext}
                          onClick={() => handlePageChange(page + 1)}
                          aria-label="Next page"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="container pt-2xl"><p>Loading dashboard...</p></div>}>
      <DashboardContent />
    </Suspense>
  );
}
