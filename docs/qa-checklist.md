# QA Checklist - Ticket System

## Before You Start

- [ ] Backend is running (`npm run dev` from `/backend`)
- [ ] Frontend is running (`npm run dev` from `/frontend`)
- [ ] Database is running (Docker MySQL or local instance)
- [ ] Migrations have been run (`npm run migrate`)
- [ ] Seed data has been loaded (`npm run seed`)

---

## 1. Public Ticket Submission Form

### 1.1 Initial State
- [ ] Page loads without errors
- [ ] All form fields are visible: Title, Category, Description, Contact Email
- [ ] Category dropdown shows all seeded categories
- [ ] Submit button is enabled when all fields are empty
- [ ] Character count shows `0/5000` for description

### 1.2 Validation - Empty Fields
- [ ] Submitting with all fields empty shows validation errors for: Title, Category, Description
- [ ] Email field is optional (no error when empty)
- [ ] Each error message is specific and helpful

### 1.3 Validation - Title
- [ ] Title exceeding 500 characters is rejected
- [ ] Whitespace-only title is rejected
- [ ] Single character title is accepted

### 1.4 Validation - Description
- [ ] Description exceeding 5000 characters is rejected
- [ ] Whitespace-only description is rejected
- [ ] Character count updates as user types
- [ ] Character count turns red when approaching limit (>4500)

### 1.5 Validation - Category
- [ ] Submitting without selecting a category shows error
- [ ] All categories from the database are selectable

### 1.6 Validation - Contact Email
- [ ] Invalid email format (e.g., "not-an-email") shows error
- [ ] Missing @ sign shows error
- [ ] Missing domain shows error
- [ ] Valid email (e.g., "user@example.com") is accepted
- [ ] Empty email is accepted (field is optional)

### 1.7 Submission
- [ ] Submitting with valid data shows loading state
- [ ] On success, confirmation screen appears with ticket details
- [ ] Confirmation screen shows: ticket ID, title, category, status
- [ ] "Submit Another Ticket" button returns to form
- [ ] Previous form data is cleared after submission

### 1.8 Error Handling
- [ ] If backend is down, shows network error message
- [ ] If category is deleted between load and submit, shows error

### 1.9 Edge Cases
- [ ] Very long title (500 chars exactly) - should be accepted
- [ ] Very long description (5000 chars exactly) - should be accepted
- [ ] Special characters in title/description: `<script>alert('xss')</script>`, `SQL' injection`, emoji `🚀`
- [ ] Multiple rapid submissions (should be rate limited after 50/15min)
- [ ] Submitting with all fields at maximum length

---

## 2. Admin Login

### 2.1 Login Page
- [ ] `/admin` loads the login page
- [ ] Login form has username and password fields
- [ ] Login page is visually distinct from public page

### 2.2 Authentication
- [ ] Submitting correct credentials (default: admin / admin123) redirects to dashboard
- [ ] Submitting incorrect credentials shows error message
- [ ] Submitting empty fields shows appropriate feedback
- [ ] Login session persists across page reloads (cookie-based)

### 2.3 Logout
- [ ] Logout button in header works
- [ ] After logout, redirects to login page
- [ ] After logout, cannot access `/admin/dashboard` directly (redirected to login)

### 2.4 Session
- [ ] Expired/invalid session redirects to login with "Session expired" message
- [ ] Direct access to `/admin/dashboard` without login redirects to login

---

## 3. Admin Dashboard

### 3.1 Stats Cards
- [ ] Dashboard shows total ticket count
- [ ] Dashboard shows count by status (open, in_progress, resolved)
- [ ] Stats update when tickets are added/modified

### 3.2 Ticket List
- [ ] All tickets are displayed in a list
- [ ] Each ticket shows: ID, status badge, category, title, date
- [ ] Tickets are sorted by newest first by default
- [ ] Clicking a ticket navigates to its detail page
- [ ] Hover state is visible on ticket rows

### 3.3 Filtering
- [ ] Status filter dropdown is populated with all statuses
- [ ] Category filter dropdown is populated with all categories
- [ ] "All Statuses" option shows tickets regardless of status
- [ ] "All Categories" option shows tickets regardless of category
- [ ] Applying filters updates the ticket list
- [ ] Combining filters (e.g., status=open + category=Bug Report) works

### 3.4 Empty State
- [ ] Dashboard with no tickets shows empty state message
- [ ] Filtering that returns no results shows appropriate empty state

---

## 4. Ticket Detail View

### 4.1 Viewing a Ticket
- [ ] Ticket detail shows: ID, title, description, category, status, dates
- [ ] Contact email is visible if provided
- [ ] Status history timeline is visible
- [ ] Each history entry shows: step number, old/new status, timestamp

### 4.2 Status Updates
- [ ] Current status button is highlighted and disabled
- [ ] Clicking a different status immediately updates it
- [ ] Loading state is shown during update
- [ ] Success message appears after update
- [ ] Status badge updates to reflect new status
- [ ] History is updated with the new entry
- [ ] "Already in this status" error when clicking current status

### 4.3 Error States
- [ ] Invalid ticket ID shows "Ticket not found"
- [ ] Backend down during status update shows error

---

## 5. Responsive Layout

### 5.1 Desktop (>1024px)
- [ ] Layout uses full width appropriately
- [ ] Stats cards display in a row
- [ ] Ticket list is easy to read

### 5.2 Tablet (768px - 1024px)
- [ ] Layout adjusts to medium screen
- [ ] Stats cards wrap to 2 columns
- [ ] Navigation is accessible

### 5.3 Mobile (<768px)
- [ ] Layout adapts to small screen
- [ ] Form fields are full width
- [ ] Stats cards stack vertically
- [ ] Filters stack vertically
- [ ] Text is readable without zooming
- [ ] Touch targets are appropriately sized

---

## 6. Performance & Reliability

### 6.1 Loading States
- [ ] Form shows skeleton loader while categories load
- [ ] Dashboard shows skeleton loaders while data loads
- [ ] Ticket detail shows skeleton loaders while loading
- [ ] Status update shows loading indicator

### 6.2 Error Recovery
- [ ] Temporary backend outage shows user-friendly error
- [ ] Recovering backend allows normal operation again

---

## 7. Database Verification

### 7.1 Schema
- [ ] `categories` table exists with `id` and `name` columns
- [ ] `tickets` table exists with all required columns
- [ ] `status_history` table exists with all required columns
- [ ] Foreign key constraints are enforced

### 7.2 Data Integrity
- [ ] Deleting a category that has tickets is prevented (FK constraint)
- [ ] Deleting a ticket cascades to its status_history entries
- [ ] Ticket status values are limited to: open, in_progress, resolved

---

## 8. Security Checklist

- [ ] Admin routes require authentication via Basic Auth
- [ ] CORS is configured to only allow the frontend origin
- [ ] Rate limiting is applied to ticket submission endpoint
- [ ] Input validation rejects malicious content
- [ ] No sensitive data exposed in API responses
- [ ] No SQL injection vulnerabilities in any query
- [ ] XSS prevention via React's built-in escaping

---

## Test Sign-off

| Test Area | Status (Pass/Fail) | Notes |
|-----------|-------------------|-------|
| Public Form | | |
| Admin Login | | |
| Dashboard | | |
| Ticket Detail | | |
| Responsive | | |
| Performance | | |
| Database | | |
| Security | | |

**Tested by:** _________________ **Date:** _________________
