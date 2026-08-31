# PR Review Checklist

> Shared checklist for reviewing Pull Requests.
> Tick `[x]` items as you check them. Tag each issue: **🔴 Blocker** (must fix before merge) / **🟡 Nit** (suggestion) / **💬 Question** (needs clarification).

---

## 1. Context & scope
- [ ] PR description is clear: what, why, link to issue/ticket
- [ ] Scope is focused on one purpose; no unrelated changes mixed in
- [ ] Diff matches the description; no stray changes
- [ ] PR is small enough to review effectively

## 2. Correctness — top priority
- [ ] Logic actually solves the stated problem
- [ ] Edge cases handled: null/empty, boundary values, malformed input, race conditions
- [ ] Error handling is complete; no silently swallowed errors
- [ ] No regressions / backward compatibility preserved

## 3. Tests
- [ ] New code / bug fixes have tests
- [ ] Tests cover important branches and edge cases
- [ ] Tests assert behavior, not just run for coverage
- [ ] CI / pipeline is green

## 4. Security
- [ ] User input is validated
- [ ] No hardcoded secrets / API keys / passwords
- [ ] Guards against SQL injection, XSS, SSRF, path traversal
- [ ] Authentication / authorization enforced in the right places
- [ ] Sensitive data is not logged

## 5. Performance
- [ ] No N+1 queries, nested loops, or poor algorithms
- [ ] Database indexes present; pagination for large lists
- [ ] No memory leaks; resources (files, connections) are released

## 6. Quality & maintainability
- [ ] Clear naming; readable code
- [ ] No duplication (DRY); no dead code
- [ ] Follows the codebase conventions
- [ ] No leftover `console.log` / `print` / debug code / stray comments
- [ ] Magic numbers extracted into named constants

## 7. Architecture & design
- [ ] Code lives in the correct layer / module; concerns are separated
- [ ] No unnecessary tight coupling
- [ ] Right level of abstraction; not over-engineered

## 8. Docs & operations
- [ ] Docs / README / comments updated where needed
- [ ] DB migrations are safe (rollback available, no long table locks)
- [ ] Breaking changes are documented
- [ ] New environment variables / config are noted
- [ ] Feature flag used when a gradual rollout is needed

---

## Review conventions
- Read the description & tests **before** reading the code to understand intent.
- Tag every comment by severity:
  - 🔴 **Blocker** — must be fixed before merge
  - 🟡 **Nit** — minor suggestion, author decides
  - 💬 **Question** — needs clarification
- Comments are constructive and include a suggested fix.
- All GitHub comments are written in English.
- Ask yourself: *"If this breaks in production at 2am, would I understand it?"*

---

## Review summary template

```
## Review Summary
- 🔴 Blockers: <n>
- 🟡 Nits: <n>
- Verdict: Approve / Request changes

### Findings
1. 🔴 [file:line] <description> → <suggested fix>
2. 🟡 [file:line] <description>
```
