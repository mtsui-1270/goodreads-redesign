/* Goodreads redesign: Book Jam mock sync server
 * Plain node:http + ws. All state is in memory and disappears on restart.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = path.resolve(__dirname, "..");

const BOOKS = {
  women: { title: "The Women", pages: 400 }, octo: { title: "Remarkably Bright Creatures", pages: 360 },
  circus: { title: "The Night Circus", pages: 360 }, bee: { title: "The Bee Sting", pages: 360 },
  evelyn: { title: "The Seven Husbands of Evelyn Hugo", pages: 360 }, overstory: { title: "The Overstory", pages: 360 },
  tomorrow: { title: "Tomorrow, and Tomorrow, and Tomorrow", pages: 360 }, sea: { title: "Sea of Tranquility", pages: 360 },
  lessons: { title: "Lessons in Chemistry", pages: 360 }, midnight: { title: "The Midnight Library", pages: 360 },
  circe: { title: "Circe", pages: 360 }, hail: { title: "Project Hail Mary", pages: 360 },
  klara: { title: "Klara and the Sun", pages: 360 }, pachinko: { title: "Pachinko", pages: 360 }
};
const CHECKPOINTS = [{ p: 62, l: "Ch. 5" }, { p: 140, l: "Ch. 10" }, { p: 230, l: "Ch. 14" }, { p: 300, l: "Ch. 19" }, { p: 370, l: "Ch. 24" }];
const BOTS = [{ id: "bot-ana", name: "Ana R." }, { id: "bot-james", name: "James T." }];
const BOT_LINES = ["That letter… I was NOT ready 😭", "Underlined this whole paragraph. Chills.", "No spoilers but the next 20 pages 🔥",
  "This friendship is everything", "This chapter feels like a turning point", "Pausing for tea ☕"];
const EMOJI = ["🤎", "😱", "😭", "🔥", "📖", "👏"];

const jams = new Map();      // code -> jam
const sockets = new Map();   // userId -> ws (latest)
let msgSeq = 1;

/* ---------------- helpers ---------------- */
const clean = (s, n = 40) => String(s == null ? "" : s).replace(/[<>]/g, "").trim().slice(0, n);
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c;
  do { c = "JAM-" + Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(""); } while (jams.has(c));
  return c;
}
const humans = jam => [...jam.members.values()].filter(m => !m.bot);
function publicJam(jam) {
  return {
    code: jam.code, book: jam.book, title: jam.title, pages: jam.pages, hostId: jam.hostId, paused: jam.paused,
    createdAt: jam.createdAt, cps: jam.cps,
    members: [...jam.members.values()].map(m => ({ id: m.id, name: m.name, page: m.page, bot: !!m.bot, online: m.bot || m.online }))
  };
}
function viewMsg(msg, member) {
  if (msg.sys || msg.from === member.id || member.page >= msg.page) return msg;
  return { id: msg.id, from: msg.from, name: msg.name, page: msg.page, ts: msg.ts, locked: true };
}
function broadcastState(jam) {
  const state = publicJam(jam);
  for (const m of humans(jam)) send(sockets.get(m.id), { type: "state", jam: state });
}
function post(jam, msg) {
  msg.id = msgSeq++; msg.ts = Date.now();
  jam.msgs.push(msg);
  if (jam.msgs.length > 200) jam.msgs.shift();
  for (const m of humans(jam)) send(sockets.get(m.id), { type: "msg", msg: viewMsg(msg, m) });
}
const sys = (jam, text, extra = {}) => post(jam, { sys: true, page: 0, text, ...extra });

function setPage(jam, member, page) {
  const old = member.page;
  member.page = Math.max(1, Math.min(jam.pages, Math.round(+page || 1)));
  // spoiler unlocks: resend messages that just became readable for this member
  if (!member.bot && member.page > old) {
    const ws = sockets.get(member.id);
    for (const msg of jam.msgs) if (!msg.sys && msg.from !== member.id && msg.page > old && msg.page <= member.page) send(ws, { type: "msg", msg, unlocked: true });
  }
  if (member.id === jam.hostId) {
    for (const c of jam.cps) if (!c.open && member.page >= c.p) {
      c.open = true;
      sys(jam, `📍 Checkpoint reached: ${c.l}. Discussion is open!`, { checkpoint: c.l });
    }
  }
}
function removeMember(jam, id, reason) {
  const m = jam.members.get(id);
  if (!m) return;
  jam.members.delete(id);
  sys(jam, `${m.name} ${reason || "left the Jam"}.`);
  if (jam.hostId === id) {
    const next = humans(jam).find(x => x.online) || humans(jam)[0];
    if (next) { jam.hostId = next.id; sys(jam, `★ ${next.name} is now the host.`); }
  }
  if (!humans(jam).length) { stopBots(jam); jams.delete(jam.code); return; }
  broadcastState(jam);
}

