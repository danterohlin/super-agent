import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),
  ALLOWED_TELEGRAM_USER_ID: z.string().default("6525313647"),
  GITHUB_TOKEN: z.string().min(1),
  SENTRY_AUTH_TOKEN: z.string().min(1),
  SENTRY_ORG_SLUG: z.string().min(1),
  SENTRY_API_BASE: z
    .string()
    .default("https://sentry.io/api/0")
    .transform((u) => u.replace(/\/+$/, "")),
  SENTRY_PROJECT_SLUG: z.string().optional(),
  DATABASE_PATH: z.string().default("./data/bot.sqlite"),
  /** Reserved for Slack/email/Trello monitors; 5 minutes in ms */
  BACKGROUND_POLL_MS: z.coerce.number().default(300_000),
});

export type Config = z.infer<typeof envSchema>;

export function loadEnv(): Config {
  return envSchema.parse(process.env);
}

export function getAllowedTelegramUserId(config: Config): number {
  return Number.parseInt(config.ALLOWED_TELEGRAM_USER_ID, 10);
}
