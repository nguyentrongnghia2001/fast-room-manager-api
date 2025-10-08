Utils

Purpose
- Hold shared, pure, and reusable helper functions.

Conventions
- Avoid direct dependencies on Express or Mongoose (if needed, create dedicated helpers, e.g., utils/mongoose.js).
- Minimize side effects; functions should accept inputs and return new results.
- Clear naming: format*, parse*, build*, calc*.

Examples
- formatDate(date): returns a string in ISO format.
- buildPagination({ page, limit }): normalizes pagination parameters.

Skeleton
function buildPagination({ page = 1, limit = 20 }) {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { skip: (p - 1) * l, limit: l };
}

module.exports = { buildPagination };