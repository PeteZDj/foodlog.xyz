/**
 * Parsing for the Google sign-in callback.
 *
 * The browser bridge (mobile-signin.html) finishes by redirecting to
 * `foodlog://auth#token=...`. That URL can reach us two ways:
 *
 *   1. `WebBrowser.openAuthSessionAsync` intercepts it and hands it back as a
 *      result - the happy path on iOS and on Android when Custom Tabs plays
 *      along.
 *   2. Android hands it to the OS instead, which launches the app on the
 *      `foodlog://` scheme. Before there was an `auth` route this produced
 *      Expo Router's "Unmatched Route" screen and sign-in simply failed.
 *
 * Both paths now parse the URL here, so there is one definition of what a
 * callback URL means.
 */

export interface AuthCallbackUser {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthCallback {
  token: string;
  user: AuthCallbackUser;
}

/** Decode base64 without assuming `atob` exists on the JS runtime. */
function decodeBase64(value: string): string | null {
  const globalAtob = (globalThis as any).atob as ((s: string) => string) | undefined;

  if (typeof globalAtob === 'function') {
    try {
      return globalAtob(value);
    } catch {
      return null;
    }
  }

  const BufferCtor = (globalThis as any).Buffer;
  if (BufferCtor) {
    try {
      return BufferCtor.from(value, 'base64').toString('binary');
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Pull the token and profile out of a callback URL.
 *
 * Returns null when the URL is not a completed sign-in - a cancelled flow, or
 * any other deep link that happens to land on the auth route.
 */
export function parseAuthCallback(url: string | null | undefined): AuthCallback | null {
  if (!url) return null;

  // The payload may arrive in the fragment or the query string. Custom-scheme
  // URLs never reach a server, so neither is more private than the other -
  // accept both rather than depending on which the bridge used.
  const hashPart = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const queryPart = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const raw = hashPart || queryPart;
  if (!raw) return null;

  const params = new URLSearchParams(raw);
  const token = params.get('token');
  if (!token) return null;

  let avatar: string | undefined;
  const userB64 = params.get('user');
  if (userB64) {
    const decoded = decodeBase64(userB64);
    if (decoded) {
      try {
        const parsed = JSON.parse(decodeURIComponent(escape(decoded)));
        avatar = parsed?.avatar;
      } catch {
        // The avatar is optional - a malformed blob must not fail sign-in.
      }
    }
  }

  return {
    token,
    user: {
      id: params.get('id') || undefined,
      name: params.get('name') || 'Foodlog user',
      email: params.get('email') || '',
      avatar,
    },
  };
}
