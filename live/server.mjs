// Chùa Online — live server
// Runs on the streaming PC. Serves the overlay + control panel, listens to a TikTok LIVE room,
// keeps the list of seated viewers, generates Vietnamese voice lines with Edge TTS and pushes
// everything to the overlay over WebSocket.
//
//   cd live && npm install && node server.mjs        → http://localhost:3000/live/control.html
//
// Based on Chánh Điện Online by Kent Juno (MIT). See NOTICE.md.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { verifyLicense, normUser, FREE_MAX_SEATS } from './license.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');            // repo root: serves /assets, /live
const TTS_DIR = path.join(__dirname, 'tts');
const DATA_DIR = path.join(__dirname, 'data');          // settings.json, license.key (never served)
const THEMES_DIR = path.join(ROOT, 'assets', 'themes');
fs.mkdirSync(TTS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
for (const f of fs.readdirSync(TTS_DIR)) { try { fs.unlinkSync(path.join(TTS_DIR, f)); } catch {} }
const PORT = +process.env.PORT || 3000;

/* ------------------------------------------------------------------ state */
const DEFAULT_BLOCK = 'đm, dm, đmm, dmm, vcl, vkl, clm, đcm, dcm, địt, đéo, lồn, buồi, cặc, đụ, đụ má, con mẹ mày, óc chó';
const DEFAULT_DISCLAIMER = 'Không gian mô phỏng để thư giãn · Quà tặng là ủng hộ người phát sóng, không phải cúng dường cho chùa';
const settings = {
  title: 'Chánh Điện Tịnh Tâm',
  subtitle: 'Nam Mô A Di Đà Phật',
  theme: 'tinh-tam',
  voice: 'vi-VN-NamMinhNeural',      // or vi-VN-HoaiMyNeural
  pitch: -18,                        // Hz
  rate: -20,                         // %
  music: true, mo: true, moBpm: 52,
  autoChant: true, chantEveryMin: 3,
  seatMode: 'auto',                  // auto | 24 | 36 | 64 | 100
  joinOnEnter: false,                // also seat viewers who only enter the room
  // safety / platform-policy defaults (see docs/business/ke-hoach-thuong-mai-hoa.md)
  wording: 'an-toan',                // an-toan: thanks, no merit-for-gift promises · truyen-thong: original wording
  boardTitle: 'Tri Ân',
  showCoins: false,
  showDisclaimer: true,
  disclaimer: DEFAULT_DISCLAIMER,
  chatPrayers: true,                 // read prayers typed in chat (free), not only after a gift
  blockWords: DEFAULT_BLOCK,
  // community features: everyone can take part, nothing here depends on gifts
  beadGoal: 108,                     // shared chant counter ("Niệm chung"): 0 = off
  beadLikes: true,                   // likes also move the counter (max 1 per viewer per 10 s)
  dedicateEveryMin: 10,              // read the names of people present ("Hồi hướng"): 0 = off
  greetRegulars: true,               // greet viewers who come back on another day
  gifts: { readAll: true, minDiamonds: 1 },
};
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LICENSE_FILE = path.join(DATA_DIR, 'license.key');
const REGULARS_FILE = path.join(DATA_DIR, 'regulars.json');   // TikTok id -> { d: last day, n: days attended }

const viewers = new Map();           // id -> { id, name, skin, avatar, coins, joinedAt, lastAt, lastText, lastTextAt, demo }
const startedAt = Date.now();
let tiktok = null, tiktokState = { status: 'idle', uniqueId: '', error: '' };
const log = [];
function addLog(s){ const line = `[${new Date().toLocaleTimeString('vi-VN')}] ${s}`; log.push(line); if (log.length > 300) log.shift(); broadcast({ t:'log', line }, 'control'); console.log(line); }

/* ---------------------------------------------------------------- themes */
function themeList(){
  const out = [];
  let dirs = [];
  try { dirs = fs.readdirSync(THEMES_DIR, { withFileTypes: true }).filter(d => d.isDirectory() && /^[a-z0-9-]{1,40}$/.test(d.name)); } catch {}
  for (const d of dirs){
    try {
      const m = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, d.name, 'theme.json'), 'utf8'));
      out.push({ id: d.name, name: String(m.name || d.name).slice(0, 80), tier: m.tier === 'pro' ? 'pro' : 'free', commercialReady: !!m.commercialReady });
    } catch {}
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
function effectiveTheme(){
  const list = themeList(), t = list.find(x => x.id === settings.theme);
  if (t && (t.tier === 'free' || isPro())) return t.id;
  return (list.find(x => x.id === 'classic') || list.find(x => x.tier === 'free') || { id: 'classic' }).id;
}

