import { Octokit } from "@octokit/rest";
import type { EnvConfig } from "../config.js";

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error(`Invalid GITHUB_REPO: ${repo}`);
  return { owner, repo: name };
}

export function hasGithubToken(env: EnvConfig): boolean {
  return Boolean(env.githubToken);
}

export async function getFile(env: EnvConfig, path: string, ref?: string) {
  if (!env.githubToken) {
    return {
      status: "not_configured",
      message: "GITHUB_TOKEN not set; repo tools stubbed",
      path,
    };
  }
  const octokit = new Octokit({ auth: env.githubToken });
  const { owner, repo } = parseRepo(env.githubRepo);
  const res = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ...(ref ? { ref } : {}),
  });
  if (Array.isArray(res.data)) {
    return { type: "dir", entries: res.data.map((e) => ({ path: e.path, type: e.type, sha: e.sha })) };
  }
  if (res.data.type !== "file" || !("content" in res.data)) {
    return { type: res.data.type, path: res.data.path };
  }
  const content = Buffer.from(res.data.content, "base64").toString("utf8");
  return {
    type: "file",
    path: res.data.path,
    sha: res.data.sha,
    size: res.data.size,
    content,
  };
}

export async function searchCode(env: EnvConfig, query: string) {
  if (!env.githubToken) {
    return {
      status: "not_configured",
      message: "GITHUB_TOKEN not set; repo tools stubbed",
      query,
    };
  }
  const octokit = new Octokit({ auth: env.githubToken });
  const { owner, repo } = parseRepo(env.githubRepo);
  const q = `${query} repo:${owner}/${repo}`;
  const res = await octokit.search.code({ q, per_page: 20 });
  return {
    total_count: res.data.total_count,
    items: res.data.items.map((i) => ({
      path: i.path,
      html_url: i.html_url,
      sha: i.sha,
    })),
  };
}

export async function listOpenPrs(env: EnvConfig) {
  if (!env.githubToken) {
    return {
      status: "not_configured",
      message: "GITHUB_TOKEN not set; repo tools stubbed",
    };
  }
  const octokit = new Octokit({ auth: env.githubToken });
  const { owner, repo } = parseRepo(env.githubRepo);
  const res = await octokit.pulls.list({ owner, repo, state: "open", per_page: 30 });
  return {
    items: res.data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      html_url: pr.html_url,
      user: pr.user?.login,
      head: pr.head.ref,
      base: pr.base.ref,
      created_at: pr.created_at,
    })),
  };
}
