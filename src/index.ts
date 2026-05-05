import fs from "node:fs";
import path from "node:path";
import { Bot, GrammyError, HttpError } from "grammy";
import { Octokit } from "@octokit/rest";
import { config as loadDotenv } from "dotenv";
import { loadEnv, getAllowedTelegramUserId } from "./config.js";
import { openDb } from "./db.js";
import { runAssistantTurn } from "./agent.js";
import { GitHubService } from "./githubService.js";
import { SentryService } from "./sentryService.js";

loadDotenv();

const TELEGRAM_CHUNK = 4000;

function chunkText(text: string, maxLen: number): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxLen) {
      if (current) chunks.push(current);
      if (line.length > maxLen) {
        for (let i = 0; i < line.length; i += maxLen) {
          chunks.push(line.slice(i, i + maxLen));
        }
        current = "";
      } else {
        current = line;
      }
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [""];
}

async function main(): Promise<void> {
  const config = loadEnv();
  const allowed = getAllowedTelegramUserId(config);

  const dbDir = path.dirname(path.resolve(config.DATABASE_PATH));
  fs.mkdirSync(dbDir, { recursive: true });
  const db = openDb(config);

  const github = new GitHubService(new Octokit({ auth: config.GITHUB_TOKEN }));
  const sentry = new SentryService(config, config.SENTRY_AUTH_TOKEN);

  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  bot.use(async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid === undefined) return;
    if (uid !== allowed) {
      await ctx.reply("Unauthorized.");
      return;
    }
    return next();
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text?.trim() ?? "";
    if (!text) return;
    await ctx.replyWithChatAction("typing");
    const chatId = ctx.chat.id;
    try {
      const reply = await runAssistantTurn({
        config,
        db,
        chatId,
        userText: text,
        github,
        sentry,
      });
      const parts = chunkText(reply, TELEGRAM_CHUNK);
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) await ctx.replyWithChatAction("typing");
        await ctx.reply(parts[i]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.reply(`Error: ${msg.slice(0, 3500)}`);
    }
  });

  bot.catch((err) => {
    console.error("Bot error:", err.error);
    if (err.error instanceof GrammyError) {
      console.error("Grammy description:", err.error.description);
    } else if (err.error instanceof HttpError) {
      console.error("HTTP error:", err.error);
    }
  });

  setInterval(() => {
    console.log(
      `[background] tick (${config.BACKGROUND_POLL_MS}ms) — monitors not enabled in V1`,
    );
  }, config.BACKGROUND_POLL_MS);

  await bot.start({ onStart: (info) => console.log(`Listening as @${info.username}`) });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
