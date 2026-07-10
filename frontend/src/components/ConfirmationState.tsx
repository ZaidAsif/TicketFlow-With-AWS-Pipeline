'use client';

import { CheckCircle2, ClipboardList, Mail } from 'lucide-react';
import { Ticket } from '@/lib/api';

interface ConfirmationStateProps {
  ticket: Ticket;
  onSubmitAnother: () => void;
}

export default function ConfirmationState({ ticket, onSubmitAnother }: ConfirmationStateProps) {
  return (
    <div className="text-center animate-slide-up">
      <div className="confirm-check">
        <CheckCircle2 size={32} />
      </div>

      <h1 className="confirm-title">Ticket Submitted!</h1>
      <p className="confirm-subtitle">
        Your ticket has been received. You can reference it by the ID below.
      </p>

      <div className="card" style={{ maxWidth: 400, margin: '0 auto 2rem', textAlign: 'left' }}>
        <div className="card-body">
          <div className="mb-lg">
            <div className="meta-label flex items-center gap-xs">
              <ClipboardList size={14} />
              Ticket ID
            </div>
            <div className="meta-value-lg">#{ticket.id}</div>
          </div>

          <div className="mb-lg">
            <div className="meta-label">Title</div>
            <div className="font-medium">{ticket.title}</div>
          </div>

          <div className="mb-lg">
            <div className="meta-label">Category</div>
            <div>{ticket.category}</div>
          </div>

          {ticket.contact_email && (
            <div className="mb-lg">
              <div className="meta-label flex items-center gap-xs">
                <Mail size={14} />
                Contact Email
              </div>
              <div className="font-medium">{ticket.contact_email}</div>
            </div>
          )}

          <div>
            <div className="meta-label">Status</div>
            <span className={`status-badge ${ticket.status}`}>
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <button onClick={onSubmitAnother} className="btn btn-primary btn-lg">
        <ClipboardList size={18} />
        Submit Another Ticket
      </button>
    </div>
  );
}
