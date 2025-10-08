# Project Rules: Node.js (Express) API

These rules define conventions and best practices for the fast-room-manager-api built with Node.js (Express).

## Tech Stack
- Node.js LTS
- Express.js
- dotenv for environment configuration
- helmet, cors, morgan for security and logging
- MongoDB with Mongoose for data persistence

## Project Structure
```
src/
  index.js            # Server entry
  app.js              # Express app (middlewares, route mounting)
  routes/             # Route definitions
  controllers/        # Request handlers (business logic)
  services/           # Domain services
  models/             # Data models (e.g., ORM/ODM)
  middlewares/        # Custom middlewares (auth, validation, errors)
  config/             # Configuration utilities
  utils/              # Helpers and utilities
```

## Coding Conventions
- Use modern JavaScript (ES2019+) syntax.
- Prefer named exports (module.exports = {...}) for modules that expose multiple functions.
- Keep controllers thin; move complex logic to services.
- Use async/await; avoid mixing callbacks and Promises.
- Validate request payloads (e.g., using Joi or zod) in a validation middleware.
- Centralize error handling via next(err) and the global error handler.
- Use Mongoose schemas with validation; avoid application-level validation duplication.
- Check `mongoose.connection.readyState` for DB-dependent routes (use `dbReady` middleware).

## API Design
- Base path: `/api` (consider versioning: `/api/v1`).
- Use RESTful conventions: nouns for resources, HTTP verbs for actions.
- Consistent JSON responses:
  - Success: `{ data, message? }`
  - Error: `{ error, details? }`
- Return appropriate HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 422, 500).

## Security
- Enable `helmet()` and `cors()` with required origins.
- Never log secrets; keep secrets in `.env`.
- Sanitize and validate inputs.
- Rate limiting should be considered for public endpoints.

## Environment & Config
- Use dotenv and keep `.env` out of version control.
- Provide `.env.example` with required variables.
- Read config via a dedicated module (e.g., `config/env.js`).
- Database connection via `config/db.js` with `MONGO_URI`.

## Logging
- Use `morgan('dev')` in development; consider a structured logger (pino/winston) for production.
- Log errors in the global error handler; include stack traces in non-production environments.

## Testing
- Unit tests for services and controllers.
- Integration tests for routes.
- Prefer `supertest` for HTTP tests.

## Git & CI
- Branch naming: `feat/*`, `fix/*`, `chore/*`, `refactor/*`.
- Commit messages follow Conventional Commits.
- Run tests and lints in CI before merge.

## Performance
- Avoid N+1 queries; use proper data access patterns.
- Cache hot paths where appropriate.

## Error Handling
- Use a reusable `ApiError` class with `statusCode` and `message`.
- Never throw plain strings; always throw `Error` instances.

## Documentation
- Keep README updated with setup, run, and environment variables.
- Document endpoints with examples (consider OpenAPI/Swagger later).