/* ================= Book Jam (live sync + offline demo) ================= */
const modal = $("#jamModal"), panel = $("#jpanel");
const CHECKPOINTS = [{p: 62, l: "Ch. 5"}, {p: 140, l: "Ch. 10"}, {p: 230, l: "Ch. 14"}, {p: 300, l: "Ch. 19"}, {p: 370, l: "Ch. 24"}];
const LINES = ["That letter… I was NOT ready 😭", "She is so much braver than she gives herself credit for", "The way these scenes are written, I can practically hear them",
  "Pausing for tea, keep going without me ☕", "Just caught up! What did I miss?", "No spoilers but the next 20 pages 🔥", "Underlined this whole paragraph. Chills.",
  "This friendship is everything", "Back! Reading fast to catch up 📖", "This chapter feels like a turning point"];
const EMOJI = ["🤎","😱","😭","🔥","📖","👏"];
const AV_COLORS = ["#66634C","#7A6250","#72583E","#755151","#44422D","#5E5A48","#8C6E50","#5E3F3F"];
const qs = new URLSearchParams(location.search);
const NET_POSSIBLE = /^https?:$/.test(location.protocol) && "WebSocket" in window;
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const hashColor = s => AV_COLORS[[...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % AV_COLORS.length];
const initials = n => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
const firstName = n => String(n || "").split(" ")[0];

/* identity: per-tab (sessionStorage) so two tabs are two people; ?name= overrides */
const me = (() => {
  let id = sessionStorage.getItem("gr-id"); if (!id) { id = "u-" + Math.random().toString(36).slice(2, 8); sessionStorage.setItem("gr-id", id); }
  let name = qs.get("name") || sessionStorage.getItem("gr-name") || ("Reader " + (10 + Math.floor(Math.random() * 89)));
  name = name.slice(0, 30); sessionStorage.setItem("gr-name", name);
  return {id, name};
})();
$("#nameIn").value = me.name;

/* jam: {mode, code, bookKey, pages, hostId, paused, createdAt, members:[{id,name,page,bot,online,color}], cps:[{p,l,open}]} */
let jam = null, simTimers = [], panelOpen = false;
const youId = () => jam && (jam.mode === "net" ? me.id : "me");
const memberById = id => jam.members.find(m => m.id === id);
const mine = () => memberById(youId());
const host = () => memberById(jam.hostId) || jam.members[0];
const isHost = () => jam && jam.hostId === youId();
const avM = (m, s) => `<div class="avatar" style="--s:${s}px;background:${m.color || hashColor(m.id)}">${esc(initials(m.name))}</div>`;

function qrPattern(seed) {
  let s = seed % 233280; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  let html = "";
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const f = (x < 7 && y < 7) ? [0, 0] : (x > 13 && y < 7) ? [14, 0] : (x < 7 && y > 13) ? [0, 14] : null;
    let on;
    if (f) { const dx = x - f[0], dy = y - f[1]; on = dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4); }
    else if (x === 7 || y === 7 || (x === 13 && y < 8) || (y === 13 && x < 8)) on = false;
    else on = rnd() > .5;
    html += `<i style="background:${on ? "#443223" : "transparent"};border-radius:1px"></i>`;
  }
  return html;
}
const shareLink = code => (NET_POSSIBLE && jam && jam.mode === "net") ? `${location.origin}${location.pathname}?jam=${code}` : `https://goodreads.example/jam/${code}`;
function setConn(kind, text) { const el = $("#connStatus"); el.className = "conn " + (kind || ""); el.innerHTML = `<i></i> ${esc(text)}`; }

