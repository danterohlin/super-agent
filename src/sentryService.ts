import type { Config } from "./config.js";

type Json = unknown;

export class SentryService {
  constructor(
    private readonly config: Config,
    private readonly token: string,
  ) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async get(path: string): Promise<Json> {
    const url = `${this.config.SENTRY_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, { headers: this.headers() });
    const text = await res.text();
    if (!res.ok) {
      return {
        error: true,
        status: res.status,
        body: text.slice(0, 4000),
      };
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return { raw: text.slice(0, 4000) };
    }
  }

  async listProjects(): Promise<Json> {
    return this.get(`/organizations/${encodeURIComponent(this.config.SENTRY_ORG_SLUG)}/projects/`);
  }

  async listIssues(params: {
    projectSlug?: string;
    query?: string;
    statsPeriod?: string;
    limit?: number;
  }): Promise<Json> {
    const project =
      params.projectSlug ?? this.config.SENTRY_PROJECT_SLUG ?? undefined;
    const parts = [`query=${encodeURIComponent(params.query ?? "is:unresolved")}`];
    if (params.statsPeriod) {
      parts.push(`statsPeriod=${encodeURIComponent(params.statsPeriod)}`);
    }
    const limit = Math.min(params.limit ?? 25, 50);
    parts.push(`limit=${limit}`);

    if (project) {
      const path = `/projects/${encodeURIComponent(this.config.SENTRY_ORG_SLUG)}/${encodeURIComponent(project)}/issues/?${parts.join("&")}`;
      return this.get(path);
    }

    const orgIssuesPath = `/organizations/${encodeURIComponent(this.config.SENTRY_ORG_SLUG)}/issues/?${parts.join("&")}`;
    return this.get(orgIssuesPath);
  }

  async issueDetails(issueId: string): Promise<Json> {
    return this.get(`/issues/${encodeURIComponent(issueId)}/`);
  }

  async latestEvent(issueId: string): Promise<Json> {
    return this.get(`/issues/${encodeURIComponent(issueId)}/events/latest/`);
  }
}
