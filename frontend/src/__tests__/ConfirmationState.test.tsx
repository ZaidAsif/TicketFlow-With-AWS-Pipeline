import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationState from '@/components/ConfirmationState';

const mockTicket = {
  id: 42,
  title: 'Test Ticket',
  description: 'Test description',
  category: 'Bug Report',
  status: 'open' as const,
  contact_email: 'test@example.com',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockOnSubmitAnother = jest.fn();

describe('ConfirmationState Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the ticket confirmation with correct details', () => {
    render(
      <ConfirmationState ticket={mockTicket} onSubmitAnother={mockOnSubmitAnother} />
    );

    expect(screen.getByText(/ticket submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/#42/)).toBeInTheDocument();
    expect(screen.getByText(mockTicket.title)).toBeInTheDocument();
    expect(screen.getByText(mockTicket.category)).toBeInTheDocument();
    expect(screen.getByText(/open/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit another ticket/i })).toBeInTheDocument();
  });

  it('calls onSubmitAnother when the button is clicked', () => {
    render(
      <ConfirmationState ticket={mockTicket} onSubmitAnother={mockOnSubmitAnother} />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit another ticket/i }));
    expect(mockOnSubmitAnother).toHaveBeenCalledTimes(1);
  });

  it('displays the correct status badge', () => {
    const resolvedTicket = { ...mockTicket, status: 'resolved' as const };
    render(
      <ConfirmationState ticket={resolvedTicket} onSubmitAnother={mockOnSubmitAnother} />
    );

    expect(screen.getByText(/resolved/i)).toBeInTheDocument();
  });
});
