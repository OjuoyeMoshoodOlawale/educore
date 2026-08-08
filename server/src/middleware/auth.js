import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, school_id: user.school_id, role: user.role, staff_id: user.staff_id || null },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: '30d' });
}

// Requires a valid access token. Attaches req.user = { id, school_id, role }.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = { id: payload.sub, school_id: payload.school_id, role: payload.role, staff_id: payload.staff_id };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired, please sign in again' });
  }
}

// Role check — 401 vs 403 kept distinct per engineering-design.md §3.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You don't have access to this" });
    }
    next();
  };
}