/* ---------- panel rendering ---------- */
function setupPanel() {
  const book = BOOKS[jam.bookKey];
  $("#jamCode").textContent = jam.code;
  $("#qr").innerHTML = qrPattern(jam.code.charCodeAt(4) * 997 + jam.code.charCodeAt(5) * 31 + jam.code.charCodeAt(6));
  $("#invLink").textContent = shareLink(jam.code).replace(/^https?:\/\//, "");
  $("#jamCover").innerHTML = cover(jam.bookKey, 84, 126);
  $("#jamTitle").textContent = book.t;
  $("#trackEnd").textContent = `p. ${jam.pages}`;
  $("#stream").innerHTML = "";
  $("#bringBanner").style.display = "none";
  $("#botsWrap").style.display = jam.mode === "net" ? "" : "none";
  const track = $("#track");
  $$(".marker,.checkpoint,.cplabel", track).forEach(n => n.remove());
  jam.cps.forEach(c => {
    const el = document.createElement("div"); el.className = "checkpoint" + (c.open ? " done" : ""); el.style.left = (c.p / jam.pages * 100) + "%";
    el.title = `${c.l} discussion checkpoint (p. ${c.p})`;
    el.onclick = () => toast(c.open ? `${c.l} discussion is open` : `${c.l} discussion opens when the host reaches p. ${c.p}`);
    const lb = document.createElement("div"); lb.className = "cplabel"; lb.style.left = el.style.left; lb.textContent = c.l;
    track.append(el, lb); c.el = el;
  });
  renderAll(true);
}
function renderAll(instant) {
  if (!jam) return;
  const h = host(), you = mine(), book = BOOKS[jam.bookKey];
  $("#jamSub").textContent = (isHost() ? "Hosted by you" : `Hosted by ${h ? h.name : "…"}`) + " · " + book.a;
  $("#syncBtn").innerHTML = isHost() ? "⟲ Bring everyone to my page" : `⟲ Sync to ${esc(firstName(h && h.name))}'s page`;
  $("#pauseBtn").style.display = isHost() ? "" : "none";
  $("#pauseBtn").innerHTML = jam.paused ? "▶ Resume reading" : "❚❚ Pause for discussion";
  $("#botsToggle").disabled = !isHost();
  $("#botsToggle").checked = jam.members.some(m => m.bot);
  $("#trackMeta").textContent = `${jam.members.length} reading · ${jam.pages} pages${jam.paused ? " · paused" : ""}`;
  // markers
  const track = $("#track"), anim = hasGSAP && !reduce && !instant;
  const ids = new Set(jam.members.map(m => m.id));
  $$(".marker", track).forEach(el => { if (!ids.has(el.dataset.m)) el.remove(); });
  jam.members.forEach((m, i) => {
    let el = $$(".marker", track).find(x => x.dataset.m === m.id), fresh = false;
    if (!el) { el = document.createElement("div"); el.dataset.m = m.id; el.style.left = (m.page / jam.pages * 100) + "%"; track.appendChild(el); fresh = true; }
    el.className = "marker" + (m.id === jam.hostId ? " host" : "") + (i % 2 ? " alt" : "");
    el.innerHTML = `<span class="pg">${m.id === jam.hostId ? "★ " : ""}${esc(m.id === youId() ? "You" : firstName(m.name))} · p.<b>${m.page}</b></span>${avM(m, 32)}`;
    el.style.opacity = m.online === false ? .45 : 1;
    const pct = m.page / jam.pages * 100;
    if (anim && !fresh) gsap.to(el, {left: pct + "%", duration: 1.1, ease: "power2.inOut", overwrite: "auto"});
    else { el.style.left = pct + "%"; if (fresh && hasGSAP && !reduce) gsap.from(el, {y: -40, opacity: 0, duration: .6, ease: "back.out(2)"}); }
  });
  const fp = (h ? h.page : 1) / jam.pages * 100;
  if (anim) gsap.to("#hostFill", {width: fp + "%", duration: 1.1, ease: "power2.inOut", overwrite: "auto"}); else $("#hostFill").style.width = fp + "%";
  jam.cps.forEach(c => { if (c.el) { const was = c.el.classList.contains("done"); c.el.classList.toggle("done", !!c.open);
    if (c.open && !was && !instant && hasGSAP && !reduce) gsap.fromTo(c.el, {scale: 1}, {scale: 1.7, duration: .25, yoyo: true, repeat: 3}); } });
  // people
  const hp = h ? h.page : 1;
  $("#people").innerHTML = jam.members.map(m => {
    const diff = m.page - hp;
    const st = m.id === jam.hostId ? `<span class="st" style="background:#C9B08C;color:#443223;font-weight:600">★ Host</span>`
      : Math.abs(diff) <= 3 ? `<span class="st">In sync</span>` : `<span class="st away">${diff < 0 ? diff : "+" + diff} pg</span>`;
    const tag = m.id === youId() ? `<span class="tag">you</span>` : m.bot ? `<span class="tag">demo</span>` : m.online === false ? `<span class="tag">away</span>` : "";
    return `<div class="person${m.online === false ? " off" : ""}">${avM(m, 30)}<div class="nm">${esc(m.id === youId() ? me.name : m.name)}${tag}<small>Page ${m.page}</small></div>${st}</div>`;
  }).join("");
}
function addMsg(msg) {
  // msg: {id?, from?, name?, page, text?, sys?, locked?}
  const s = $("#stream");
  let el = msg.id != null ? s.querySelector(`[data-id="${msg.id}"]`) : null;
  const replacing = !!el;
  if (!el) { el = document.createElement("div"); if (msg.id != null) el.dataset.id = msg.id; }
  const sender = msg.from && jam ? (memberById(msg.from) || {id: msg.from, name: msg.name}) : null;
  const isMine = msg.from && msg.from === youId();
  el.className = "msg" + (msg.sys ? " sys" : "") + (isMine ? " mine" : "");
  if (msg.sys) el.innerHTML = `<div class="bub">${esc(msg.text)}</div>`;
  else if (msg.locked) el.innerHTML = `${avM(sender, 28)}<div class="bub locked"><small>${esc(msg.name)} · p. ${msg.page}</small>🔒 <b>Spoiler-locked</b> until you reach p. ${msg.page}</div>`;
  else el.innerHTML = `${avM(sender, 28)}<div class="bub"><small>${esc(isMine ? "You" : msg.name)} · p. ${msg.page}</small>${esc(msg.text)}</div>`;
  if (!replacing) { s.appendChild(el); while (s.children.length > 12) s.firstElementChild.remove(); }
  if (hasGSAP && !reduce) {
    if (replacing) gsap.fromTo($(".bub", el), {filter: "blur(6px)", opacity: .4}, {filter: "blur(0px)", opacity: 1, duration: .6, ease: "power2.out", clearProps: "filter"});
    else gsap.from(el, {y: 24, opacity: 0, scale: .96, duration: .45, ease: "back.out(1.6)"});
  }
}
function floatEmoji(e, fromOther) {
  const fl = $("#floaters"); if (!fl || !jam) return;
  const span = document.createElement("span"); span.textContent = e;
  const side = $(".jside").getBoundingClientRect(), pr = panel.getBoundingClientRect();
  span.style.left = ((side.left - pr.left) + 24 + Math.random() * Math.max(40, side.width - 70)) + "px";
  span.style.top = Math.min(side.bottom - pr.top - 150, pr.height - 150) + panel.scrollTop + "px";
  fl.appendChild(span);
  if (!hasGSAP || reduce) { setTimeout(() => span.remove(), 700); return; }
  const dur = gsap.utils.random(2.2, 3.2);
  gsap.fromTo(span, {y: 0, opacity: 0, scale: .4}, {y: -gsap.utils.random(240, 400), opacity: 1, scale: fromOther ? gsap.utils.random(.9, 1.2) : gsap.utils.random(1.3, 1.8), duration: dur, ease: "power1.out", onComplete: () => span.remove()});
  gsap.to(span, {x: gsap.utils.random(-40, 40), rotation: gsap.utils.random(-30, 30), duration: dur / 3, yoyo: true, repeat: 2, ease: "sine.inOut"});
  gsap.to(span, {opacity: 0, duration: .7, delay: dur - .8});
}
let timerIv = null;
function openPanelAnim() {
  panelOpen = true;
  modal.style.display = "block"; document.body.classList.add("locked");
  clearInterval(timerIv);
  timerIv = setInterval(() => { if (!jam) return; const s = Math.max(0, Math.floor((Date.now() - jam.createdAt) / 1000)); $("#jamTimer").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }, 1000);
  if (hasGSAP && !reduce) {
    gsap.fromTo("#jamBackdrop", {opacity: 0}, {opacity: 1, duration: .4});
    gsap.fromTo(panel, {opacity: 0, x: 0, y: 80, xPercent: -50, yPercent: -50, scale: .94, rotationX: 10, transformPerspective: 1200}, {opacity: 1, y: 0, scale: 1, rotationX: 0, duration: .7, ease: "power4.out"});
    gsap.from($$(".j-in", panel), {y: 24, opacity: 0, stagger: .06, duration: .5, delay: .2, ease: "power3.out"});
    gsap.from($$(".checkpoint", panel), {scale: 0, stagger: .06, duration: .4, delay: .4, ease: "back.out(3)"});
  } else if (hasGSAP) { gsap.set(panel, {xPercent: -50, yPercent: -50, x: 0, y: 0, opacity: 1}); gsap.set("#jamBackdrop", {opacity: 1}); }
}
function closePanel(instant, skipLeave) {
  simTimers.forEach(t => { clearInterval(t); clearTimeout(t); }); simTimers = [];
  clearInterval(timerIv);
  if (jam && jam.mode === "net" && !skipLeave) netSend({type: "leave"});
  jam = null; panelOpen = false;
  if (qs.get("jam")) history.replaceState(null, "", location.pathname + (qs.get("name") ? "?name=" + encodeURIComponent(qs.get("name")) : ""));
  const done = () => { modal.style.display = "none"; document.body.classList.remove("locked"); $("#floaters").innerHTML = ""; };
  if (hasGSAP && !reduce && instant !== true) {
    gsap.to(panel, {opacity: 0, y: 60, scale: .95, duration: .35, ease: "power2.in"});
    gsap.to("#jamBackdrop", {opacity: 0, duration: .35, onComplete: done});
  } else done();
  refreshLiveJams();
}

/* ---------- offline demo mode (file:// or no server) ---------- */
function openSim(opts) {
  if (jam) closePanel(true);
  const bookKey = opts.book || "women", book = BOOKS[bookKey], pages = book.pages || 360;
  const asHost = opts.mode !== "join";
  const hostId = asHost ? "me" : opts.host;
  const ids = asHost ? ["me", "priya", "james", "maya", "daniel"] : [...opts.ppl, "me"];
  const basePage = asHost ? Math.round(pages * .62) : opts.page;
  const offsets = [0, 22, 48, 76, 9, 60];
  jam = {mode: "sim", code: "JAM-" + Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "X"), bookKey, pages, hostId, paused: false,
    createdAt: Date.now() - (asHost ? 0 : 1260000),
    cps: CHECKPOINTS.map(c => ({p: Math.round(c.p / 400 * pages), l: c.l, open: false})),
    members: ids.map((id, i) => ({id, name: id === "me" ? me.name : PEOPLE[id].n, color: PEOPLE[id].c, online: true,
      page: id === hostId ? basePage : Math.max(1, basePage - offsets[i] - (id === "me" && !asHost ? 40 : 0))}))};
  jam.cps.forEach(c => { c.open = host().page >= c.p; });
  setConn("", "Offline demo · simulated friends");
  setupPanel(); openPanelAnim();
  addMsg({sys: true, text: asHost ? `You started a Jam for “${book.t}”. Share code ${jam.code} to invite friends.` : `You joined ${host().name}'s Jam.`});
  const others = () => jam.members.filter(m => m.id !== "me");
  simTimers.push(setInterval(() => {
    if (!jam || jam.paused) return;
    jam.members.forEach(m => { if (m.id === "me") { if (isHost() && Math.random() > .6) m.page = Math.min(pages, m.page + 1); return; } if (Math.random() > .5) m.page = Math.min(pages, m.page + 1 + Math.floor(Math.random() * 2)); });
    simCheckpoints(); renderAll();
  }, 1600));
  simTimers.push(setInterval(() => { const o = others(); const p = o[Math.floor(Math.random() * o.length)]; addMsg({from: p.id, name: p.name, page: p.page, text: LINES[Math.floor(Math.random() * LINES.length)]}); }, 3000));
  simTimers.push(setInterval(() => { if (Math.random() > .3) floatEmoji(EMOJI[Math.floor(Math.random() * EMOJI.length)], true); }, 1300));
}
function simCheckpoints() {
  const hp = host().page;
  jam.cps.forEach(c => { if (!c.open && hp >= c.p) { c.open = true; addMsg({sys: true, text: `📍 Checkpoint reached: ${c.l}. Discussion is open!`}); } });
}