/* --------------------------------------------------------------- license */
let licenseToken = '', license = { ok:false, error:'' };
function loadLicense(token){ licenseToken = String(token || '').trim(); license = verifyLicense(licenseToken); }
function licenseInfo(){
  const p = license.ok ? license.payload : null;
  const mismatch = !!(p && p.tiktok && tiktokState.status === 'connected' && normUser(tiktokState.uniqueId) !== p.tiktok);
  return {
    tier: p && p.tier === 'pro' && !mismatch ? 'pro' : 'free',
    to: p?.sub || '', tiktok: p?.tiktok || '', exp: p?.exp || '', id: p?.id || '',
    error: mismatch ? `Mã bản quyền chỉ dùng cho @${p.tiktok}` : (licenseToken && !license.ok ? license.error : ''),
    maxSeats: p && p.tier === 'pro' && !mismatch ? 100 : FREE_MAX_SEATS,
  };
}
const isPro = () => licenseInfo().tier === 'pro';
const maxSeats = () => licenseInfo().maxSeats;

const CAPS = [24, 36, 64, 100];
// Halls with painted cushions (theme.json → seats) start with exactly that many seats, so a small crowd sits on them.
// The cushions follow the hall.jpg actually shown: a theme still borrowing its fallback's hall borrows its cushions too.
const themeCache = new Map();
function readTheme(id){
  const c = themeCache.get(id); if (c && Date.now() - c.at < 5000) return c.m;
  let m = null; try { m = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, id, 'theme.json'), 'utf8')); } catch {}
  themeCache.set(id, { m, at: Date.now() }); return m;
}
function hallSlots(){
  const id = effectiveTheme(), m = readTheme(id); if (!m) return 0;
  const own = typeof m.hall === 'string' && fs.existsSync(path.join(THEMES_DIR, id, path.basename(m.hall)));
  const src = own ? m : (/^[a-z0-9-]{1,40}$/.test(String(m.fallback || '')) ? readTheme(m.fallback) : null);
  if (!src || !Array.isArray(src.seats) || !src.seats.length) return [];
  const k = src.seats.length, e = Array.isArray(src.seatsExtra) ? src.seatsExtra.length : 0;
  return e ? [k, k + e] : [k];
}
function capacity(){
  const max = maxSeats();
  if (settings.seatMode !== 'auto') return Math.min(+settings.seatMode, max);
  const t = hallSlots(), top = t[t.length - 1] || 0, caps = top ? [...t, ...CAPS.filter(c => c > top)] : CAPS;
  const n = viewers.size; return caps.find(c => n <= c && c <= max) || max;
}
function trimToCapacity(){                       // after a downgrade: the longest-quiet non-donors stand up first
  const max = maxSeats();
  while (viewers.size > max){
    const quiet = [...viewers.values()].sort((a,b) => (a.coins > 0) - (b.coins > 0) || a.lastAt - b.lastAt)[0];
    viewers.delete(quiet.id); broadcast({ t:'leave', id: quiet.id });
  }
}
function pushPlan(){ trimToCapacity(); broadcast({ t:'license', license: licenseInfo() }); broadcast({ t:'settings', settings, theme: effectiveTheme(), cap: capacity() }); }

/* skins: sprites that exist in the theme. */
// A comment changes the outfit only when it IS the keyword (≤ 3 words), so "Nam mô A Di Đà Phật" never reads as "nam".
const SKIN_WORDS = [
  ['master', ['cao tăng','cao tang']], ['monk', ['sư','su','sư thầy','su thay','thầy','thay']], ['nun', ['ni','ni cô','ni co','sư cô','su co']],
  ['child', ['tiểu','tieu','chú tiểu','chu tieu','bé','be']], ['granny', ['bà','ba','áo nâu','ao nau','cụ','cu']],
  ['woman', ['nữ','nu','chị','chi','gái','gai']], ['man', ['nam','anh','trai']],
];
function skinFromText(t){
  const w = String(t).toLowerCase().normalize('NFC').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!w || w.split(' ').length > 3) return null;
  for (const [skin, words] of SKIN_WORDS) if (words.some(k => w === k || w.startsWith(k + ' '))) return skin;
  return null;
}
const DEFAULT_SKINS = ['man', 'woman', 'woman', 'man', 'granny'];

