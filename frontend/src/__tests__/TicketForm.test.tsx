import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketForm from '@/components/TicketForm';

const mockCategories = [
  { id: 1, name: 'Bug Report' },
  { id: 2, name: 'Feature Request' },
  { id: 3, name: 'General Inquiry' },
];

const mockOnSubmit = jest.fn();

describe('TicketForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with all fields', () => {
    render(
      <TicketForm
        categories={mockCategories}
        isLoading={false}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit ticket/i })).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = render(
      <TicketForm
        categories={mockCategories}
        isLoading={true}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('displays validation errors for empty required fields on submit', async () => {
    render(
      <TicketForm
        categories={mockCategories}
        isLoading={false}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows character count for description', () => {
    render(
      <TicketForm
        categories={mockCategories}
        isLoading={false}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    expect(screen.getByText(/0\/5000/)).toBeInTheDocument();
  });

  it('disables form while submitting', async () => {
    render(
      <TicketForm
        categories={mockCategories}
        isLoading={false}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button');

    expect(titleInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/submitting/i);
  });

  it('validates email format on submission', async () => {
    const user = userEvent.setup();

    render(
      <TicketForm
        categories={mockCategories}
        isLoading={false}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    await user.type(screen.getByLabelText(/title/i), 'Test Title');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Bug Report');
    await user.type(screen.getByLabelText(/description/i), 'Test Description');
    await user.type(screen.getByLabelText(/contact email/i), 'invalid-email');

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(
      <TicketForm
        categories={mockCategories}
        isLoading={false}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    await user.type(screen.getByLabelText(/title/i), 'Test Ticket');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Bug Report');
    await user.type(screen.getByLabelText(/description/i), 'This is a test ticket description');

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Test Ticket',
        description: 'This is a test ticket description',
        category: 'Bug Report',
        contact_email: undefined,
      });
    });
  });

  it('shows error message when provided', () => {
    render(
      <TicketForm
        categories={mockCategories}
        isLoading={false}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        errorMessage="Failed to submit ticket"
      />
    );

    expect(screen.getByText('Failed to submit ticket')).toBeInTheDocument();
  });

  it('renders all category options', () => {
    render(
      <TicketForm
        categories={mockCategories}
        isLoading={false}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    const select = screen.getByLabelText(/category/i);
    const options = select.querySelectorAll('option');

    // +1 for the placeholder option
    expect(options).toHaveLength(mockCategories.length + 1);
    expect(options[1]).toHaveValue('Bug Report');
    expect(options[2]).toHaveValue('Feature Request');
  });
});
