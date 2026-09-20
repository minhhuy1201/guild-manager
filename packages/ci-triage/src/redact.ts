/**
 * Strips secret-shaped substrings out of CI log text before it is sent to an external model.
 *
 * This is **best effort, not a guarantee**. It recognises the secret shapes this repository is
 * known to produce - the variables in `.env.example`, Postgres connection strings, JWTs, bearer
 * headers - and a generic "long opaque value" pattern for the rest. A secret printed in a shape
 * none of those match will pass through. GitHub Actions already masks its own configured secrets
 * as `***`, so this covers the gap: values that were never registered as secrets, such as a
 * `DATABASE_URL` echoed by a Prisma command.
 *
 * It errs towards leaving text alone. Over-redacting would remove the very signal the evaluation
 * needs - assertion diffs, rule names, stack frames - so the patterns are narrow on purpose.
 *
 * @param text Raw log text, of any length.
 * @returns The same text with every recognised secret replaced by `[redacted]`.
 */
export function redact(text: string): string {
  let out = text;
  for (const { pattern, replacement } of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

const PLACEHOLDER = '[redacted]';

/**
 * Variable names whose value is always secret, beyond the generic `*_TOKEN` / `*_SECRET` /
 * `*_KEY` / `*_PASSWORD` suffixes. `DATABASE_URL` and `DIRECT_URL` carry a password inside a URL,
 * and the `DISCORD_` prefix covers the bot token and the application secret together.
 */
const SENSITIVE_KEY =
  /\b([A-Z][A-Z0-9_]*(?:_TOKEN|_SECRET|_KEY|_PASSWORD)|DATABASE_URL|DIRECT_URL|DISCORD_[A-Z0-9_]+)(\s*[=:]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s"'\n]+)/g;

const PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Named secrets first: `DATABASE_URL=postgres://…` is caught here as a whole, so the connection
  // string rule below never has to re-examine it.
  { pattern: SENSITIVE_KEY, replacement: `$1$2${PLACEHOLDER}` },

  // Database connection strings anywhere in a line, including inside prose.
  {
    pattern:
      /\b(?:postgres|postgresql|mysql|mongodb)(?:\+srv)?:\/\/[^\s"'\n]+/g,
    replacement: PLACEHOLDER,
  },

  // A JWT: three base64url segments, the first always starting with the encoded `{"alg"`.
  {
    pattern: /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g,
    replacement: PLACEHOLDER,
  },

  // An Authorization header echoed into the log.
  {
    pattern: /\b([Bb]earer\s+)[A-Za-z0-9._~+/=-]{8,}/g,
    replacement: `$1${PLACEHOLDER}`,
  },

  // Anything else that looks like an opaque credential: 32+ characters of pure token alphabet
  // assigned to something. Long enough that assertion text, file paths and stack frames - which
  // all contain spaces, dots or slashes - cannot match.
  {
    pattern: /([=:]\s*)[A-Za-z0-9_-]{32,}\b/g,
    replacement: `$1${PLACEHOLDER}`,
  },
];