/* ------------------------------------------------------------ moderation */
// Comments are shown on stream and may be read aloud, so the operator is accountable for them.
// Hidden: words from the block list, links (TikTok forbids pointing viewers to other platforms) and long
// digit runs (phone / bank account numbers: the classic "chuyển khoản công đức" scam).
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|vn|me|io|xyz|link|shop|top|info|site|online|click|ly)\b)/i;
const DIGITS_RE = /(\d[\s.\-]?){8,}/;
let blockCache = { src: null, words: [] };
function blockWords(){
  if (blockCache.src !== settings.blockWords) blockCache = { src: settings.blockWords, words: String(settings.blockWords).toLowerCase().normalize('NFC').split(/[,\n]/).map(w => w.trim().replace(/\s+/g, ' ')).filter(Boolean) };
  return blockCache.words;
}
function blockedReason(text){
  const s = String(text || '');
  if (URL_RE.test(s)) return 'link';
  if (DIGITS_RE.test(s)) return 'số điện thoại/tài khoản';
  const t = ' ' + s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
  const w = blockWords().find(k => t.includes(' ' + k + ' '));
  return w ? 'từ cấm' : '';
}
const safeName = (n) => blockedReason(n) ? 'Phật tử' : n;

/* ------------------------------------------------------- community hooks */
// 1) Niệm chung: chant comments (and likes) fill a shared counter; at the goal the whole hall rings the bell.
const beads = { n: 0, round: 0 };
const CHANT_RE = /(a di đà|adi?da|nam mô|nam mo|mô phật|mo phat|niệm phật|quán thế âm|thích ca)/i;
const likeAt = new Map();
function addBeads(k){
  const goal = settings.beadGoal; if (!goal) return;
  beads.n += k;
  if (beads.n >= goal){
    beads.n = 0; beads.round++;
    broadcast({ t:'beads', ...beads, goal, done:true });
    say(`Cả chánh điện đã cùng niệm đủ ${goal} biến, vòng thứ ${beads.round}. Nguyện cho tất cả mọi người thân tâm an lạc.`, { tag:'beads' });
    addLog(`📿 Niệm chung đủ ${goal} · vòng ${beads.round}`);
  } else broadcast({ t:'beads', ...beads, goal });
}
// 2) Hồi hướng: every few minutes, read the names of people who are present right now. Free for everyone.
let dedicateTimer = null;
function dedicate(){
  const live = isLive();
  const names = [...viewers.values()].filter(v => !live || !v.demo).sort((a,b) => b.lastAt - a.lastAt).slice(0, 12).map(v => v.name);
  if (!names.length) return;
  broadcast({ t:'dedicate', names });
  say(`Nguyện hồi hướng cho ${names.map(spoken).join(', ')}, cùng tất cả các bạn đang có mặt, thân tâm an lạc, vạn sự bình an.`, { tag:'dedicate' });
}
function scheduleDedicate(){ clearInterval(dedicateTimer); if (settings.dedicateEveryMin > 0) dedicateTimer = setInterval(dedicate, settings.dedicateEveryMin * 60_000); }
// 3) Người quen: count the days each viewer showed up; greet them when they come back on a new day.
let regulars = {}, regularsDirty = false;
try { regulars = JSON.parse(fs.readFileSync(REGULARS_FILE, 'utf8')) || {}; } catch { regulars = {}; }
setInterval(() => {
  if (!regularsDirty) return; regularsDirty = false;
  const ids = Object.keys(regulars);
  if (ids.length > 50_000) for (const id of ids.sort((a,b) => regulars[a].d.localeCompare(regulars[b].d)).slice(0, ids.length - 50_000)) delete regulars[id];
  try { fs.writeFileSync(REGULARS_FILE, JSON.stringify(regulars)); } catch {}
}, 15_000).unref();
function markDay(v){
  if (v.demo || String(v.id).startsWith('sim_')) return { days: 0, back: false };
  const today = new Date().toLocaleDateString('sv');            // YYYY-MM-DD, local time
  const r = regulars[v.id] ||= { d: '', n: 0 };
  if (r.d === today) return { days: r.n, back: false };
  r.n++; r.d = today; regularsDirty = true;
  return { days: r.n, back: r.n >= 2 };
}

function pub(v){ return { id:v.id, name:v.name, skin:v.skin, avatar:v.avatar||'', coins:v.coins, demo:!!v.demo, days:v.days||0 }; }
function snapshot(){ return { t:'state', settings, theme: effectiveTheme(), themes: themeList(), license: licenseInfo(), viewers:[...viewers.values()].map(pub), cap: capacity(), startedAt, tiktok: tiktokState, beads: { ...beads, goal: settings.beadGoal } }; }