/* ---------- live mode (WebSocket to the mock server) ---------- */
const net = {ws: null, connecting: null, wantCode: null};
function netSend(o) { if (net.ws && net.ws.readyState === 1) { net.ws.send(JSON.stringify(o)); return true; } return false; }
function netConnect() {
  if (!NET_POSSIBLE) return Promise.reject(new Error("no server"));
  if (net.ws && net.ws.readyState === 1) return Promise.resolve(net.ws);
  if (net.connecting) return net.connecting;
  net.connecting = new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws");
    const t = setTimeout(() => { if (!settled) { settled = true; try { ws.close(); } catch (e) {} reject(new Error("timeout")); } }, 2500);
    ws.onopen = () => { ws.send(JSON.stringify({type: "hello", id: me.id, name: me.name})); };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.type === "hello" && !settled) { settled = true; clearTimeout(t); net.ws = ws; resolve(ws); return; }
      onNet(m);
    };
    ws.onerror = () => { if (!settled) { settled = true; clearTimeout(t); reject(new Error("ws error")); } };
    ws.onclose = () => {
      if (net.ws === ws) net.ws = null;
      if (jam && jam.mode === "net") { setConn("warn", "Reconnecting…"); setTimeout(() => { if (jam && jam.mode === "net") netConnect().then(() => netSend({type: "join", code: jam.code})).catch(() => {}); }, 1500); }
    };
  }).finally(() => { net.connecting = null; });
  return net.connecting;
}
function applyState(j) {
  const first = !jam || jam.mode !== "net" || jam.code !== j.code;
  if (first && jam) closePanel(true, true);
  const prevOpen = first ? {} : Object.fromEntries(jam.cps.map(c => [c.l, c.el]));
  jam = {mode: "net", code: j.code, bookKey: BOOKS[j.book] ? j.book : "women", pages: j.pages, hostId: j.hostId, paused: j.paused, createdAt: j.createdAt,
    cps: j.cps.map(c => ({...c, el: prevOpen[c.l]})), members: j.members.map(m => ({...m, color: hashColor(m.id)}))};
  setConn("live", `Live · ${jam.members.filter(m => !m.bot && m.online).length} connected`);
  if (first) {
    setupPanel(); openPanelAnim();
    const link = `${location.pathname}?jam=${jam.code}` + (qs.get("name") ? `&name=${encodeURIComponent(qs.get("name"))}` : "");
    history.replaceState(null, "", link);
  } else renderAll();
}
function onNet(m) {
  switch (m.type) {
    case "state": applyState(m.jam); break;
    case "history": if (jam) { $("#stream").innerHTML = ""; m.msgs.slice(-12).forEach(addMsg); } else net.pendingHistory = m.msgs; break;
    case "msg": if (jam) addMsg(m.msg); break;
    case "react": if (jam) floatEmoji(m.emoji, true); break;
    case "bring":
      if (!jam) break;
      $("#bringWho").textContent = m.name; $("#bringPage").textContent = "p. " + m.page; $("#bringAccept").dataset.page = m.page;
      $("#bringBanner").style.display = "flex";
      if (hasGSAP && !reduce) gsap.fromTo("#bringBanner", {y: -10, opacity: 0}, {y: 0, opacity: 1, duration: .4, ease: "back.out(2)"});
      break;
    case "error": toast(m.message || "Something went wrong"); break;
  }
}
async function startJam(bookKey) {
  if (NET_POSSIBLE) {
    try { await netConnect(); netSend({type: "create", book: bookKey || "women", bots: qs.get("bots") === "1"}); return; }
    catch (e) { toast("Server not reachable, using offline demo"); }
  }
  openSim({mode: "host", book: bookKey || "women"});
}
async function joinByCode(code) {
  code = String(code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return toast("Enter a jam code");
  if (!code.startsWith("JAM-")) code = "JAM-" + code.replace(/^JAM/, "");
  if (NET_POSSIBLE) {
    try { await netConnect(); netSend({type: "join", code}); return; }
    catch (e) { toast("Server not reachable, joining the offline demo"); }
  }
  openSim({mode: "join", ...JAMS[0]});
}

/* live jams on the homepage (server mode) */
let liveIv = null;
async function refreshLiveJams() {
  if (!NET_POSSIBLE) return;
  let list;
  try { const r = await fetch("/api/jams", {cache: "no-store"}); if (!r.ok) return; list = await r.json(); } catch (e) { return; }
  const shelfCard = $("#jamFromShelf") && $("#jamFromShelf").closest(".jamcard");
  const cards = list.slice(0, 3).map(j => `<div class="card jamcard livejam">
    ${cover(BOOKS[j.book] ? j.book : "women", 64, 96)}
    <div class="info"><span class="live"><span class="dot"></span> Live · ${esc(j.code)}</span>
      <h4>${esc(j.title)}</h4>
      <div style="display:flex;align-items:center;gap:10px"><div class="stack">${j.members.slice(0, 4).map(m => avM({...m, color: hashColor(m.id)}, 26)).join("")}</div><span class="sub" style="font-size:12.5px">${esc(firstName(j.hostName))}'s jam · ${j.members.length} reading</span></div>
      <div class="mini-track">${j.members.slice(0, 5).map(m => `<span style="left:${Math.min(97, m.page / j.pages * 100)}%;background:${hashColor(m.id)}"></span>`).join("")}</div>
    </div><button class="btn dark joincode" data-code="${esc(j.code)}">Join</button></div>`).join("")
    || `<div class="card jamcard livejam livejam-empty"><div class="info"><span class="live"><span class="dot"></span> Live server connected</span><h4>No one is jamming yet</h4><div class="sub" style="font-size:13px">Start a Jam, then share the link. Friends who open it land right in your session.</div></div></div>`;
  $$("#jamList > .jamcard").forEach(c => { if (c !== shelfCard) c.remove(); });
  shelfCard.insertAdjacentHTML("beforebegin", cards);
  $$("#jamList .joincode").forEach(b => b.onclick = () => joinByCode(b.dataset.code));
}

/* ---------- controls ---------- */
function myPageTo(p) {
  const you = mine(); if (!you) return;
  p = Math.max(1, Math.min(jam.pages, p));
  if (jam.mode === "net") { you.page = p; renderAll(); netSend({type: "page", page: p}); }
  else { you.page = p; simCheckpoints(); renderAll(); }
}
$("#syncBtn").onclick = () => {
  if (!jam) return;
  const hp = host().page;
  if (isHost()) {
    if (jam.mode === "net") { netSend({type: "bring"}); toast("Asked everyone to jump to your page"); }
    else { jam.members.forEach(m => m.page = hp); addMsg({sys: true, text: `⟲ You brought everyone to page ${hp}.`}); renderAll(); }
  } else { myPageTo(hp); if (jam.mode === "sim") addMsg({sys: true, text: `⟲ Synced to ${firstName(host().name)}'s page: p. ${hp}.`}); }
  if (hasGSAP && !reduce) gsap.fromTo("#syncBtn", {scale: .94}, {scale: 1, duration: .6, ease: "elastic.out(1,.4)"});
};
$("#bringAccept").onclick = () => { myPageTo(+$("#bringAccept").dataset.page || host().page); $("#bringBanner").style.display = "none"; };
$("#bringDismiss").onclick = () => { $("#bringBanner").style.display = "none"; };
$("#turnBtn").onclick = () => { if (!jam) return; const you = mine(); if (jam.mode === "net") { you.page = Math.min(jam.pages, you.page + 1); renderAll(); netSend({type: "turn"}); } else myPageTo(you.page + 1); };
$("#pauseBtn").onclick = () => {
  if (!jam || !isHost()) return;
  if (jam.mode === "net") netSend({type: "pause", paused: !jam.paused});
  else { jam.paused = !jam.paused; addMsg({sys: true, text: jam.paused ? "❚❚ You paused the Jam for discussion." : "▶ Reading resumed."}); renderAll(); }
};
$("#botsToggle").onchange = e => { if (jam && jam.mode === "net") netSend({type: "bots", on: e.target.checked}); };
$("#nameIn").addEventListener("change", e => {
  const v = e.target.value.trim().slice(0, 30); if (!v) { e.target.value = me.name; return; }
  me.name = v; sessionStorage.setItem("gr-name", v);
  if (jam && jam.mode === "net") netSend({type: "rename", name: v});
  else if (jam) { const y = mine(); if (y) y.name = v; renderAll(); }
});
$("#copyCode").onclick = () => {
  if (!jam) return;
  const link = shareLink(jam.code);
  try { navigator.clipboard && navigator.clipboard.writeText(link).catch(() => {}); } catch (e) {}
  toast(jam.mode === "net" ? "Invite link copied: " + link : "Invite link copied (demo)");
};
$$("#reacts button").forEach(b => b.addEventListener("click", () => {
  for (let i = 0; i < 3; i++) setTimeout(() => floatEmoji(b.textContent, false), i * 120);
  if (jam && jam.mode === "net") netSend({type: "react", emoji: b.textContent});
  if (hasGSAP && !reduce) gsap.fromTo(b, {scale: 1.3}, {scale: 1, duration: .4, ease: "back.out(3)"});
}));
$("#compose").addEventListener("submit", e => {
  e.preventDefault(); const v = $("#composeIn").value.trim(); if (!v || !jam) return;
  if (jam.mode === "net") netSend({type: "chat", text: v});
  else addMsg({from: "me", name: me.name, page: mine().page, text: v});
  $("#composeIn").value = "";
});
$("#jamClose").onclick = () => closePanel(); $("#jamBackdrop").onclick = () => closePanel();
document.addEventListener("keydown", e => { if (e.key === "Escape" && jam) closePanel(); });
$("#startJam").onclick = () => startJam("women");
$("#jamThis").onclick = () => startJam("women");
$("#navJam").onclick = () => $("#jamSection").scrollIntoView({behavior: reduce ? "auto" : "smooth"});
$("#enterCode").onclick = () => { $("#enterCode").style.display = "none"; $("#codeForm").classList.add("on"); $("#codeIn").focus(); };
$("#codeForm").addEventListener("submit", e => { e.preventDefault(); joinByCode($("#codeIn").value); });
$$(".join").forEach(b => b.onclick = () => NET_POSSIBLE ? toast("That one is sample data. Join a live jam or start your own") : openSim({mode: "join", ...JAMS[+b.dataset.idx]}));

window.__proto = {startJam, joinByCode, closePanel, finishIntro, setPage: p => myPageTo(p), state: () => jam, me};

if (NET_POSSIBLE) { refreshLiveJams(); liveIv = setInterval(() => { if (!panelOpen) refreshLiveJams(); }, 5000); }
if (qs.get("jam")) { finishIntro(); joinByCode(qs.get("jam")); }
else runIntro();
})();
