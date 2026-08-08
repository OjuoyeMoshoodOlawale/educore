// Express 4 does not catch promise rejections thrown inside async route handlers —
// an unhandled rejection there crashes the whole Node process instead of returning
// a 500 (this is exactly what was causing the server to die on any DB error).
// Wrap every handler with this so errors reach the error-handling middleware in index.js.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
