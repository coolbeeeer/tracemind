/** Read-only, allowlisted GitHub source retrieval for investigation evidence. */
export async function fetchGitHubSourceEvidence(input: {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  accessToken: string;
  request?: typeof fetch;
}): Promise<{ path: string; ref: string; content: string; sourceUrl: string }> {
  const segment = /^[A-Za-z0-9_.-]+$/;
  if (![input.owner, input.repo].every(value => segment.test(value))) {
    throw new Error("Invalid repository identifier");
  }
  if (!/^[a-f0-9]{40}$/.test(input.ref)) {
    throw new Error("A pinned 40-character commit SHA is required");
  }
  const parts = input.path.split("/");
  if (!parts.length || parts.some(part => !segment.test(part) || part === "." || part === "..")) {
    throw new Error("Invalid source path");
  }
  if (!input.accessToken) throw new Error("Server-side GitHub authorization required");
  const path = parts.map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${path}?ref=${input.ref}`;
  const response = await (input.request ?? fetch)(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: "application/vnd.github.raw+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub source read failed (HTTP ${response.status})`);
  const content = await response.text();
  if (content.length > 200_000) throw new Error("Source file exceeds investigation size limit");
  return {
    path: input.path,
    ref: input.ref,
    content,
    sourceUrl: `https://github.com/${input.owner}/${input.repo}/blob/${input.ref}/${path}`,
  };
}
