# Security Policy - Mascotify

## Credential Management
All sensitive credentials (API keys, secrets) must be stored in environment variables. 
- **NEVER** commit `.env` files to the repository.
- Use `.env.example` as a template for local development.
- In production/CI, use GitHub Secrets or environment-specific secret managers.

## Credential Rotation Schedule
To minimize the impact of potential leaks, credentials should be rotated:
- **Supabase Anon Key**: Every 180 days (if possible without breaking clients).
- **Service Role Keys**: Immediately if suspected of exposure.

## Vulnerability Disclosure
If you discover a security vulnerability, please report it privately to the maintainers at security@mascotify.pe. Do not open public issues for security vulnerabilities.

## Best Practices
- Use Row Level Security (RLS) in Supabase.
- Sanitize all user input before processing.
- Avoid HTML injection in PDF generation by sanitizing strings.
- Use `EXPO_PUBLIC_` prefix ONLY for variables that are safe to be bundled in the mobile app.
