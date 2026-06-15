const FILENAME = "finlens-data.json";

function authHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

function serviceError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const STATUS_MAP = {
  401: ["Invalid token — check your GitHub Personal Access Token.", "INVALID_TOKEN"],
  403: ["Permission denied — ensure the token has 'repo' scope.", "PERMISSION_DENIED"],
  404: ["Repo not found — check the owner/repo format.", "NOT_FOUND"],
  409: ["Conflict — someone else may have modified the file. Try loading first.", "CONFLICT"],
  422: ["Unprocessable request — check your repo name format.", "UNPROCESSABLE"],
};

function githubError(status, bodyMessage) {
  const [defaultMsg, code] = STATUS_MAP[status] || [`GitHub error (${status})`, "GITHUB_ERROR"];
  const message = bodyMessage || defaultMsg;
  return serviceError(message, code);
}

export async function syncToGitHub(token, repo, data) {
  if (!token || !repo) throw serviceError("Token and repo are required.", "MISSING_CONFIG");

  const content = btoa(
    Array.from(new TextEncoder().encode(JSON.stringify(data, null, 2)), (b) =>
      String.fromCharCode(b)
    ).join("")
  );

  // Fetch existing SHA so we can update rather than create
  let sha = null;
  const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${FILENAME}`, {
    headers: authHeaders(token),
  });
  if (checkRes.ok) {
    const d = await checkRes.json();
    sha = d.sha;
  } else if (checkRes.status !== 404) {
    // 404 is fine (file doesn't exist yet); anything else is a real error
    const err = githubError(checkRes.status);
    console.error("[github] syncToGitHub SHA fetch failed:", checkRes.status, err.message);
    throw err;
  }

  const body = { message: `FinLens sync ${new Date().toISOString()}`, content };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${FILENAME}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let bodyMessage;
    try {
      const e = await res.json();
      bodyMessage = e.message || undefined;
    } catch { /* response body not JSON — fall back to status-based message */ }
    const err = githubError(res.status, bodyMessage);
    console.error("[github] syncToGitHub PUT failed:", res.status, err.message);
    throw err;
  }
}

export async function loadFromGitHub(token, repo) {
  if (!token || !repo) throw serviceError("Token and repo are required.", "MISSING_CONFIG");

  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${FILENAME}`, {
    headers: authHeaders(token),
  });

  if (!r.ok) {
    const err = githubError(r.status);
    console.error("[github] loadFromGitHub fetch failed:", r.status, err.message);
    throw err;
  }

  const d = await r.json();

  let json;
  try {
    json = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(d.content.replace(/\s/g, "")), (c) => c.charCodeAt(0))
      )
    );
  } catch (parseErr) {
    const err = serviceError("Stored data is corrupted and could not be parsed.", "CORRUPT_DATA");
    console.error("[github] loadFromGitHub parse failed:", parseErr);
    throw err;
  }

  json.transactions = (json.transactions || []).map((t) => {
    const date = new Date(t.date);
    return { ...t, date: isNaN(date.getTime()) ? new Date() : date };
  });

  return json;
}
