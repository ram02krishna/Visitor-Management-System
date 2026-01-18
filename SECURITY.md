# Security Policy

## Overview

We take security seriously and appreciate responsible disclosure of vulnerabilities. This document outlines our security practices and how to report vulnerabilities.

## Supported Versions

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.0.x   | :white_check_mark: | Current |
| 0.9.x   | :white_check_mark: | Maintenance |
| < 0.9   | :x:                | Unsupported |

## Security Measures

### Implemented Security Controls

- **Row-Level Security (RLS):** Database-level access control via Supabase
- **Authentication:** Secure email/password and OAuth authentication
- **Input Validation:** Zod schema validation on all user inputs
- **CORS Protection:** Configured Supabase CORS rules
- **Password Security:** Bcrypt hashing via Supabase Auth
- **Environment Variables:** Sensitive data stored in .env files
- **Error Handling:** Comprehensive error boundaries and logging
- **Dependency Scanning:** Regular npm audit checks

### Known Vulnerabilities & Mitigations

#### React Router XSS via Open Redirects (CVE)
- **Status:** Patched in v6.28.0+
- **Mitigation:** Update to React Router >= 6.28.0
- **Impact:** Low for this application due to strict URL validation

#### String Encoding in QR Code Library
- **Status:** Present in html5-qrcode library's innerHTML usage
- **Mitigation:** User-controlled data is properly escaped before rendering
- **Impact:** Minimal due to controlled data sources

## Best Practices

### For Users
1. Always use a strong, unique password
2. Enable two-factor authentication when available
3. Keep your browser and plugins updated
4. Never share your session cookies or tokens
5. Report suspicious activity immediately

### For Developers
1. Follow OWASP Top 10 guidelines
2. Validate and sanitize all user inputs
3. Use parameterized queries (Supabase handles this)
4. Never commit sensitive data to version control
5. Review code changes for security implications
6. Keep dependencies updated regularly

## Reporting a Vulnerability

**Do not create a public issue for security vulnerabilities.**

If you discover a security vulnerability, please follow these steps:

1. **Email:** Send a detailed report to the project maintainers via private communication
   - Include description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)

2. **Timeline:** 
   - Initial response: Within 48 hours
   - Fix development: Typically 2-4 weeks
   - Public disclosure: After patch release

3. **Acknowledgment:** We will credit you in release notes unless you prefer anonymity

## Dependency Management

### Regular Updates
- Dependencies are checked weekly via GitHub's Dependabot
- Critical security patches are applied immediately
- Feature updates are reviewed and tested before merging

### Audit Process
```bash
# Check for vulnerabilities
npm audit

# Install updates
npm update

# Review changes
npm audit --json
```

## Environment Security

### Required Environment Variables
```env
VITE_SUPABASE_URL=<your-url>
VITE_SUPABASE_ANON_KEY=<your-key>
```

### Optional (EmailJS)
```env
VITE_EMAILJS_SERVICE_ID=<service-id>
VITE_EMAILJS_TEMPLATE_ID=<template-id>
VITE_EMAILJS_PUBLIC_KEY=<public-key>
```

**Important:** Never commit `.env` files to version control.

## Security Headers

We recommend configuring these headers in your hosting environment:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline';
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Database Security

### Row-Level Security Policies
- Anonymous users: Create visit requests only
- Authenticated hosts: View/manage own visits
- Guards/Admins: Manage all visits and approvals
- All users: View only role-appropriate data

### Audit Logging
All critical operations are logged in audit_logs table for compliance.

## Compliance

This application implements:
- Data encryption in transit (HTTPS/TLS)
- Password security best practices
- Access control principles
- Audit logging capabilities
- GDPR-friendly practices (user data management)

## Testing Security

Run security checks with:
```bash
# ESLint security checks
npm run lint

# Type checking
npm run type-check

# Dependency audit
npm audit

# Run all validations
npm run validate
```

## Contact

For security concerns:
- **Email:** [Specify a security contact email]
- **GitHub:** [GitHub Issues](https://github.com/ByteOps02/DBMS_Project/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ByteOps02/DBMS_Project/discussions)

---

**Last Updated:** January 2026
**Security Policy Version:** 1.0
