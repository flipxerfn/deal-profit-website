// Admin session management for the Cloudflare Worker.
// Stateless, signed sessions: a base64url payload + HMAC-SHA256 signature.
// The signing key is derived from the admin password secret — the password is
// therefore never shipped to the browser and never stored anywhere client-side.

export const SESSION_COOKIE = 'dp_admin_session';
export const SESSION_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

let cachedSecret = null;
let cachedKeyPromise = null;

const enc = (s) => new TextEncoder().encode(s);

async function getKey(secret) {
  if (cachedSecret === secret && cachedKeyPromise) return cachedKeyPromise;
  cachedSecret = secret;
  cachedKeyPromise = (async () => {
    const material = await crypto.subtle.importKey('raw', enc(`deal-profit-auth:v1:${secret}`), 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: enc('dp-admin-session-salt-v1'), info: enc('dp-admin-session') },
      material,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  })();
  return cachedKeyPromise;
}

const toB64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromB64url = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function issueSession(payload, secret) {
  const key = await getKey(secret);
  const body = toB64url(enc(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc(body)));
  return `${body}.${toB64url(sig)}`;
}

export async function verifySession(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const sigText = token.slice(dot + 1);
  let sig;
  try {
    sig = fromB64url(sigText);
  } catch {
    return null;
  }
  const key = await getKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc(body));
  if (!valid) return null;
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number' || payload.exp <= Date.now()) return null;
  return payload;
}

export const isSecureRequest = (request) =>
  request.headers.get('x-forwarded-proto') === 'https' || new URL(request.url).protocol === 'https:';

export function sessionCookie(token, request) {
  const secure = isSecureRequest(request);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_AGE_MS / 1000}${
    secure ? '; Secure' : ''
  }`;
}

export function clearSessionCookie(request) {
  const secure = isSecureRequest(request);
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${
    secure ? '; Secure' : ''
  }`;
}

// Constant-time-ish comparison of two arbitrary strings (digest comparison).
export async function safeEqual(a, b) {
  const dig = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc(s ?? '')));
  const [ha, hb] = await Promise.all([dig(a), dig(b)]);
  const n = Math.max(ha.length, hb.length);
  let diff = 0;
  for (let i = 0; i < n; i += 1) {
    diff |= (ha[i] || 0) ^ (hb[i] || 0);
  }
  return diff === 0;
}

export function newSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function readCookie(request, name) {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return null;
}