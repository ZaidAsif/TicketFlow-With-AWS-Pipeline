-- Seed data for Ticket System
-- Provides initial categories and sample tickets for demo purposes

-- Insert categories
INSERT INTO categories (name) VALUES
  ('Bug Report'),
  ('Feature Request'),
  ('General Inquiry'),
  ('Account Issue'),
  ('Billing')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert sample tickets
INSERT INTO tickets (title, description, category, status, contact_email) VALUES
  ('Login page returns 500 error', 'When trying to log in with valid credentials, the server returns a 500 Internal Server Error. This started happening after the latest deployment.', 'Bug Report', 'open', 'john@example.com'),
  ('Add dark mode support', 'It would be great to have a dark mode option for the dashboard. Many users have requested this feature for better night-time usability.', 'Feature Request', 'in_progress', 'sarah@example.com'),
  ('How to reset my password?', 'I forgot my password and the reset link is not being sent to my email. Can someone help me regain access to my account?', 'Account Issue', 'open', 'mike@example.com'),
  ('Invoice #1234 shows wrong amount', 'The invoice for last month shows a charge of $299 instead of the agreed $199. Please correct this as soon as possible.', 'Billing', 'resolved', 'emma@example.com'),
  ('General feedback about the service', 'Overall I am very happy with the service. The response times have improved significantly this quarter. Keep up the good work!', 'General Inquiry', 'resolved', 'alex@example.com'),
  ('Page load times are very slow', 'The admin dashboard takes over 10 seconds to load. This is affecting our team productivity significantly.', 'Bug Report', 'in_progress', 'tech@example.com'),
  ('Export to CSV feature', 'We need the ability to export ticket data to CSV format for reporting purposes. Excel integration would also be nice.', 'Feature Request', 'open', 'reports@example.com'),
  ('Cannot upload profile picture', 'When I try to upload a profile picture, it says "File too large" even for small images under 1MB.', 'Bug Report', 'open', 'user@example.com');

-- Insert status history for sample tickets
INSERT INTO status_history (ticket_id, old_status, new_status) VALUES
  (1, NULL, 'open'),
  (2, NULL, 'open'),
  (2, 'open', 'in_progress'),
  (3, NULL, 'open'),
  (4, NULL, 'open'),
  (4, 'open', 'in_progress'),
  (4, 'in_progress', 'resolved'),
  (5, NULL, 'open'),
  (5, 'open', 'resolved'),
  (6, NULL, 'open'),
  (6, 'open', 'in_progress'),
  (7, NULL, 'open'),
  (8, NULL, 'open');
