/**
 * Standardized ticket categories for consistent use across the application
 */
exports.TICKET_CATEGORIES = [
  { value: 'Technical Issue', label: 'Technical Issue' },
  { value: 'Account Issue', label: 'Account Issue' },
  { value: 'Billing Issue', label: 'Billing Issue' },
  { value: 'Feature Request', label: 'Feature Request' },
  { value: 'Bug Report', label: 'Bug Report' },
  { value: 'Other', label: 'Other' }
];

/**
 * Standardized responsible roles
 */
exports.RESPONSIBLE_ROLES = [
  { value: 'support-employee', label: 'Customer Support' },
  { value: 'it-employee', label: 'IT Support' },
  { value: 'employee', label: 'General' }
];

/**
 * Priority levels
 */
exports.PRIORITIES = [
  { value: '', label: 'Not set' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

/**
 * Status options
 */
exports.STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'solved', label: 'Solved' },
  { value: 'closed', label: 'Closed' }
];
