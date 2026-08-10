import { db } from '../config/db.js';

// The full set of capabilities an admin can override per user, shown in the settings matrix.
// Each entry's `roles` is the base-role default — an override replaces that default for one user,
// it never changes what the role itself can do for everyone else.
export const PERMISSION_CATALOG = [
  { resource: 'fees.record_payment', label: 'Record a payment', defaultRoles: ['admin', 'developer', 'bursar'] },
  { resource: 'fees.manage_structure', label: 'Edit fee structure', defaultRoles: ['admin', 'developer', 'bursar'] },
  { resource: 'students.edit', label: 'Edit student records', defaultRoles: ['admin', 'developer', 'bursar'] },
  { resource: 'staff.edit', label: 'Edit staff records', defaultRoles: ['admin', 'developer'] },
  { resource: 'results.publish', label: 'Publish results', defaultRoles: ['admin', 'developer', 'principal'] }
];

// Deny always wins over allow, and either always wins over the role default — an explicit
// decision about one person takes precedence over the general rule for their role.
export function requirePermission(resource) {
  const catalogEntry = PERMISSION_CATALOG.find((p) => p.resource === resource);
  const defaultRoles = catalogEntry?.defaultRoles || [];

  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (req.user.role === 'developer') return next(); // developer always bypasses, same as module gating

    const override = await db('permission_overrides').where({ user_id: req.user.id, resource }).first();
    if (override?.effect === 'deny') {
      return res.status(403).json({ success: false, message: "You don't have access to this" });
    }
    if (override?.effect === 'allow') return next();

    if (!defaultRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You don't have access to this" });
    }
    next();
  };
}
