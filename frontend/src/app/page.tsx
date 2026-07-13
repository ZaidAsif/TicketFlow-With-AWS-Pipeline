'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { apiGet, apiPost, Category } from '@/lib/api';
import TicketForm from '@/components/TicketForm';
import ConfirmationState from '@/components/ConfirmationState';
import Header from '@/components/Header';

type PageState = 'form' | 'submitting' | 'success' | 'error';

export default function Home() {
  const [pageState, setPageState] = useState<PageState>('form');
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await apiGet<Category[]>('/api/categories');
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(data: {
    title: string;
    description: string;
    category: string;
    contact_email?: string;
  }) {
    setPageState('submitting');
    setErrorMessage('');

    try {
      const res = await apiPost('/api/tickets', data);
      if (res.success && res.data) {
        setSubmittedTicket(res.data);
        setPageState('success');
      } else {
        setErrorMessage(res.error || 'Failed to submit ticket');
        setPageState('error');
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.');
      setPageState('error');
    }
  }

  function handleReset() {
    setPageState('form');
    setSubmittedTicket(null);
    setErrorMessage('');
  }

  return (
    <>
      <Header showAdmin />
      <main className="page-section">
        <div className="container">
          <div className="animate-fade-in container-narrow">
            {pageState === 'success' && submittedTicket ? (
              <ConfirmationState ticket={submittedTicket} onSubmitAnother={handleReset} />
            ) : (
              <>
                <div className="hero">
                  <h1 className="hero-title">Submit a Ticket</h1>
                  <p className="hero-subtitle">
                    Report a bug, request a feature, or send us your feedback. We will surely get back to you in no time.
                  </p>
                </div>

                <div className="card overflow-hidden">
                  <div className="card-body p-2xl">
                    <TicketForm
                      categories={categories}
                      isLoading={isLoading}
                      onSubmit={handleSubmit}
                      isSubmitting={pageState === 'submitting'}
                      errorMessage={errorMessage}
                    />
                  </div>
                </div>

                <div className="text-center mt-2xl">
                  <a
                    href="/admin"
                    className="back-link"
                    style={{ marginBottom: 0 }}
                  >
                    <LayoutDashboard size={16} />
                    Admin Dashboard
                    <ArrowRight size={14} />
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
