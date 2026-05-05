import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { Config } from "./config.js";
import type { Database } from "better-sqlite3";
import {
  insertMessage,
  memoryGet,
  memoryListKeys,
  memorySet,
  recentMessages,
} from "./db.js";
import type { GitHubService } from "./githubService.js";
import type { SentryService } from "./sentryService.js";
import { toolDefinitions } from "./toolDefinitions.js";

const SYSTEM_PROMPT = `You are an executive assistant reachable via Telegram. You help Dante with technical and operational questions.

You have tools for GitHub (repos, code search, file reads, issues, pull requests) and Sentry (projects, issues, stack traces via latest event). Use tools proactively to answer questions with facts. When investigating errors, correlate Sentry issues with GitHub code when helpful.

When listing or reading code, respect rate limits: prefer targeted searches and small batches.

For persistent preferences and standing context, use memory_set / memory_get. Keep memory keys short and namespaced (e.g. prefs.timezone).

Be concise in final answers; Telegram readers prefer tight summaries with links when relevant.`;

function parseOwnerRepo(fullName: string): { owner: string; repo: string } | null {
  const parts = fullName.trim().split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], repo: parts[1] };
}

async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: {
    github: GitHubService;
    sentry: SentryService;
    db: Database;
  },
): Promise<unknown> {
  const gh = ctx.github;
  const sentry = ctx.sentry;
  const db = ctx.db;

  switch (name) {
    case "github_list_repos": {
      const page = typeof input.page === "number" ? input.page : 1;
      const perPage = typeof input.per_page === "number" ? input.per_page : 30;
      return gh.listRepos({ page, perPage });
    }
    case "github_get_file": {
      const fullName = String(input.repo_full_name ?? "");
      const pr = parseOwnerRepo(fullName);
      if (!pr) return { error: "repo_full_name must be like owner/repo" };
      return gh.getFile({
        owner: pr.owner,
        repo: pr.repo,
        path: String(input.path ?? ""),
        ref: input.ref ? String(input.ref) : undefined,
      });
    }
    case "github_search_code": {
      return gh.searchCode(String(input.query ?? ""), typeof input.page === "number" ? input.page : 1);
    }
    case "github_list_issues": {
      const pr = parseOwnerRepo(String(input.repo_full_name ?? ""));
      if (!pr) return { error: "repo_full_name must be like owner/repo" };
      return gh.listIssues({
        owner: pr.owner,
        repo: pr.repo,
        state: (input.state as "open" | "closed" | "all") ?? "open",
        perPage: typeof input.per_page === "number" ? input.per_page : 25,
      });
    }
    case "github_list_pull_requests": {
      const pr = parseOwnerRepo(String(input.repo_full_name ?? ""));
      if (!pr) return { error: "repo_full_name must be like owner/repo" };
      const state = input.state === "closed" ? "closed" : "open";
      return gh.listPullRequests({
        owner: pr.owner,
        repo: pr.repo,
        state,
        perPage: typeof input.per_page === "number" ? input.per_page : 25,
      });
    }
    case "github_get_issue": {
      const pr = parseOwnerRepo(String(input.repo_full_name ?? ""));
      if (!pr) return { error: "repo_full_name must be like owner/repo" };
      return gh.getIssue({
        owner: pr.owner,
        repo: pr.repo,
        number: Number(input.number),
      });
    }
    case "github_get_pull_request": {
      const pr = parseOwnerRepo(String(input.repo_full_name ?? ""));
      if (!pr) return { error: "repo_full_name must be like owner/repo" };
      return gh.getPullRequest({
        owner: pr.owner,
        repo: pr.repo,
        number: Number(input.number),
      });
    }
    case "sentry_list_projects":
      return sentry.listProjects();
    case "sentry_list_issues":
      return sentry.listIssues({
        projectSlug: input.project_slug ? String(input.project_slug) : undefined,
        query: input.query ? String(input.query) : undefined,
        statsPeriod: input.stats_period ? String(input.stats_period) : undefined,
        limit: typeof input.limit === "number" ? input.limit : 25,
      });
    case "sentry_issue_details":
      return sentry.issueDetails(String(input.issue_id ?? ""));
    case "sentry_latest_event":
      return sentry.latestEvent(String(input.issue_id ?? ""));
    case "memory_get": {
      const key = String(input.key ?? "");
      const v = memoryGet(db, key);
      return v === null ? { found: false, key } : { found: true, key, value: v };
    }
    case "memory_set": {
      const key = String(input.key ?? "");
      const value = String(input.value ?? "");
      memorySet(db, key, value);
      return { ok: true, key };
    }
    case "memory_list_keys": {
      const prefix = input.prefix ? String(input.prefix) : "";
      return { keys: memoryListKeys(db, prefix) };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function anthropicHistoryFromRows(
  rows: { role: "user" | "assistant"; content: string }[],
): MessageParam[] {
  return rows.map((r) => ({
    role: r.role,
    content: [{ type: "text" as const, text: r.content }],
  }));
}

function extractTextContent(
  content: Anthropic.Messages.Message["content"],
): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("\n").trim();
}

export async function runAssistantTurn(params: {
  config: Config;
  db: Database;
  chatId: number;
  userText: string;
  github: GitHubService;
  sentry: SentryService;
}): Promise<string> {
  const { config, db, chatId, userText, github, sentry } = params;
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  insertMessage(db, chatId, "user", userText);
  const prior = recentMessages(db, chatId, 40);
  const messages: MessageParam[] = anthropicHistoryFromRows(prior);

  const maxSteps = 16;
  let lastAssistantText = "";

  for (let step = 0; step < maxSteps; step++) {
    const response = await client.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    const toolBlocks = response.content.filter((b) => b.type === "tool_use");
    if (toolBlocks.length > 0) {
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const block of toolBlocks) {
        if (block.type !== "tool_use") continue;
        let payload: unknown;
        try {
          payload = await runTool(block.name, block.input as Record<string, unknown>, {
            github,
            sentry,
            db,
          });
        } catch (e) {
          payload = {
            error: true,
            message: e instanceof Error ? e.message : String(e),
          };
        }
        const textOut =
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 0).slice(0, 80_000);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: textOut,
        });
      }
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    lastAssistantText = extractTextContent(response.content);
    if (!lastAssistantText) {
      lastAssistantText = "(No text reply from model.)";
    }
    break;
  }

  if (lastAssistantText === "") {
    lastAssistantText =
      "Stopped after reaching the tool-step limit without a final reply. Try a narrower question.";
  }

  insertMessage(db, chatId, "assistant", lastAssistantText);
  return lastAssistantText;
}
