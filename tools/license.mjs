#!/usr/bin/env node
// Chùa Online · license key tool (for the seller only)
//
//   node tools/license.mjs keygen [--force]
//       Creates an Ed25519 key pair. The PRIVATE key goes to ~/.chua-online/license-private.pem
//       (outside the repo, chmod 600). The PUBLIC key is written into live/license.mjs.
//       Back up the private key: losing it means existing customers cannot be re-issued keys,
//       and leaking it means anyone can mint keys.
//
//   node tools/license.mjs issue --to "Tên khách / email" [--tiktok @kenh] [--days 365 | --exp 2027-12-31] [--tier pro]
//       Prints a key for the customer. --tiktok binds the key to one channel (recommended).
//       No --days/--exp → lifetime key.
//
//   node tools/license.mjs verify <key>
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIC_FILE = path.resolve(__dirname, '../live/license.mjs');
const KEY_FILE = process.env.CHUA_PRIVATE_KEY || path.join(os.homedir(), '.chua-online', 'license-private.pem');

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name) => { const i = args.indexOf('--' + name); return i > 0 ? args[i + 1] : undefined; };
const flag = (name) => args.includes('--' + name);
const die = (msg) => { console.error(msg); process.exit(1); };

if (cmd === 'keygen') {
  if (fs.existsSync(KEY_FILE) && !flag('force')) die(`Đã có khóa bí mật tại ${KEY_FILE}. Dùng --force nếu thật sự muốn tạo lại (mọi mã cũ sẽ mất hiệu lực).`);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(KEY_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  const pub = publicKey.export({ type: 'spki', format: 'pem' }).trim();
  const src = fs.readFileSync(LIC_FILE, 'utf8');
  const out = src.replace(/(\/\/ BEGIN PUBLIC KEY[^\n]*\n)[\s\S]*?(\/\/ END PUBLIC KEY)/, `$1const PUBLIC_KEY_PEM = \`${pub}\`;\n$2`);
  if (out === src) die('Không tìm thấy đoạn BEGIN/END PUBLIC KEY trong live/license.mjs');
  fs.writeFileSync(LIC_FILE, out);
  console.log(`Khóa bí mật: ${KEY_FILE}  (SAO LƯU file này, không commit, không gửi ai)`);
  console.log('Đã ghi khóa công khai vào live/license.mjs:\n' + pub);
} else if (cmd === 'issue') {
  const to = opt('to');
  if (!to) die('Thiếu --to "Tên khách"');
  if (!fs.existsSync(KEY_FILE)) die(`Chưa có khóa bí mật (${KEY_FILE}). Chạy: node tools/license.mjs keygen`);
  const days = opt('days'), expArg = opt('exp');
  let exp = '';
  if (expArg) { if (!/^\d{4}-\d{2}-\d{2}$/.test(expArg)) die('--exp phải có dạng YYYY-MM-DD'); exp = expArg; }
  else if (days) { const d = +days; if (!(d > 0)) die('--days phải là số dương'); exp = new Date(Date.now() + d * 864e5).toISOString().slice(0, 10); }
  const payload = {
    v: 1, id: crypto.randomBytes(6).toString('hex'), sub: String(to).slice(0, 80), tier: opt('tier') === 'free' ? 'free' : 'pro',
    tiktok: String(opt('tiktok') || '').replace(/^@/, '').toLowerCase(), exp, iat: new Date().toISOString().slice(0, 10),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = crypto.createPrivateKey(fs.readFileSync(KEY_FILE));
  const sig = crypto.sign(null, Buffer.from(body), key).toString('base64url');
  console.log(`CO1.${body}.${sig}`);
  console.error(`→ ${payload.sub} · ${payload.tier} · ${payload.tiktok ? '@' + payload.tiktok : 'mọi kênh'} · ${exp ? 'hết hạn ' + exp : 'vĩnh viễn'} · mã #${payload.id}`);
} else if (cmd === 'verify') {
  const { verifyLicense } = await import('../live/license.mjs');
  const r = verifyLicense(args[1]);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
} else {
  console.log('Dùng: node tools/license.mjs keygen | issue --to "Tên" [--tiktok @kenh] [--days 365] | verify <mã>');
}
