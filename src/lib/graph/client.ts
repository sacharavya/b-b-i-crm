import { getAccessToken, invalidateToken } from "./auth";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export class GraphApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    let message = `Graph API ${status}`;
    if (body && typeof body === "object" && "error" in body) {
      const err = (body as { error?: { code?: string; message?: string } })
        .error;
      const detail = [err?.code, err?.message].filter(Boolean).join(": ");
      if (detail) message = `Graph API ${status} — ${detail}`;
    }
    super(message);
    this.name = "GraphApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Issues a Graph request with the cached bearer token attached. On 401, the
 * token is invalidated and the request is retried exactly once.
 *
 * `path` may be either a fully-qualified URL or a path beginning with "/"
 * which is appended to the v1.0 base.
 */
export async function graphFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;

  const attempt = async (token: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let token = await getAccessToken();
  let res = await attempt(token);

  if (res.status === 401) {
    invalidateToken();
    token = await getAccessToken();
    res = await attempt(token);
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    throw new GraphApiError(res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  // Non-JSON success (rare for Graph) — return text cast to T.
  return (await res.text()) as unknown as T;
}