function seat(id, name, opts = {}){
  let v = viewers.get(id);
  if (v){ v.lastAt = Date.now(); if (opts.avatar) v.avatar = opts.avatar; return { v, isNew:false }; }
  if (viewers.size >= maxSeats()){               // full: the longest-quiet non-donor stands up
    const quiet = [...viewers.values()].filter(x => x.coins === 0).sort((a,b) => a.lastAt - b.lastAt)[0];
    if (!quiet) return { v:null, isNew:false };
    viewers.delete(quiet.id); broadcast({ t:'leave', id: quiet.id });
  }
  v = { id, name: safeName(String(name || id).slice(0, 18)), skin: opts.skin || DEFAULT_SKINS[viewers.size % DEFAULT_SKINS.length],
        avatar: opts.avatar || '', coins: 0, joinedAt: Date.now(), lastAt: Date.now(), demo: !!opts.demo };
  const { days, back } = markDay(v); v.days = days;
  viewers.set(id, v);
  broadcast({ t:'join', v: pub(v), cap: capacity(), back });
  if (back && settings.greetRegulars && ttsQueue.length < 3) say(`Chào mừng ${spoken(v.name)} quay lại, ngày thứ ${days} cùng tụng kinh.`, { tag:'greet', id });
  return { v, isNew:true };
}

/* ------------------------------------------------------------- events in */
let lastChatPrayerAt = 0;
const PRAYER_RE = /(cầu|nguyện|mong|xin|chúc|sám hối|bình an|an lạc|khỏe|mạnh khỏe)/i;
function onChat(id, name, text, avatar){
  text = String(text || '').slice(0, 120);
  const want = skinFromText(text);
  const { v, isNew } = seat(id, name, { avatar, skin: want || undefined });
  if (!v) return;
  if (!isNew && want && want !== v.skin){ v.skin = want; broadcast({ t:'skin', id, skin: want }); }
  const why = blockedReason(text);
  if (why){ addLog(`🙈 Ẩn bình luận của ${v.name} (${why})`); return; }
  v.lastText = text; v.lastTextAt = Date.now();
  broadcast({ t:'chat', id, name: v.name, text });
  if (CHANT_RE.test(text)) addBeads(1);
  // free prayers: a viewer does not need to send a gift for their wish to be read
  if (settings.chatPrayers && !want && text.length >= 12 && PRAYER_RE.test(text) && Date.now() - lastChatPrayerAt > 20_000 && ttsQueue.length < 3){
    lastChatPrayerAt = Date.now();
    say(`${spoken(v.name)} nguyện: ${text}.`, { tag:'prayer', id });
  }
}

function onGift(id, name, giftName, count, diamonds, avatar){
  giftName = String(giftName || 'quà').slice(0, 30); count = Math.max(1, Math.min(9999, +count || 1));
  const { v } = seat(id, name, { avatar });
  if (!v) return;
  const coins = Math.max(1, (diamonds || 1) * (count || 1));
  v.coins += coins;
  const own = !!(v.lastText && Date.now() - v.lastTextAt < 90_000 && v.lastText.length > 6);
  const traditional = settings.wording === 'truyen-thong';
  const prayer = own ? v.lastText : traditional ? pickPrayer() : 'Chúc bạn thân tâm an lạc';
  const tier = coins >= 99 ? 3 : coins >= 10 ? 2 : 1;
  const times = count > 1 ? ', ' + count + ' lần' : '';
  const line = traditional
    ? `Nam mô A Di Đà Phật. Phật tử ${spoken(v.name)} thành tâm dâng ${giftName}${times}. ${prayer}.`
    : `Xin cảm ơn ${spoken(v.name)} đã gửi tặng ${giftName}${times}. ${own ? 'Lời nguyện của bạn: ' : ''}${prayer}.`;
  broadcast({ t:'gift', id, name: v.name, giftName, count, coins, total: v.coins, tier, prayer, own });
  if (settings.gifts.readAll || coins >= settings.gifts.minDiamonds) say(line, { tag:'gift', id });
}

function onLike(id, n){
  broadcast({ t:'like', id, n });
  if (!settings.beadLikes || !id) return;
  const now = Date.now();
  if (now - (likeAt.get(id) || 0) < 10_000) return;
  likeAt.set(id, now); if (likeAt.size > 5000) likeAt.clear();
  addBeads(1);
}