/* ---------------- bots (optional demo friends) ---------------- */
function startBots(jam) {
  if (jam.botTimer) return;
  const host = jam.members.get(jam.hostId);
  BOTS.forEach((b, i) => jam.members.set(b.id, { id: b.id, name: b.name, page: Math.max(1, (host ? host.page : 100) - 12 - i * 25), bot: true }));
  sys(jam, "Demo friends joined the Jam.");
  let n = 0;
  jam.botTimer = setInterval(() => {
    n++;
    if (!jam.paused) for (const b of BOTS) { const m = jam.members.get(b.id); if (m && Math.random() > .45) setPage(jam, m, m.page + 1 + Math.floor(Math.random() * 2)); }
    if (n % 3 === 0) { const b = jam.members.get(BOTS[n % 2].id); if (b) post(jam, { from: b.id, name: b.name, page: b.page, text: BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)] }); }
    if (Math.random() > .55) { const b = BOTS[Math.floor(Math.random() * 2)]; for (const h of humans(jam)) send(sockets.get(h.id), { type: "react", emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)], from: b.id, name: b.name }); }
    broadcastState(jam);
  }, 1800);
  broadcastState(jam);
}
function stopBots(jam) {
  if (!jam.botTimer) return;
  clearInterval(jam.botTimer); jam.botTimer = null;
  BOTS.forEach(b => jam.members.delete(b.id));
  if (jams.has(jam.code)) { sys(jam, "Demo friends left."); broadcastState(jam); }
}

