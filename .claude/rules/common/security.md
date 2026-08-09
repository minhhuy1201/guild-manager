# Security Guidelines

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] User inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection on
- [ ] Auth/authorization verified
- [ ] Rate limit all endpoints
- [ ] Error messages no leak sensitive data

## Secret Management

- NEVER hardcode secrets in source
- ALWAYS use env vars or secret manager
- Check required secrets present at startup
- Rotate any exposed secrets

## Security Response Protocol

Security issue found:
1. STOP now
2. Use **security-reviewer** agent
3. Fix CRITICAL before continue
4. Rotate exposed secrets
5. Scan codebase for similar issues
