// Chùa Online · license check (offline, Ed25519)
//
// A license key looks like  CO1.<payload>.<signature>  (base64url). The payload is JSON:
//   { v:1, id, sub:"customer", tier:"pro", tiktok:"username" | "", exp:"2027-12-31" | "", iat }
// Keys are issued with `node tools/license.mjs issue …` using the private key that only the seller holds.
// This file only carries the PUBLIC key, so it is safe to ship.
//
// Free tier (no key): small "bản miễn phí" mark on the overlay, up to FREE_MAX_SEATS seats, free themes only.
// A key bound to a TikTok username only unlocks Pro while connected to that username (or while not live).
import crypto from 'node:crypto';

export const FREE_MAX_SEATS = 36;

// BEGIN PUBLIC KEY (replaced by `node tools/license.mjs keygen`)
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA7Vl570vNdPDhIE+sle+KF10R6/bq/v7rVv6cVP761/k=
-----END PUBLIC KEY-----`;
// END PUBLIC KEY

let publicKey = null;
try { publicKey = crypto.createPublicKey(PUBLIC_KEY_PEM); } catch { publicKey = null; }

export const normUser = (s) => String(s || '').trim().toLowerCase().replace(/^.*tiktok\.com\/@?/i, '').replace(/^@/, '').replace(/\/.*$/, '');

export function verifyLicense(token, now = Date.now()) {
  token = String(token || '').replace(/\s+/g, '');
  if (!token) return { ok: false, error: '' };
  const m = token.match(/^CO1\.([A-Za-z0-9_-]{8,2000})\.([A-Za-z0-9_-]{40,200})$/);
  if (!m) return { ok: false, error: 'Mã không đúng định dạng' };
  if (!publicKey) return { ok: false, error: 'Bản cài này chưa có khóa công khai (chạy tools/license.mjs keygen)' };
  let good = false;
  try { good = crypto.verify(null, Buffer.from(m[1]), publicKey, Buffer.from(m[2], 'base64url')); } catch { good = false; }
  if (!good) return { ok: false, error: 'Chữ ký không hợp lệ' };
  let p;
  try { p = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')); } catch { return { ok: false, error: 'Mã không đúng định dạng' }; }
  const payload = {
    id: String(p.id || '').slice(0, 40), sub: String(p.sub || '').slice(0, 80), tier: p.tier === 'pro' ? 'pro' : 'free',
    tiktok: normUser(p.tiktok), exp: String(p.exp || ''), iat: String(p.iat || ''),
  };
  if (payload.exp) {
    const end = Date.parse(payload.exp.length === 10 ? payload.exp + 'T23:59:59' : payload.exp);
    if (!Number.isFinite(end)) return { ok: false, error: 'Ngày hết hạn không hợp lệ' };
    if (now > end) return { ok: false, error: `Mã đã hết hạn ngày ${payload.exp}`, payload };
  }
  return { ok: true, payload };
}
