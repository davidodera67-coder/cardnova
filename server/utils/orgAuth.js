// Small, dependency-free security helpers for the Organisation portal.
// Member codes are stored hashed (scrypt + random salt). Sign-in tokens are
// HMAC-signed with the server's JWT_SECRET. Nothing here costs anything to run.
import crypto from "crypto";

const secret = () => `${process.env.JWT_SECRET || "dev-only-secret"}:org-portal`;
const sign = (body) => crypto.createHmac("sha256", secret()).update(body).digest("base64url");
const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function signToken(payload, ttlSec = 7 * 24 * 3600) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString("base64url");
  return `${body}.${sign(body)}`;
}
export function verifyToken(token) {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig || !safeEq(sig, sign(body))) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return p.exp && p.exp > Math.floor(Date.now() / 1000) ? p : null;
  } catch { return null; }
}

const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(String(pw), salt, 32, (e, k) => (e ? rej(e) : res(k.toString("hex")))));
export async function hashCode(code) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${await scrypt(code, salt)}`;
}
export async function checkCode(code, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) { await scrypt(code, "0".repeat(32)); return false; } // keep timing similar
  return safeEq(await scrypt(code, salt), hash);
}
export const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
export const newToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
export const cardToken = () => crypto.randomBytes(9).toString("base64url");           // 12 url-safe characters
export const joinCode = () => crypto.randomBytes(5).toString("hex").toUpperCase();    // e.g. 9F3A1C07D2
export const tempCode = () => String(crypto.randomInt(100000, 999999));

export function clientIp(req) {
  const xf = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return xf || req.ip || req.socket?.remoteAddress || "";
}
// We never store a full IP address — just enough to see roughly where it came from.
export function maskIp(ip) {
  const s = String(ip || "").replace(/^::ffff:/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return s.replace(/\.\d+$/, ".x");
  if (s.includes(":")) return s.split(":").slice(0, 3).join(":") + "::";
  return "";
}

// Tiny in-memory limiter: limited(key) returns true once `max` hits happen inside `windowMs`.
export function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return true; }
    recent.push(now); hits.set(key, recent);
    if (hits.size > 10000) hits.clear();
    return false;
  };
}

let geo;
// Approximate place from the IP address, if the optional free "geoip-lite" package is installed.
export async function geoLookup(ip) {
  try {
    if (geo === undefined) { try { geo = (await import("geoip-lite")).default; } catch { geo = null; } }
    if (!geo) return {};
    const r = geo.lookup(String(ip).replace(/^::ffff:/, ""));
    if (!r) return {};
    return { city: r.city || "", region: r.region || "", country: r.country || "", lat: r.ll?.[0], lng: r.ll?.[1] };
  } catch { return {}; }
}
