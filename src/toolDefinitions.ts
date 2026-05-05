import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const toolDefinitions: Tool[] = [
  {
    name: "github_list_repos",
    description:
      "List GitHub repositories visible to the configured token (recently updated first).",
    input_schema: {
      type: "object",
      properties: {
        page: { type: "integer", description: "1-based page" },
        per_page: { type: "integer", description: "Max 100, default 30" },
      },
    },
  },
  {
    name: "github_get_file",
    description: "Get decoded file contents from a repo at a path. Optionally pin a git ref.",
    input_schema: {
      type: "object",
      properties: {
        repo_full_name: { type: "string", description: "e.g. octocat/Hello-World" },
        path: { type: "string" },
        ref: { type: "string", description: "branch, tag, or commit SHA" },
      },
      required: ["repo_full_name", "path"],
    },
  },
  {
    name: "github_search_code",
    description: "Search code across GitHub (same as GitHub code search).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        page: { type: "integer" },
      },
      required: ["query"],
    },
  },
  {
    name: "github_list_issues",
    description: "List issues for a repository (excludes PRs).",
    input_schema: {
      type: "object",
      properties: {
        repo_full_name: { type: "string" },
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          description: "Default open",
        },
        per_page: { type: "integer" },
      },
      required: ["repo_full_name"],
    },
  },
  {
    name: "github_list_pull_requests",
    description: "List pull requests for a repository.",
    input_schema: {
      type: "object",
      properties: {
        repo_full_name: { type: "string" },
        state: {
          type: "string",
          enum: ["open", "closed"],
          description: "GitHub API does not support all in this call",
        },
        per_page: { type: "integer" },
      },
      required: ["repo_full_name"],
    },
  },
  {
    name: "github_get_issue",
    description: "Fetch a single issue by number.",
    input_schema: {
      type: "object",
      properties: {
        repo_full_name: { type: "string" },
        number: { type: "integer" },
      },
      required: ["repo_full_name", "number"],
    },
  },
  {
    name: "github_get_pull_request",
    description: "Fetch a single pull request by number.",
    input_schema: {
      type: "object",
      properties: {
        repo_full_name: { type: "string" },
        number: { type: "integer" },
      },
      required: ["repo_full_name", "number"],
    },
  },
  {
    name: "sentry_list_projects",
    description: "List Sentry projects in the configured organization.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "sentry_list_issues",
    description:
      "List Sentry issues. If project_slug omitted and SENTRY_PROJECT_SLUG is unset, uses org-level issues.",
    input_schema: {
      type: "object",
      properties: {
        project_slug: { type: "string" },
        query: { type: "string", description: "Sentry issue search query, default is:unresolved" },
        stats_period: {
          type: "string",
          description: "e.g. 24h, 14d — recent activity window when supported",
        },
        limit: { type: "integer", description: "Max 50" },
      },
    },
  },
  {
    name: "sentry_issue_details",
    description: "Get metadata for a Sentry issue by ID (UUID).",
    input_schema: {
      type: "object",
      properties: { issue_id: { type: "string" } },
      required: ["issue_id"],
    },
  },
  {
    name: "sentry_latest_event",
    description: "Get the latest event/stack trace payload for a Sentry issue.",
    input_schema: {
      type: "object",
      properties: { issue_id: { type: "string" } },
      required: ["issue_id"],
    },
  },
  {
    name: "memory_get",
    description: "Read a value from assistant persistent memory (SQLite).",
    input_schema: {
      type: "object",
      properties: { key: { type: "string" } },
      required: ["key"],
    },
  },
  {
    name: "memory_set",
    description: "Store a value in assistant persistent memory (SQLite).",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "memory_list_keys",
    description: "List memory keys with optional prefix filter.",
    input_schema: {
      type: "object",
      properties: { prefix: { type: "string" } },
    },
  },
];
