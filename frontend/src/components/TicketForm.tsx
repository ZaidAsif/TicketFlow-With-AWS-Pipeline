'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { AlertCircle, Send, Mail, FileText, ListChecks } from 'lucide-react';
import { Category } from '@/lib/api';

interface FormData {
  title: string;
  description: string;
  category: string;
  contact_email?: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  contact_email?: string;
}

interface TicketFormProps {
  categories: Category[];
  isLoading: boolean;
  onSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string;
}

export default function TicketForm({
  categories,
  isLoading,
  onSubmit,
  isSubmitting,
  errorMessage,
}: TicketFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    contact_email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 500) {
      newErrors.title = 'Title must be 500 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 5000) {
      newErrors.description = 'Description must be 5000 characters or less';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (formData.contact_email && formData.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contact_email.trim())) {
        newErrors.contact_email = 'Please enter a valid email address';
      }
    }

    return newErrors;
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleBlur(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name } = e.target;
    const fieldErrors = validate();
    if (fieldErrors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: fieldErrors[name as keyof FormErrors] }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await onSubmit({
      ...formData,
      contact_email: formData.contact_email?.trim() || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="p-2xl">
        <div className="skeleton skeleton-h-12 skeleton-mb" />
        <div className="skeleton skeleton-h-12 skeleton-mb" />
        <div className="skeleton skeleton-h-20 skeleton-mb" />
        <div className="skeleton skeleton-h-12 skeleton-mb" />
        <div className="skeleton skeleton-h-12 skeleton-w-25" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <div className="alert alert-danger mb-xl">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title" className="form-label flex items-center gap-sm">
          <FileText size={16} />
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          className="form-input"
          placeholder="Brief summary of your issue"
          value={formData.title}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={500}
          disabled={isSubmitting}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="form-error">{errors.title}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="category" className="form-label flex items-center gap-sm">
          <ListChecks size={16} />
          Category *
        </label>
        <select
          id="category"
          name="category"
          className="form-select"
          value={formData.category}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          aria-invalid={!!errors.category}
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.category && <p className="form-error">{errors.category}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label flex items-center gap-sm">
          <FileText size={16} />
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          className="form-textarea"
          placeholder="Provide as much detail as possible..."
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          maxLength={5000}
          disabled={isSubmitting}
          aria-invalid={!!errors.description}
        />
        <div className="form-hint">
          {errors.description ? (
            <p className="form-error">{errors.description}</p>
          ) : (
            <span />
          )}
          <span className={`char-count${formData.description.length > 4500 ? ' char-count-warn' : ''}`}>
            {formData.description.length}/5000
          </span>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="contact_email" className="form-label flex items-center gap-sm">
          <Mail size={16} />
          Contact Email{' '}
          <span className="form-label-light">(optional)</span>
        </label>
        <input
          type="email"
          id="contact_email"
          name="contact_email"
          className="form-input"
          placeholder="you@example.com"
          value={formData.contact_email}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          aria-invalid={!!errors.contact_email}
        />
        {errors.contact_email && <p className="form-error">{errors.contact_email}</p>}
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg btn-block mt-md"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="spinner" />
            Submitting...
          </>
        ) : (
          <>
            <Send size={18} />
            Submit Ticket
          </>
        )}
      </button>
    </form>
  );
}
