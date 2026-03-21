import { Octokit } from "@octokit/rest";
import type { Tool } from "@anthropic-ai/sdk/resources";

let octokit: Octokit | null = null;

export function getOctokit(): Octokit {
  if (!octokit) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN is not set");
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

export const githubTools: Tool[] = [
  {
    name: "list_repos",
    description: "List the authenticated user's GitHub repositories",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["all", "owner", "public", "private", "member"],
          description: "Type of repos to list (default: all)",
        },
        sort: {
          type: "string",
          enum: ["created", "updated", "pushed", "full_name"],
          description: "How to sort the results (default: updated)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_repo",
    description: "Get details about a specific GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner (username or org)" },
        repo: { type: "string", description: "Repository name" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "list_files",
    description: "List files and directories in a GitHub repository path",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        path: { type: "string", description: "Path within the repo (default: root)" },
        ref: { type: "string", description: "Branch, tag, or commit SHA (default: default branch)" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a file in a GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        path: { type: "string", description: "File path within the repo" },
        ref: { type: "string", description: "Branch, tag, or commit SHA (default: default branch)" },
      },
      required: ["owner", "repo", "path"],
    },
  },
  {
    name: "create_or_update_file",
    description: "Create or update a file in a GitHub repository (creates a commit)",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        path: { type: "string", description: "File path within the repo" },
        content: { type: "string", description: "File content (plain text)" },
        message: { type: "string", description: "Commit message" },
        branch: { type: "string", description: "Branch to commit to (default: default branch)" },
      },
      required: ["owner", "repo", "path", "content", "message"],
    },
  },
  {
    name: "create_branch",
    description: "Create a new branch in a GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        branch: { type: "string", description: "New branch name" },
        from_branch: { type: "string", description: "Source branch (default: default branch)" },
      },
      required: ["owner", "repo", "branch"],
    },
  },
  {
    name: "list_branches",
    description: "List branches in a GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "get_pull_requests",
    description: "List open pull requests in a GitHub repository",
    input_schema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        state: {
          type: "string",
          enum: ["open", "closed", "all"],
          description: "PR state (default: open)",
        },
      },
      required: ["owner", "repo"],
    },
  },
];

type ToolInput = Record<string, string | undefined>;

export async function executeTool(name: string, input: ToolInput): Promise<string> {
  const kit = getOctokit();
  const username = process.env.GITHUB_USERNAME ?? "";

  try {
    switch (name) {
      case "list_repos": {
        const { data } = await kit.repos.listForAuthenticatedUser({
          type: (input.type as "all" | "owner" | "public" | "private" | "member") ?? "all",
          sort: (input.sort as "created" | "updated" | "pushed" | "full_name") ?? "updated",
          per_page: 30,
        });
        return JSON.stringify(
          data.map((r) => ({
            name: r.full_name,
            private: r.private,
            description: r.description,
            language: r.language,
            updated_at: r.updated_at,
            default_branch: r.default_branch,
          })),
          null,
          2
        );
      }

      case "get_repo": {
        const { data } = await kit.repos.get({ owner: input.owner!, repo: input.repo! });
        return JSON.stringify(
          {
            full_name: data.full_name,
            description: data.description,
            private: data.private,
            language: data.language,
            default_branch: data.default_branch,
            stars: data.stargazers_count,
            forks: data.forks_count,
            open_issues: data.open_issues_count,
            html_url: data.html_url,
          },
          null,
          2
        );
      }

      case "list_files": {
        const { data } = await kit.repos.getContent({
          owner: input.owner!,
          repo: input.repo!,
          path: input.path ?? "",
          ref: input.ref,
        });
        if (!Array.isArray(data)) return JSON.stringify({ type: (data as { type: string }).type, name: (data as { name: string }).name });
        return JSON.stringify(
          data.map((item) => ({ name: item.name, type: item.type, path: item.path, size: item.size })),
          null,
          2
        );
      }

      case "read_file": {
        const { data } = await kit.repos.getContent({
          owner: input.owner!,
          repo: input.repo!,
          path: input.path!,
          ref: input.ref,
        });
        if (Array.isArray(data) || !("content" in data)) return "Error: path is a directory, not a file";
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return content.length > 8000 ? content.slice(0, 8000) + "\n\n[...truncated]" : content;
      }

      case "create_or_update_file": {
        const owner = input.owner!;
        const repo = input.repo!;
        const path = input.path!;
        const branch = input.branch;

        let sha: string | undefined;
        try {
          const existing = await kit.repos.getContent({ owner, repo, path, ref: branch });
          if (!Array.isArray(existing.data) && "sha" in existing.data) {
            sha = existing.data.sha;
          }
        } catch {
          // file does not exist yet — sha stays undefined
        }

        const { data } = await kit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: input.message!,
          content: Buffer.from(input.content!).toString("base64"),
          sha,
          branch,
        });
        return `File ${sha ? "updated" : "created"} successfully. Commit: ${data.commit.sha}`;
      }

      case "create_branch": {
        const owner = input.owner!;
        const repo = input.repo!;

        const { data: repoData } = await kit.repos.get({ owner, repo });
        const fromBranch = input.from_branch ?? repoData.default_branch;

        const { data: refData } = await kit.git.getRef({ owner, repo, ref: `heads/${fromBranch}` });
        await kit.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${input.branch!}`,
          sha: refData.object.sha,
        });
        return `Branch '${input.branch}' created from '${fromBranch}'`;
      }

      case "list_branches": {
        const { data } = await kit.repos.listBranches({ owner: input.owner!, repo: input.repo! });
        return JSON.stringify(data.map((b) => b.name), null, 2);
      }

      case "get_pull_requests": {
        const { data } = await kit.pulls.list({
          owner: input.owner!,
          repo: input.repo!,
          state: (input.state as "open" | "closed" | "all") ?? "open",
          per_page: 20,
        });
        return JSON.stringify(
          data.map((pr) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            author: pr.user?.login,
            created_at: pr.created_at,
            html_url: pr.html_url,
          })),
          null,
          2
        );
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `GitHub API error: ${msg}`;
  }
}