function pickPrayer(){
  const P = ['Nguyện cầu gia đạo bình an, vạn sự cát tường', 'Nguyện cầu cha mẹ mạnh khỏe, sống lâu', 'Nguyện hồi hướng công đức cho khắp pháp giới chúng sinh',
             'Nguyện cầu thân tâm an lạc, phiền não tiêu trừ', 'Nguyện cầu công việc hanh thông, gia đình hạnh phúc'];
  return P[Math.floor(Math.random() * P.length)];
}
const spoken = s => String(s).replace(/[_@.]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').trim() || 'ẩn danh';

/* ------------------------------------------------------------------ TTS */
const ttsQueue = []; let ttsBusy = false, ttsSeq = 0;
function esc(s){ return String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); }
function say(text, meta = {}){ if (ttsQueue.length >= 15) { addLog('Hàng đợi giọng đọc đầy, bỏ qua 1 câu'); return; } ttsQueue.push({ text: String(text).slice(0, 500), meta }); pumpTTS(); }
async function pumpTTS(){
  if (ttsBusy || !ttsQueue.length) return; ttsBusy = true;
  const { text, meta } = ttsQueue.shift();
  try {
    const file = `tts_${Date.now()}_${++ttsSeq}.mp3`;
    const tts = new MsEdgeTTS();
    await tts.setMetadata(settings.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(esc(text), { pitch: `${settings.pitch >= 0 ? '+' : ''}${settings.pitch}Hz`, rate: `${settings.rate >= 0 ? '+' : ''}${settings.rate}%` });
    const chunks = [];
    await new Promise((res, rej) => { audioStream.on('data', c => chunks.push(c)); audioStream.on('close', res); audioStream.on('error', rej); });
    try { tts.close(); } catch {}
    fs.writeFileSync(path.join(TTS_DIR, file), Buffer.concat(chunks));
    broadcast({ t:'tts', url: `/live/tts/${file}`, text, ...meta });
    const old = fs.readdirSync(TTS_DIR).sort(); while (old.length > 40) { try { fs.unlinkSync(path.join(TTS_DIR, old.shift())); } catch {} }
  } catch (e) { addLog('TTS lỗi: ' + (e?.message || e)); }
  ttsBusy = false; setTimeout(pumpTTS, 50);
}

const CHANTS = [
  'Nam mô Bổn Sư Thích Ca Mâu Ni Phật. Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sinh, đều trọn thành Phật đạo.',
  'Nam mô A Di Đà Phật. Nguyện sanh Tây Phương Tịnh Độ trung, cửu phẩm liên hoa vi phụ mẫu.',
  'Nam mô Đại Bi Quán Thế Âm Bồ Tát. Nguyện cho tất cả chúng sinh thân tâm an lạc, tai qua nạn khỏi.',
  'Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời, chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.',
];
let chantIdx = 0, chantTimer = null;
function chant(){ const text = CHANTS[chantIdx++ % CHANTS.length]; broadcast({ t:'chant', text }); say(text, { tag:'chant' }); }
function scheduleChant(){ clearInterval(chantTimer); if (settings.autoChant) chantTimer = setInterval(chant, Math.max(1, settings.chantEveryMin) * 60_000); }

/* --------------------------------------------------------------- TikTok */
let TikTokLib = null;
const isLive = () => tiktokState.status === 'connected';
async function connectTikTok(uniqueId){
  uniqueId = normUser(uniqueId);
  if (!uniqueId) return;
  await disconnectTikTok();
  tiktokState = { status: 'connecting', uniqueId, error: '' }; broadcast({ t:'tiktok', ...tiktokState });
  try {
    TikTokLib ||= await import('tiktok-live-connector');
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = TikTokLib;
    const conn = new TikTokLiveConnection(uniqueId, { enableExtendedGiftInfo: true, processInitialData: false });
    const av = u => u?.profilePicture?.url?.[0] || u?.profilePicture?.urlList?.[0] || u?.avatarThumb?.urlList?.[0] || u?.avatarThumb?.url?.[0] || '';
    const nm = u => u?.nickname || u?.uniqueId || 'ẩn danh';
    conn.on(WebcastEvent.CHAT, d => onChat(d.user?.uniqueId || d.user?.userId, nm(d.user), d.comment, av(d.user)));
    conn.on(WebcastEvent.GIFT, d => {
      const type = d.giftDetails?.giftType ?? d.extendedGiftInfo?.type;
      if (type === 1 && !d.repeatEnd) return;                       // streak still running
      const gname = d.giftDetails?.giftName || d.extendedGiftInfo?.name || 'quà';
      const dia = d.giftDetails?.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? 1;
      onGift(d.user?.uniqueId || d.user?.userId, nm(d.user), gname, d.repeatCount || 1, dia, av(d.user));
      addLog(`🎁 ${nm(d.user)} tặng ${gname} x${d.repeatCount || 1}`);
    });
    conn.on(WebcastEvent.MEMBER, d => { if (settings.joinOnEnter) seat(d.user?.uniqueId, nm(d.user), { avatar: av(d.user) }); });
    conn.on(WebcastEvent.LIKE, d => onLike(d.user?.uniqueId, d.likeCount || 1));
    conn.on(ControlEvent.DISCONNECTED, () => { tiktokState = { ...tiktokState, status: 'disconnected' }; broadcast({ t:'tiktok', ...tiktokState }); addLog('TikTok: mất kết nối'); pushPlan(); });
    conn.on(ControlEvent.ERROR, e => addLog('TikTok lỗi: ' + (e?.info || e?.message || e)));
    const st = await conn.connect();
    tiktok = conn;
    tiktokState = { status: 'connected', uniqueId, error: '', roomId: st?.roomId || '' };
    addLog(`✅ Đã kết nối live @${uniqueId}`);
    clearSimulated('Đã vào LIVE thật: dọn bot và người mẫu');
    const li = licenseInfo(); if (li.error) addLog('⚠️ ' + li.error + '. Đang chạy chế độ miễn phí.');
  } catch (e) {
    tiktokState = { status: 'error', uniqueId, error: String(e?.message || e) };
    addLog(`❌ Không kết nối được @${uniqueId}: ${tiktokState.error}`);
  }
  broadcast({ t:'tiktok', ...tiktokState });
  pushPlan();
}
async function disconnectTikTok(){ if (tiktok){ try { await tiktok.disconnect(); } catch {} tiktok = null; } tiktokState = { status:'idle', uniqueId:'', error:'' }; broadcast({ t:'tiktok', ...tiktokState }); }

/* ------------------------------------------------------------- test data */
// Bots, sample crowds and simulated gifts are for rehearsal only. They are refused while a real LIVE is
// connected: fake engagement on a real stream breaks TikTok's rules and misleads viewers.
const DEMO_NAMES = ['Diệu Hạnh','Minh Tâm','Thiện Đức','Huệ An','Tịnh Nhã','Quảng Trí','Chơn Như','Pháp Hỷ','Nguyên Thanh','Tâm Đăng','Diệu Liên','Trí Hải','Phước Lộc','Hạnh Nguyện','Như Ý','Bảo Châu','Thanh Lương','Từ Tâm','An Lạc','Giác Hoa','Tuệ Minh','Liên Hương','Thu Hà','Ngọc Lan','Đức Anh','Hải Đăng','Mai Anh','Phương Thảo','Trung Kiên','Quang Huy','Bảo Ngọc','Diệu Linh'];
function fillDemo(n){
  const have = [...viewers.values()].filter(v => v.demo).length;
  for (let i = have; i < n && viewers.size < maxSeats(); i++){
    const name = DEMO_NAMES[i % DEMO_NAMES.length] + (i >= DEMO_NAMES.length ? ' ' + (Math.floor(i / DEMO_NAMES.length) + 1) : '');
    seat('demo_' + i, name, { demo: true, skin: ['man','woman','woman','man','granny','monk','nun','child'][i % 8] });
  }
}
function clearSeats(){ viewers.clear(); broadcast(snapshot()); addLog('Đã làm trống bồ đoàn'); }
function clearSimulated(reason){
  const hadBots = !!botTimer;
  clearInterval(botTimer); botTimer = null;
  let n = 0;
  for (const [id, v] of [...viewers]) if (v.demo || id.startsWith('sim_')) { viewers.delete(id); broadcast({ t:'leave', id }); n++; }
  if (hadBots) broadcast({ t:'bots', on:false }, 'control');
  if (n || hadBots) addLog(`🧹 ${reason} (${n} chỗ)`);
}
const REHEARSAL_ONLY = new Set(['chat', 'gift', 'fill', 'bots']);

/* ------------------------------------------------------------- control */
function onControl(m){
  if (REHEARSAL_ONLY.has(m.cmd) && isLive() && !(m.cmd === 'bots' && !m.on)){
    addLog('⛔ Đang LIVE thật: thử tương tác, người mẫu và bot bị khóa để tránh tương tác giả.'); return;
  }
  switch (m.cmd){
    case 'connect': connectTikTok(m.uniqueId); break;
    case 'disconnect': disconnectTikTok().then(pushPlan); addLog('Đã ngắt kết nối TikTok'); break;
    case 'chat': { const n = String(m.name || 'Khách').slice(0, 18); onChat('sim_' + n, n, String(m.text || 'Nam mô A Di Đà Phật').slice(0, 120)); break; }
    case 'gift': { const n = String(m.name || 'Khách').slice(0, 18); onGift('sim_' + n, n, String(m.gift || 'Hoa hồng').slice(0, 30), clamp(m.count, 1, 99), clamp(m.diamonds, 1, 50000)); break; }
    case 'fill': fillDemo(clamp(m.n, 1, 100)); addLog(`Đổ người mẫu: ${viewers.size} người`); break;
    case 'clear': clearSeats(); break;
    case 'bell': broadcast({ t:'bell' }); break;
    case 'mo': broadcast({ t:'mo1' }); break;
    case 'chant': chant(); break;
    case 'dedicate': dedicate(); break;
    case 'say': if (m.text) say(String(m.text).slice(0, 400), { tag:'say' }); break;
    case 'settings':
      applySettings(m.settings || {}); saveSettings();
      scheduleChant(); scheduleDedicate(); broadcast({ t:'settings', settings, theme: effectiveTheme(), cap: capacity() }); broadcast({ t:'beads', ...beads, goal: settings.beadGoal }); break;
    case 'license': {
      const token = String(m.key || '').trim().slice(0, 3000);
      const r = verifyLicense(token);
      if (!token){ loadLicense(''); try { fs.unlinkSync(LICENSE_FILE); } catch {} addLog('Đã gỡ mã bản quyền, quay về bản miễn phí'); }
      else if (r.ok){ loadLicense(token); fs.writeFileSync(LICENSE_FILE, token, { mode: 0o600 }); addLog(`🔑 Kích hoạt ${r.payload.tier.toUpperCase()} cho ${r.payload.sub}${r.payload.tiktok ? ' · @' + r.payload.tiktok : ''}${r.payload.exp ? ' · đến ' + r.payload.exp : ''}`); }
      else { addLog('❌ Mã bản quyền không hợp lệ: ' + r.error); broadcast({ t:'license', license: { ...licenseInfo(), error: r.error } }, 'control'); return; }
      pushPlan(); break;
    }
    case 'bots': setBots(!!m.on, +m.n || 12, m.pace); break;
  }
}

// Only known keys, right types, sane ranges: the panel is local, but nothing from the socket is trusted blindly.
const SETTING_RULES = {
  title: v => String(v).slice(0, 40), subtitle: v => String(v).slice(0, 60),
  theme: v => /^[a-z0-9-]{1,40}$/.test(String(v)) ? String(v) : settings.theme,
  voice: v => ['vi-VN-NamMinhNeural', 'vi-VN-HoaiMyNeural'].includes(v) ? v : settings.voice,
  pitch: v => clamp(v, -50, 50), rate: v => clamp(v, -50, 50), moBpm: v => clamp(v, 20, 120), chantEveryMin: v => clamp(v, 1, 60),
  music: Boolean, mo: Boolean, autoChant: Boolean, joinOnEnter: Boolean,
  seatMode: v => ['auto', '24', '36', '64', '100'].includes(String(v)) ? String(v) : 'auto',
  wording: v => ['an-toan', 'truyen-thong'].includes(v) ? v : 'an-toan',
  boardTitle: v => String(v).slice(0, 24) || 'Tri Ân',
  showCoins: Boolean, showDisclaimer: Boolean, chatPrayers: Boolean,
  disclaimer: v => String(v).slice(0, 160),
  blockWords: v => String(v).slice(0, 3000),
  beadGoal: v => [0, 21, 54, 108, 1080].includes(+v) ? +v : 108, beadLikes: Boolean, greetRegulars: Boolean,
  dedicateEveryMin: v => clamp(v, 0, 120),
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));
function applySettings(o){ for (const [k, fn] of Object.entries(SETTING_RULES)) if (k in o) settings[k] = fn(o[k]); }
function saveSettings(){
  const o = {}; for (const k of Object.keys(SETTING_RULES)) o[k] = settings[k];
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(o, null, 2)); } catch (e) { addLog('Không lưu được cài đặt: ' + e.message); }
}

