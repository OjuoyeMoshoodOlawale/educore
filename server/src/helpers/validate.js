// Wraps a zod schema into Express middleware, and formats errors to match
// the API contract from engineering-design.md §2: { success:false, errors:[{field,message}] }
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'form',
        message: issue.message
      }));
      return res.status(422).json({ success: false, errors });
    }
    req.validated = result.data;
    next();
  };
}
