/**
 * Microsoft Graph client-credentials auth.
 *
 * In-memory token cache scoped to the current process. Concurrent callers
 * share a single in-flight refresh so we never fire duplicate token requests.
 *
 * For multi-instance deployments where you want shared caching, swap this
 * for a Redis-backed implementation; the public surface (getAccessToken /
 * invalidateToken) stays the same.
 */

type CachedToken = {
  token: string;
  expiresAt: number;
};

let cached: CachedToken | null = null;
let inFlight: Promise<CachedToken> | null = null;

const TOKEN_REFRESH_BUFFER_MS = 60_000;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + TOKEN_REFRESH_BUFFER_MS) {
    return cached.token;
  }

  if (inFlight) {
    return (await inFlight).token;
  }

  inFlight = fetchToken().finally(() => {
    inFlight = null;
  });

  cached = await inFlight;
  return cached.token;
}

export function invalidateToken(): void {
  cached = null;
}

async function fetchToken(): Promise<CachedToken> {
  const tenant = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const secret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenant || !clientId || !secret) {
    throw new Error(
      "Missing Graph credentials: set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET in .env.local",
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Graph token request failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  return {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}
