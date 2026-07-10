'use client';

import { LayoutDashboard, Send, LogOut } from 'lucide-react';

interface HeaderProps {
  showAdmin?: boolean;
  adminView?: boolean;
}

export default function Header({ showAdmin, adminView }: HeaderProps) {
  return (
    <header className="header">
      <div className="container">
        <div className="header-inner">
          <a href={adminView ? '/admin' : '/'} className="header-logo">
            <span className="header-logo-icon">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5v2" /><path d="M15 11v2" /><path d="M15 17v2" />
                <path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z" />
              </svg>
            </span>
            <span>TicketFlow</span>
          </a>
          <nav className="header-nav">
            {adminView ? (
              <>
                <a href="/admin/dashboard" className="btn btn-sm btn-ghost">
                  <LayoutDashboard size={16} />
                  Dashboard
                </a>
                <a href="/" className="btn btn-sm btn-ghost">
                  <Send size={16} />
                  Submit Ticket
                </a>
                <a
                  href="/admin/logout"
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    window.location.href = '/admin';
                  }}
                >
                  <LogOut size={16} />
                  Logout
                </a>
              </>
            ) : showAdmin ? (
              <a href="/admin" className="btn btn-sm btn-ghost">
                <LayoutDashboard size={16} />
                Admin Login
              </a>
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
}
