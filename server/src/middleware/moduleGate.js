import { db } from '../config/db.js';

// Gates a whole router behind a developer-activated module — e.g. a school that hasn't had
// "fees" activated from the developer console gets a clear, actionable 403, not a confusing
// empty screen. Developers themselves always pass, so they can activate the module in the
// first place without a chicken-and-egg lockout.
export function requireModule(moduleName) {
  return async (req, res, next) => {
    if (req.user.role === 'developer') return next();

    const setting = await db('school_modules').where({ school_id: req.user.school_id, module: moduleName }).first();
    if (!setting?.is_active) {
      return res.status(403).json({
        success: false,
        message: `The ${moduleName === 'fees' ? 'fees' : 'report card'} module isn't activated for your school yet. Contact your administrator.`
      });
    }
    next();
  };
}
