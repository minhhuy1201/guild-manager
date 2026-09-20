import {
  experimental_evaluate as evaluate,
  type Experimental_EvaluationResult,
} from 'ai';

import type { TriageState } from './collect.ts';
import { TRIAGE_QUESTIONS } from './questions.ts';

/** The model slug on Vercel AI Gateway. Jev returns typed answers only - it generates no text. */
export const JEV_MODEL = 'typesafe-ai/jev';

/** The four answers, typed from `TRIAGE_QUESTIONS` so a new question flows through automatically. */
export type TriageAnswers = Experimental_EvaluationResult<
  typeof TRIAGE_QUESTIONS
>['answers'];

/** What one triage run produced, including what it cost. */
export type TriageResult = {
  answers: TriageAnswers;
  inputTokens: number | undefined;
  cost: string | undefined;
};

/** The evaluation call, injected so tests can drive `runTriage` without reaching the network. */
export type EvaluateFn = (state: TriageState) => Promise<TriageResult>;

/**
 * Opts into per-request Zero Data Retention. Off by default, because AI Gateway only offers it on
 * Pro and Enterprise plans - sending it from a Hobby team is a request the plan cannot serve.
 */
export const ZDR_ENV_VAR = 'CI_TRIAGE_ZERO_DATA_RETENTION';

/**
 * The gateway protections attached to a request. A type alias rather than an interface, so it keeps
 * the implicit index signature that `providerOptions` requires.
 */
type GatewayOptions = {
  only: string[];
  zeroDataRetention?: true;
};

/**
 * Builds the gateway provider options for one request.
 *
 * `only` is free on every plan and is always sent: it stops the gateway routing CI log text to any
 * provider other than TypeSafe AI. `zeroDataRetention` is Pro-and-above, so it is opt-in through
 * {@link ZDR_ENV_VAR} rather than assumed - on a plan that does not offer it, asking anyway turns a
 * clear billing error into an obscure one.
 *
 * Without ZDR, redaction in `redact.ts` is the only thing standing between a CI log and the
 * provider. That is stated here, in `docs/ci-triage.md` and in the spec, rather than left implied.
 *
 * @param env The environment to read the opt-in flag from.
 * @returns The `providerOptions.gateway` object to send.
 */
export function buildGatewayOptions(env: NodeJS.ProcessEnv): GatewayOptions {
  const flag = env[ZDR_ENV_VAR];
  const wantsZdr = flag === '1' || flag?.toLowerCase() === 'true';

  return wantsZdr
    ? { only: ['typesafe-ai'], zeroDataRetention: true }
    : { only: ['typesafe-ai'] };
}

/** Thrown when the gateway answers in a shape this tool cannot read. */
export class MalformedAnswerError extends Error {
  constructor(detail: string) {
    super(`Jev trả về dữ liệu không đúng dạng: ${detail}`);
    this.name = 'MalformedAnswerError';
  }
}

/**
 * Checks that an evaluation response really carries the four answers, in the shapes `render.ts`
 * reads.
 *
 * The AI SDK types this response, but a type is a compile-time claim about a network payload from
 * an API still marked `experimental_`. The repository's rule is to validate at boundaries and
 * trust TypeScript only inside, and this is the boundary. Failing here produces one clear line;
 * failing later produces `Cannot read properties of undefined` from inside a render function.
 *
 * @param answers The `answers` object as returned.
 * @throws MalformedAnswerError When any of the four is missing or of the wrong kind.
 */
export function assertAnswerShape(answers: unknown): void {
  if (typeof answers !== 'object' || answers === null) {
    throw new MalformedAnswerError('answers không phải một object');
  }

  const record = answers as Record<string, { type?: unknown } | undefined>;
  const expected = {
    category: 'choice',
    ownerApp: 'choice',
    rerunLikelyGreen: 'boolean',
    blastRadius: 'score',
  } as const;

  for (const [key, type] of Object.entries(expected)) {
    if (record[key]?.type !== type) {
      throw new MalformedAnswerError(`thiếu ${key} kiểu ${type}`);
    }
  }
}

/** Thrown when the gateway credential is absent. The CLI turns this into one line and exits 0. */
export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'AI_GATEWAY_API_KEY is not set. Export it in your shell (or add it to .env.local) and try again.',
    );
    this.name = 'MissingApiKeyError';
  }
}

/**
 * Asks Jev the four triage questions about one failed CI run.
 *
 * This is the only file that knows the Vercel AI Gateway exists. The API still carries the
 * `experimental_` prefix, so when its shape changes, this is the one place to repair.
 *
 * @param state The redacted, truncated state to evaluate.
 * @param options.fetchAnswers Overrides the network call; tests pass a fixed answer here.
 * @returns The answers exactly as the SDK returns them, plus token usage and gateway cost.
 * @throws MissingApiKeyError When `AI_GATEWAY_API_KEY` is absent and no override was supplied.
 */
export async function runTriage(
  state: TriageState,
  options: { fetchAnswers?: EvaluateFn } = {},
): Promise<TriageResult> {
  const fetchAnswers = options.fetchAnswers ?? callJev;
  return fetchAnswers(state);
}

/**
 * Sends one evaluation request to Jev through the AI Gateway.
 *
 * See {@link buildGatewayOptions} for which protections are sent and why one of them is opt-in.
 *
 * @param state The state to evaluate.
 * @returns The answers, input token count and gateway cost.
 */
async function callJev(state: TriageState): Promise<TriageResult> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new MissingApiKeyError();
  }

  const result = await evaluate({
    model: JEV_MODEL,
    state,
    questions: TRIAGE_QUESTIONS,
    providerOptions: { gateway: buildGatewayOptions(process.env) },
  });

  assertAnswerShape(result.answers);

  return {
    answers: result.answers,
    inputTokens: result.usage.inputTokens,
    cost: readGatewayCost(result.providerMetadata),
  };
}

/**
 * Pulls the billed cost out of the gateway's provider metadata.
 *
 * @param metadata The `providerMetadata` field of an evaluation result.
 * @returns The cost as the gateway reported it, or `undefined` when absent.
 */
function readGatewayCost(metadata: unknown): string | undefined {
  if (typeof metadata !== 'object' || metadata === null) return undefined;

  const gateway = (metadata as Record<string, unknown>)['gateway'];
  if (typeof gateway !== 'object' || gateway === null) return undefined;

  const cost = (gateway as Record<string, unknown>)['cost'];
  return typeof cost === 'string' ? cost : undefined;
}
