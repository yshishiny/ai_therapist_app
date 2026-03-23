# AI Therapist Migration Plan

This branch introduces a new backend and mobile structure without changing the current backend runtime.

## Goals
- Keep the current backend working.
- Add a modular backend scaffold under `backend/src/`.
- Add a Flutter mobile scaffold under `mobile/`.
- Migrate incrementally from the current monolith.

## Next Moves
1. Extract backend config, routes, schemas, services, and repositories.
2. Build Flutter features for auth, patients, dashboard, sessions, homework, and careplans.
3. Switch runtime entrypoints only after parity is reached.
