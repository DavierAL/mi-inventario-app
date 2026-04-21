# ADR 002: Local-First Architecture and Synchronization

## Status
Accepted

## Context
The application is used in warehouse environments (Perú) where internet connectivity is often unstable or absent. Users must be able to perform inventory updates and shipping confirmations without interruption.

## Decision
1. **WatermelonDB (SQLite)**: Use WatermelonDB as the primary data source for the UI to ensure 100% offline functionality.
2. **Synchronization Service**: A custom `syncConSupabase` service handles background propagation of changes to Supabase.
3. **Conflict Resolution**: "Timestamp-based merging" (Last Write Wins) is used for operational fields (stock, dates), while "Server Wins" is the default for structural data.
4. **Connectivity Guard**: Sync operations check for network status via `NetInfo` before execution to prevent battery drain and error logs.
5. **Persistent Audit**: Every sync session is recorded in `sync_history` for traceability.

## Consequences
- **Positive**: App is fully functional without internet.
- **Positive**: Data integrity is maintained across devices via Supabase.
- **Neutral**: Requires strict schema management and migrations (v7 -> v8).
