// All environments: call /api/<function> (Vite proxy in dev, nginx proxy in prod).
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

function unwrap(data) {
  if (data && typeof data.body === "string" && !data.password && !data.error) {
    try {
      const inner = JSON.parse(data.body);
      if (inner && (inner.password != null || inner.error != null)) return inner;
      if (inner && inner.username != null) return inner; // echoed request – use it so we can show a specific error
    } catch {
      // Keep the original response when the envelope is not valid JSON.
    }
  }
  return data;
}

const jsonPost = async (path, body) => {
  const url = `${API_BASE}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: (text && text.slice(0, 200)) || "Invalid response" };
  }
  data = unwrap(data);
  if (!res.ok && !data.error) data.error = `Request failed: ${res.status}`;
  return { ok: res.ok, data };
};

export async function createUser(username) {
  const name = (username || "").trim();
  if (!name) return { error: "Enter a username" };
  const { ok, data } = await jsonPost("generate-password", { username: name });
  if (!ok) return { error: data.error || "Request failed" };
  if (data.error) return { error: data.error };
  return data;
}

export async function generate2FA(username) {
  const { ok, data } = await jsonPost("twofa", { username: username.trim() });
  if (!ok && data.error) return { error: data.error };
  if (data.error) return { error: data.error };
  return data;
}

/** Validate username + password only; returns { need2FA: true } or { authenticated } if no 2FA. */
export async function validateCredentials(username, password) {
  const { ok, data } = await jsonPost("authenticate", {
    username: username.trim(),
    password: password || "",
    step: "password",
  });
  if (!ok && data.error) return { error: data.error };
  if (data.error) return { error: data.error };
  return data;
}

export async function authenticate(username, password, otp) {
  const { ok, data } = await jsonPost("authenticate", {
    username: username.trim(),
    password: password || "",
    code: otp || "",
  });
  if (!ok && data.error) return { error: data.error };
  if (data.error) return { error: data.error };
  return data;
}

/** Call backend logout (stateless ack). */
export async function logout() {
  const { ok } = await jsonPost("logout", {});
  return ok;
}

// Legacy text parsing (kept for any fallback)
export function parsePassword(text) {
  const m = text.match(/^PASSWORD:(.+)$/m);
  return m ? m[1].trim() : null;
}
export function parseQRBase64(text) {
  const m = text.match(/QR_BASE64:([\s\S]+?)(?=\nSECRET:|$)/);
  return m ? m[1].trim().replace(/\s/g, "") : null;
}
export function parseSecret(text) {
  const m = text.match(/SECRET:(.+)$/m);
  return m ? m[1].trim() : null;
}