/* ----------------------------------------------------------------- bots */
let botTimer = null;
const BOT_LINES = ['Nam mô A Di Đà Phật', 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật', 'Cầu cho gia đình bình an', 'Con xin thành tâm sám hối', 'nữ', 'nam', 'bà',
  'Nguyện cầu cha mẹ mạnh khỏe', 'Mô Phật, an lạc quá', 'Chúc mọi người một ngày bình an', 'sư', 'Cầu công việc hanh thông'];
function setBots(on, n, pace){
  clearInterval(botTimer); botTimer = null;
  if (on){
    n = clamp(n, 1, 100);
    for (let i = 0; i < n; i++) seat('bot_' + i, DEMO_NAMES[(i + 7) % DEMO_NAMES.length] + ' ·bot', { demo: true });
    const every = { slow: 4000, mid: 1800, fast: 700 }[pace] || 1800;
    botTimer = setInterval(() => {
      const ids = [...viewers.keys()].filter(id => id.startsWith('bot_')); if (!ids.length) return;
      const id = ids[Math.floor(Math.random() * ids.length)], v = viewers.get(id), r = Math.random();
      if (r < .62) onChat(id, v.name, BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]);
      else if (r < .9) onLike(id, 1 + Math.floor(Math.random() * 4));
      else if (r < .985) onGift(id, v.name, 'Hoa hồng', 1 + Math.floor(Math.random() * 3), 1);
      else onGift(id, v.name, 'Đèn hoa sen', 1, 99);
    }, every);
    addLog(`🤖 Bật ${n} bot, nhịp ${pace}`);
  } else {
    for (const id of [...viewers.keys()]) if (id.startsWith('bot_')) { viewers.delete(id); broadcast({ t:'leave', id }); }
    addLog('🤖 Tắt bot');
  }
  broadcast({ t:'bots', on }, 'control');
}

