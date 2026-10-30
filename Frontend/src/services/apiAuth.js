// Sends the signed-in user's token with every request to the Koru API.
// Done once here instead of in each of the ~150 fetch calls across the services and pages.
const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE_URL || "http://localhost:5299/api").origin;
const STORAGE_KEY = "learnonline.auth";

function currentToken() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")?.token ?? null;
  } catch {
    return null;
  }
}

export function installApiAuth() {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const token = currentToken();
    if (!token || !url.startsWith(API_ORIGIN)) return nativeFetch(input, init);

    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    const res = await nativeFetch(input, { ...init, headers });

    // Token expired or revoked: drop the session and send the user back to sign in
    if (res.status === 401) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.hash = "#/";
      window.location.reload();
    }
    return res;
  };
}
