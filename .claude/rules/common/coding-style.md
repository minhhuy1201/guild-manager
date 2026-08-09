# Coding Style

## Immutability (CRITICAL)

ALWAYS new objects, NEVER mutate:

```
// Pseudocode
WRONG:  modify(original, field, value) → changes original in-place
CORRECT: update(original, field, value) → returns new copy with change
```

Why: immutable data kill hidden side effects, easier debug, safe concurrency.

## Core Principles

### KISS (Keep It Simple)

- Simplest solution work
- No premature optimization
- Clarity > cleverness

### DRY (Don't Repeat Yourself)

- Extract repeat logic to shared functions/utilities
- No copy-paste drift
- Abstract when repetition real, not speculative

### YAGNI (You Aren't Gonna Need It)

- No features/abstractions before need
- No speculative generality
- Start simple, refactor when pressure real

## File Organization

MANY SMALL FILES > FEW LARGE FILES:
- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from big modules
- Organize by feature/domain, not type


## Error Handling


ALWAYS handle errors comprehensive:
- Handle explicit at every level
- User-friendly messages in UI code
- Log detail context server-side
- Never silent swallow

## Input Validation

ALWAYS validate at boundaries:
- Validate user input before process
- Use schema-based validation when available
- Fail fast, clear errors
- Never trust external data (API, user input, file content)


- Booleans: prefer `is`, `has`, `should`, or `can` prefixes
- Interfaces, types, and components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Custom hooks: `camelCase` with a `use` prefix

## Code Smells to Avoid

### Deep Nesting

Early returns > nested conditionals once logic stacks.

### Magic Numbers

Named constants for thresholds, delays, limits.

### Long Functions

Split big functions into focused pieces, clear responsibility.

## Code Quality Checklist

Before complete:
- [ ] Readable, well-named
- [ ] Functions small (<50 lines)
- [ ] Files focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No hardcoded values (constants/config)
- [ ] No mutation (immutable patterns)