/* ------------------------------------------------------------ boot state */
try { applySettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))); } catch {}
try { loadLicense(process.env.CHUA_LICENSE || fs.readFileSync(LICENSE_FILE, 'utf8')); } catch { loadLicense(process.env.CHUA_LICENSE || ''); }
scheduleChant(); scheduleDedicate();

/* -------------------------------------------------------------- server */
// Security notes (this file is meant to be shared):
//  • listens on 127.0.0.1 only; nothing is reachable from the LAN or internet unless HOST is changed on purpose
//  • Host header must be localhost/127.0.0.1 (blocks DNS-rebinding pages from talking to the server)
//  • WebSocket only accepts pages served by this server (Origin check), so other sites open in the
//    same browser cannot send control commands
//  • static files: only /assets and /live, no dot-files, no node_modules, no server source, no live/data, no path escapes
//  • no TikTok password, cookie or session is ever used or stored; only public room events are read
const HOST = process.env.HOST || '127.0.0.1';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
const okHost = h => ALLOWED_HOSTS.has(String(h || '').toLowerCase());
const SEP = path.sep;
function resolveStatic(urlPath){
  let p = urlPath === '/' ? '/live/control.html' : urlPath;
  if (!/^\/(assets|live)\//.test(p)) return null;
  if (p.startsWith('/live/data/')) return null;                                       // settings + license key
  if (p.split('/').some(seg => seg.startsWith('.') || seg === 'node_modules')) return null;
  if (/\.(mjs|json|md|log|key|pem)$/i.test(p) && !p.startsWith('/assets/')) return null;      // never serve server code / package files
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + SEP)) return null;
  return file;
}
const server = http.createServer((req, res) => {
  if (!okHost(req.headers.host)) { res.writeHead(421).end('wrong host'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  const file = resolveStatic(p);
  if (!file) { res.writeHead(404).end('not found'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': p.startsWith('/live/tts/') ? 'no-store' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  });
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024,
  verifyClient: ({ origin, req }) => {
    if (!okHost(req.headers.host)) return false;
    if (!origin) return true;                                   // OBS / non-browser clients send no Origin
    try { return okHost(new URL(origin).host); } catch { return false; }
  } });
function broadcast(msg, only){ const s = JSON.stringify(msg); for (const c of wss.clients) if (c.readyState === 1 && (!only || c.role === only)) c.send(s); }
wss.on('connection', (ws, req) => {
  ws.role = new URL(req.url, 'http://x').searchParams.get('role') === 'control' ? 'control' : 'overlay';
  ws.send(JSON.stringify(snapshot()));
  if (ws.role === 'control') ws.send(JSON.stringify({ t:'logs', lines: log }));
  ws.on('message', buf => {
    if (ws.role !== 'control') return;                          // overlays only listen
    try { const m = JSON.parse(buf); if (m && m.t === 'ctl') onControl(m); } catch (e) { addLog('Lệnh lỗi: ' + e.message); }
  });
});
server.listen(PORT, HOST, () => {
  addLog(`Server chạy tại http://localhost:${PORT}  ·  Bảng điều khiển: http://localhost:${PORT}/live/control.html  ·  Overlay: http://localhost:${PORT}/live/overlay.html`);
  const li = licenseInfo();
  addLog(li.tier === 'pro' ? `🔑 Bản PRO · ${li.to}${li.tiktok ? ' · @' + li.tiktok : ''}${li.exp ? ' · đến ' + li.exp : ''}` : `Bản miễn phí (tối đa ${FREE_MAX_SEATS} chỗ)${li.error ? ' · ' + li.error : ''}`);
});
