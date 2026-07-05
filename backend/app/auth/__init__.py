"""Identity Management domain: registration, authentication, session
(access/refresh token) lifecycle, and account lockout. Deliberately
independent of `app.simulation` and `app.ingestion` — no module in this
package is imported by either, matching Founder Specification Principle 4
("Simulation Logic Must Be Independent"): the Simulation Engine must never
depend on whether a user is authenticated.

Pure business/domain logic only (mirrors `app.simulation.engine`'s role) —
audit logging, cookie handling, and the transaction commit boundary are the
API layer's responsibility (`app.api.v1.services.auth_service`), not this
package's, matching the existing project convention where the engine
computes and the API-layer service records/commits.
"""
