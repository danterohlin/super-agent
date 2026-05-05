import { Octokit } from "@octokit/rest";

export class GitHubService {
  constructor(private readonly octokit: Octokit) {}

  async listRepos(params: { page?: number; perPage?: number }): Promise<unknown> {
    const page = params.page ?? 1;
    const perPage = Math.min(params.perPage ?? 50, 100);
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      affiliation: "owner,collaborator,organization_member",
      per_page: perPage,
      page,
      sort: "updated",
    });
    return data.map((r) => ({
      full_name: r.full_name,
      name: r.name,
      owner: r.owner.login,
      private: r.private,
      default_branch: r.default_branch,
      description: r.description,
      updated_at: r.updated_at,
      html_url: r.html_url,
    }));
  }

  async getFile(params: {
    owner: string;
    repo: string;
    path: string;
    ref?: string;
  }): Promise<unknown> {
    const { data } = await this.octokit.rest.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path: params.path,
      ref: params.ref,
    });
    if (Array.isArray(data)) {
      return data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        sha: item.sha,
      }));
    }
    if (data.type !== "file") {
      return { error: "Not a file", type: data.type };
    }
    const encoding = data.encoding;
    const content = data.content;
    if (encoding === "base64" && content) {
      const decoded = Buffer.from(content, "base64").toString("utf8");
      return {
        path: data.path,
        sha: data.sha,
        size: data.size,
        ref: params.ref,
        content: decoded.slice(0, 200_000),
        truncated: decoded.length > 200_000,
      };
    }
    return { path: data.path, sha: data.sha, message: "Could not decode file" };
  }

  async searchCode(q: string, page = 1): Promise<unknown> {
    const perPage = 20;
    const { data } = await this.octokit.rest.search.code({
      q,
      per_page: perPage,
      page,
    });
    return {
      total_count: data.total_count,
      items: data.items.map((item) => ({
        name: item.name,
        path: item.path,
        repository: item.repository.full_name,
        html_url: item.html_url,
        sha: item.sha,
      })),
    };
  }

  async listIssues(params: {
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
    perPage?: number;
  }): Promise<unknown> {
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner: params.owner,
      repo: params.repo,
      state: params.state ?? "open",
      per_page: Math.min(params.perPage ?? 30, 100),
    });
    return data
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        html_url: i.html_url,
        user: i.user?.login,
        labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)),
        updated_at: i.updated_at,
      }));
  }

  async listPullRequests(params: {
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
    perPage?: number;
  }): Promise<unknown> {
    const { data } = await this.octokit.rest.pulls.list({
      owner: params.owner,
      repo: params.repo,
      state: (params.state ?? "open") as "open" | "closed",
      per_page: Math.min(params.perPage ?? 30, 100),
    });
    return data.map((p) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      html_url: p.html_url,
      user: p.user?.login,
      draft: p.draft,
      updated_at: p.updated_at,
    }));
  }

  async getIssue(params: {
    owner: string;
    repo: string;
    number: number;
  }): Promise<unknown> {
    const { data } = await this.octokit.rest.issues.get({
      owner: params.owner,
      repo: params.repo,
      issue_number: params.number,
    });
    return {
      number: data.number,
      title: data.title,
      body: data.body?.slice(0, 20_000),
      state: data.state,
      html_url: data.html_url,
      user: data.user?.login,
      labels: data.labels.map((l) => (typeof l === "string" ? l : l.name)),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  async getPullRequest(params: {
    owner: string;
    repo: string;
    number: number;
  }): Promise<unknown> {
    const { data } = await this.octokit.rest.pulls.get({
      owner: params.owner,
      repo: params.repo,
      pull_number: params.number,
    });
    return {
      number: data.number,
      title: data.title,
      body: data.body?.slice(0, 20_000),
      state: data.state,
      merged: data.merged,
      html_url: data.html_url,
      user: data.user?.login,
      head: `${data.head.repo?.full_name ?? ""}:${data.head.ref}`,
      base: `${data.base.repo.full_name}:${data.base.ref}`,
      updated_at: data.updated_at,
    };
  }
}
