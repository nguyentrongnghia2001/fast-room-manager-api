Middlewares

Purpose
- Hold shared Express middlewares.
- Address cross-cutting concerns: 404, error handling, authentication, DB connectivity checks, rate-limiting, etc.

Current middlewares
- notFound: returns 404 for unmatched routes.
- errorHandler: centralized error handling with consistent JSON responses.
- dbReady: blocks DB-dependent routes if the database is not connected.

Conventions and order
- Security (helmet), CORS, body parser, and logger are attached in app.js before routes.
- notFound is attached after all routes.
- errorHandler is always the final middleware.

Usage example (app.js)
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);