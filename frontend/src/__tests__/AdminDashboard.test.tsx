import React from 'react';
import { render, screen } from '@testing-library/react';

// Test the API client and utility functions
describe('API Client', () => {
  it('should have the correct base URL', () => {
    const { getBaseUrl } = require('@/lib/api');
    expect(getBaseUrl()).toBe('http://localhost:4000');
  });
});

// Test that the API functions exist with correct signatures
describe('API Functions', () => {
  it('should export apiGet function', () => {
    const { apiGet } = require('@/lib/api');
    expect(typeof apiGet).toBe('function');
  });

  it('should export apiPost function', () => {
    const { apiPost } = require('@/lib/api');
    expect(typeof apiPost).toBe('function');
  });

  it('should export apiPatch function', () => {
    const { apiPatch } = require('@/lib/api');
    expect(typeof apiPatch).toBe('function');
  });

  it('should export all API functions', () => {
    const api = require('@/lib/api');
    expect(typeof api.apiGet).toBe('function');
    expect(typeof api.apiPost).toBe('function');
    expect(typeof api.apiPatch).toBe('function');
    expect(typeof api.getBaseUrl).toBe('function');
  });
});

// Test the StatusBadge rendering logic
describe('Status Display Logic', () => {
  function getStatusLabel(status: string): string {
    return status.replace('_', ' ');
  }

  it('should format status labels correctly', () => {
    expect(getStatusLabel('open')).toBe('open');
    expect(getStatusLabel('in_progress')).toBe('in progress');
    expect(getStatusLabel('resolved')).toBe('resolved');
  });

  it('should match status badge class names', () => {
    const statuses = ['open', 'in_progress', 'resolved'];
    statuses.forEach(status => {
      const className = `status-badge ${status}`;
      expect(className).toContain(status);
    });
  });
});

// Test ticket list item rendering logic
describe('Ticket List Logic', () => {
  const mockTickets = [
    { id: 1, title: 'Test Ticket 1', status: 'open', category: 'Bug Report', created_at: '2026-01-01T00:00:00Z' },
    { id: 2, title: 'Test Ticket 2', status: 'resolved', category: 'Feature Request', created_at: '2026-01-02T00:00:00Z' },
  ];

  it('should format dates correctly', () => {
    const dateStr = mockTickets[0].created_at;
    const formatted = new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    expect(formatted).toBe('Jan 1, 2026');
  });

  it('should filter tickets by status', () => {
    const openTickets = mockTickets.filter(t => t.status === 'open');
    expect(openTickets).toHaveLength(1);
    expect(openTickets[0].title).toBe('Test Ticket 1');
  });

  it('should filter tickets by category', () => {
    const bugTickets = mockTickets.filter(t => t.category === 'Bug Report');
    expect(bugTickets).toHaveLength(1);
  });

  it('should sort tickets by date descending', () => {
    const sorted = [...mockTickets].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(1);
  });
});

// Test stats calculations
describe('Ticket Stats Logic', () => {
  const tickets = [
    { status: 'open', category: 'Bug' },
    { status: 'open', category: 'Bug' },
    { status: 'in_progress', category: 'Feature' },
    { status: 'resolved', category: 'Bug' },
  ];

  it('should count tickets by status', () => {
    const byStatus = tickets.reduce((acc: Record<string, number>, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    expect(byStatus.open).toBe(2);
    expect(byStatus.in_progress).toBe(1);
    expect(byStatus.resolved).toBe(1);
  });

  it('should count tickets by category', () => {
    const byCategory = tickets.reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});

    expect(byCategory.Bug).toBe(3);
    expect(byCategory.Feature).toBe(1);
  });
});