/* ---------------- HTTP ---------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok"); }
  if (url.pathname === "/api/jams") {
    const list = [...jams.values()].map(j => {
      const p = publicJam(j);
      return { code: p.code, book: p.book, title: p.title, pages: p.pages, hostName: (j.members.get(j.hostId) || {}).name, hostPage: (j.members.get(j.hostId) || {}).page, members: p.members.map(m => ({ id: m.id, name: m.name, page: m.page })) };
    });
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify(list));
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return fs.readFile(path.join(ROOT, "index.html"), (err, buf) => {
      if (err) { res.writeHead(500); return res.end("index.html missing"); }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(buf);
    });
  }
  res.writeHead(404, { "content-type": "text/plain" }); res.end("not found");
});

/* ---------------- WebSocket ---------------- */
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 16 * 1024 });
wss.on("connection", ws => {
  ws.user = null; ws.code = null;
  ws.on("message", raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === "hello") {
      ws.user = { id: clean(m.id, 24) || "u-" + Math.random().toString(36).slice(2, 8), name: clean(m.name, 30) || "Reader" };
      sockets.set(ws.user.id, ws);
      return send(ws, { type: "hello", id: ws.user.id });
    }
    if (!ws.user) return send(ws, { type: "error", message: "Say hello first" });
    const me = ws.user;
    let jam = ws.code && jams.get(ws.code);
    const member = jam && jam.members.get(me.id);
    const isHost = jam && jam.hostId === me.id;

    switch (m.type) {
      case "create": {
        if (jam) removeMember(jam, me.id);
        const book = BOOKS[m.book] ? m.book : "women";
        const pages = BOOKS[book].pages;
        jam = { code: newCode(), book, title: BOOKS[book].title, pages, hostId: me.id, paused: false, createdAt: Date.now(),
          members: new Map(), msgs: [], cps: CHECKPOINTS.map(c => ({ p: Math.round(c.p / 400 * pages), l: c.l, open: false })), botTimer: null };
        if (jams.size >= 200) return send(ws, { type: "error", message: "Too many live Jams on this demo server" });
        jams.set(jam.code, jam);
        const start = Math.max(1, Math.min(pages, +m.page || Math.round(pages * .62)));
        jam.members.set(me.id, { id: me.id, name: me.name, page: start, online: true });
        jam.cps.forEach(c => { c.open = start >= c.p; });   // chapters already behind the host start open
        ws.code = jam.code;
        send(ws, { type: "created", code: jam.code });
        broadcastState(jam);
        sys(jam, `${me.name} started a Jam for “${jam.title}”. Share code ${jam.code} to invite friends.`);
        if (m.bots) startBots(jam);
        break;
      }
      case "join": {
        const code = clean(m.code, 12).toUpperCase();
        const target = jams.get(code.startsWith("JAM-") ? code : "JAM-" + code);
        if (!target) return send(ws, { type: "error", code: "notfound", message: `No live Jam with code ${code}` });
        if (jam && jam !== target) removeMember(jam, me.id);
        ws.code = target.code;
        const existing = target.members.get(me.id);
        if (existing) { existing.online = true; existing.name = me.name; }
        else {
          const host = target.members.get(target.hostId);
          const start = +m.page || Math.max(1, (host ? host.page : 1) - 40);
          target.members.set(me.id, { id: me.id, name: me.name, page: Math.max(1, Math.min(target.pages, start)), online: true });
          sys(target, `${me.name} joined the Jam.`);
        }
        const mem = target.members.get(me.id);
        broadcastState(target);
        send(ws, { type: "history", msgs: target.msgs.map(x => viewMsg(x, mem)) });
        break;
      }
      case "leave": if (jam) { removeMember(jam, me.id); ws.code = null; } send(ws, { type: "left" }); break;
      case "rename":
        me.name = clean(m.name, 30) || me.name;
        if (member) { member.name = me.name; broadcastState(jam); }
        break;
      case "page":
        if (!member) break;
        setPage(jam, member, m.page);
        broadcastState(jam);
        break;
      case "turn":
        if (!member) break;
        setPage(jam, member, member.page + (+m.delta || 1));
        broadcastState(jam);
        break;
      case "bring":
        if (!isHost) break;
        for (const h of humans(jam)) if (h.id !== me.id) send(sockets.get(h.id), { type: "bring", page: member.page, from: me.id, name: me.name });
        for (const b of jam.members.values()) if (b.bot) setPage(jam, b, member.page);   // bots always accept
        sys(jam, `⟲ ${me.name} asked everyone to jump to p. ${member.page}.`);
        broadcastState(jam);
        break;
      case "pause":
        if (!isHost) break;
        jam.paused = !!m.paused;
        sys(jam, jam.paused ? `❚❚ ${me.name} paused the Jam for discussion.` : "▶ Reading resumed.");
        broadcastState(jam);
        break;
      case "chat": {
        if (!member) break;
        const text = clean(m.text, 400);
        if (text) post(jam, { from: me.id, name: me.name, page: member.page, text });
        break;
      }
      case "react":
        if (!member) break;
        if (!EMOJI.includes(m.emoji)) break;
        for (const h of humans(jam)) if (h.id !== me.id) send(sockets.get(h.id), { type: "react", emoji: m.emoji, from: me.id, name: me.name });
        break;
      case "bots":
        if (!isHost) break;
        m.on ? startBots(jam) : stopBots(jam);
        break;
    }
  });
  ws.on("close", () => {
    if (!ws.user) return;
    if (sockets.get(ws.user.id) === ws) sockets.delete(ws.user.id);
    const jam = ws.code && jams.get(ws.code);
    const mem = jam && jam.members.get(ws.user.id);
    if (!mem || sockets.get(ws.user.id)) return;
    mem.online = false;
    broadcastState(jam);
    // grace period so a page refresh keeps your seat
    setTimeout(() => { const j = jams.get(jam.code); const x = j && j.members.get(mem.id); if (x && !x.online && !sockets.get(mem.id)) removeMember(j, mem.id, "disconnected"); }, 15000);
  });
});
// keep connections alive behind proxies
setInterval(() => wss.clients.forEach(c => { try { c.ping(); } catch {} }), 25000);

server.listen(PORT, HOST, () => console.log(`Book Jam mock server on http://localhost:${PORT}`));
