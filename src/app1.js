(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGSAP = typeof window.gsap !== "undefined";
if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* ---------- Mock data ---------- */
const BOOKS = {
  women:{t:"The Women",a:"Kristin Hannah",c:["#8C6E50","#5A4530"],fg:"#FFF9F3",m:"sun",pages:400,g:"Historical Fiction",r:4.6,d:"A young nurse goes to Vietnam, and comes home to a country that would rather forget the women who served."},
  circus:{t:"The Night Circus",a:"Erin Morgenstern",c:["#443223","#2A1F15"],fg:"#DBC4A5",m:"tent",g:"Fantasy",r:4.0,d:"Two young illusionists are bound to a magical duel, staged inside a circus that only opens at night."},
  bee:{t:"The Bee Sting",a:"Paul Murray",c:["#C9A877","#8C6E50"],fg:"#2A1F15",m:"stripe",g:"Literary Fiction",r:4.1,d:"An Irish family comes apart, each of them hiding something. Funny and heartbreaking at once."},
  octo:{t:"Remarkably Bright Creatures",a:"Shelby Van Pelt",c:["#7C7960","#55533F"],fg:"#FFF9F3",m:"waves",pages:360,g:"Contemporary",r:4.4,d:"A widow on the aquarium night shift strikes up a friendship with a very clever giant Pacific octopus."},
  evelyn:{t:"The Seven Husbands of Evelyn Hugo",a:"Taylor Jenkins Reid",c:["#E2CDB0","#C2A59A"],fg:"#5E3F3F",m:"ring",g:"Historical Fiction",r:4.5,d:"A reclusive Hollywood icon finally tells the truth about her glamorous, scandalous life."},
  overstory:{t:"The Overstory",a:"Richard Powers",c:["#5C5A3E","#3D3B28"],fg:"#ECDCC2",m:"tree",g:"Literary Fiction",r:4.2,d:"Nine strangers are drawn together by trees in a sweeping ecological epic."},
  tomorrow:{t:"Tomorrow, and Tomorrow, and Tomorrow",a:"Gabrielle Zevin",c:["#8E6464","#5E3F3F"],fg:"#FFF9F3",m:"wave2",g:"Fiction",r:4.2,d:"Two friends make video games together, and build a lifelong, complicated creative partnership."},
  sea:{t:"Sea of Tranquility",a:"Emily St. John Mandel",c:["#4E4A3A","#2F2D20"],fg:"#DBC4A5",m:"moon",g:"Science Fiction",r:4.0,d:"A novel of time travel and metaphysics, spanning centuries and a colony on the moon."},
  lessons:{t:"Lessons in Chemistry",a:"Bonnie Garmus",c:["#D4B888","#A08670"],fg:"#2A1F15",m:"atom",g:"Fiction",r:4.3,d:"Chemist Elizabeth Zott becomes the unlikely star of a 1960s TV cooking show."},
  midnight:{t:"The Midnight Library",a:"Matt Haig",c:["#66634C","#3D3B28"],fg:"#ECDCC2",m:"moon",g:"Fantasy",r:4.0,d:"Between life and death there is a library, and every book in it is a life you could have lived."},
  circe:{t:"Circe",a:"Madeline Miller",c:["#8A5A4A","#4E3434"],fg:"#F1E3CC",m:"sun",g:"Mythology",r:4.3,d:"The witch of Aiaia tells her own story, from the Titans to Odysseus."},
  hail:{t:"Project Hail Mary",a:"Andy Weir",c:["#3B3A28","#22211A"],fg:"#D4B888",m:"star",g:"Science Fiction",r:4.5,d:"A lone astronaut wakes up with no memory and a mission to save Earth."},
  klara:{t:"Klara and the Sun",a:"Kazuo Ishiguro",c:["#E2CFAF","#B9997A"],fg:"#443223",m:"sun",g:"Literary Fiction",r:3.9,d:"An Artificial Friend watches the world from a shop window, waiting to be chosen."},
  pachinko:{t:"Pachinko",a:"Min Jin Lee",c:["#6B4545","#3E2A2A"],fg:"#E9D2B8",m:"ring",g:"Historical Fiction",r:4.3,d:"Four generations of a Korean family in Japan, bound by love and resilience."}
};
const PEOPLE = {
  me:{n:"You",i:"MT",c:"linear-gradient(135deg,#755151,#443223)"},
  priya:{n:"Priya S.",i:"PS",c:"#66634C"},
  james:{n:"James T.",i:"JT",c:"#7A6250"},
  maya:{n:"Maya L.",i:"ML",c:"#72583E"},
  daniel:{n:"Daniel K.",i:"DK",c:"#755151"},
  ana:{n:"Ana R.",i:"AR",c:"#44422D"}
};

const motifSVG = (m, fg) => {
  const s = `stroke="${fg}" fill="none" stroke-width="2"`;
  switch (m) {
    case "sun": return `<svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="16" ${s}/>${[...Array(12)].map((_, i) => { const a = i * Math.PI / 6; return `<line x1="${(40 + Math.cos(a) * 22).toFixed(1)}" y1="${(40 + Math.sin(a) * 22).toFixed(1)}" x2="${(40 + Math.cos(a) * 32).toFixed(1)}" y2="${(40 + Math.sin(a) * 32).toFixed(1)}" ${s}/>`; }).join("")}</svg>`;
    case "moon": return `<svg width="80" height="80" viewBox="0 0 80 80"><path d="M50 14a26 26 0 1 0 16 40A22 22 0 0 1 50 14z" ${s}/><circle cx="20" cy="18" r="1.5" fill="${fg}"/><circle cx="62" cy="22" r="1" fill="${fg}"/></svg>`;
    case "tent": return `<svg width="80" height="80" viewBox="0 0 80 80"><path d="M10 64 L40 16 L70 64 Z M40 16 L40 64 M25 64 L40 30 L55 64" ${s}/></svg>`;
    case "stripe": return `<svg width="90" height="90" viewBox="0 0 90 90">${[0,1,2,3,4].map(i => `<path d="M0 ${20 + i * 14} Q45 ${10 + i * 14} 90 ${20 + i * 14}" ${s}/>`).join("")}</svg>`;
    case "waves": return `<svg width="90" height="70" viewBox="0 0 90 70"><path d="M45 10c10 0 16 8 16 18s-6 14-6 20 8 6 10 14M45 10c-10 0-16 8-16 18s6 14 6 20-8 6-10 14M40 40c-4 8-14 10-20 22M50 40c4 8 14 10 20 22" ${s}/></svg>`;
    case "ring": return `<svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="26" ${s}/><circle cx="40" cy="40" r="18" ${s} stroke-dasharray="3 4"/></svg>`;
    case "tree": return `<svg width="80" height="90" viewBox="0 0 80 90"><path d="M40 86V40M40 52L24 36M40 46L58 30M40 62L22 54M40 58L60 50" ${s}/><circle cx="40" cy="30" r="22" ${s}/></svg>`;
    case "wave2": return `<svg width="90" height="80" viewBox="0 0 90 80"><path d="M0 50 C15 20 30 20 45 50 S75 80 90 50" ${s}/><path d="M0 60 C15 30 30 30 45 60 S75 90 90 60" ${s}/></svg>`;
    case "atom": return `<svg width="80" height="80" viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="30" ry="11" ${s}/><ellipse cx="40" cy="40" rx="30" ry="11" ${s} transform="rotate(60 40 40)"/><ellipse cx="40" cy="40" rx="30" ry="11" ${s} transform="rotate(-60 40 40)"/><circle cx="40" cy="40" r="3" fill="${fg}"/></svg>`;
    case "star": return `<svg width="80" height="80" viewBox="0 0 80 80"><path d="M40 10l6 22 22 2-18 12 6 22-16-14-16 14 6-22-18-12 22-2z" ${s}/></svg>`;
    default: return "";
  }
};
function cover(key, w, h) {
  const b = BOOKS[key];
  const longest = Math.max(...b.t.split(/\s+/).map(s => s.length));
  const fs = Math.max(8, Math.min(w * (b.t.length > 22 ? 0.1 : 0.14), (w * 0.8) / (longest * 0.72)));
  return `<div class="cover" style="width:${w}px;height:${h}px;--fg:${b.fg};background:linear-gradient(160deg,${b.c[0]},${b.c[1]});font-size:${Math.max(8, w * .075)}px">
    <div class="ct" style="font-size:${fs}px">${b.t}</div>
    <div class="motif" style="transform:translate(-50%,-50%) scale(${Math.min(1.4, w / 120)})">${motifSVG(b.m, b.fg)}</div>
    <div class="ca">${b.a}</div></div>`;
}
const av = (p, s = 40) => `<div class="avatar" style="--s:${s}px;background:${PEOPLE[p].c}">${PEOPLE[p].i}</div>`;
const stars = n => "★".repeat(n) + `<i>${"★".repeat(5 - n)}</i>`;

/* ---------- Toast ---------- */
const toastEl = $("#toast");
function toast(msg) {
  toastEl.textContent = msg;
  if (!hasGSAP) { toastEl.style.opacity = 1; setTimeout(() => toastEl.style.opacity = 0, 1800); return; }
  gsap.killTweensOf(toastEl);
  gsap.fromTo(toastEl, {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: .35, ease: "back.out(2)"});
  gsap.to(toastEl, {opacity: 0, y: 10, delay: 2, duration: .3});
}

/* ---------- Static renders ---------- */
$("#crCover").innerHTML = cover("women", 150, 228);
$("#jamCenterCover").innerHTML = cover("women", 92, 138);

const ACT = [["priya","rated","women",5,"2h"],["james","rated","bee",4,"5h"],["maya","started a Jam on","octo",0,"1d"],["daniel","rated","circus",4,"2d"]];
$("#activity").innerHTML = ACT.map(([p, v, b, s, t]) => `<div class="act">${av(p, 38)}<div class="t"><div class="n">${PEOPLE[p].n}<small>${t} ago</small></div><div class="b">${v} <b style="font-weight:500">${BOOKS[b].t}</b></div>${s ? `<div class="stars">${stars(s)}</div>` : `<div class="stars" style="color:var(--terra);font-weight:600;font-size:12px">▶ Jamming now</div>`}</div></div>`).join("")
  + `<button class="btn ghost" style="width:100%;margin-top:14px" data-toast="Showing all friend activity">View all activity →</button>`;

const JAMS = [
  {host:"priya", book:"women", ppl:["priya","james","ana"], page:212, ch:"Ch. 13"},
  {host:"maya", book:"octo", ppl:["maya","daniel"], page:88, ch:"Ch. 7"}
];
$("#jamList").innerHTML = JAMS.map((j, idx) => `<div class="card jamcard reveal">
  ${cover(j.book, 64, 96)}
  <div class="info"><span class="live"><span class="dot"></span> Live · ${j.ch}</span>
    <h4>${BOOKS[j.book].t}</h4>
    <div style="display:flex;align-items:center;gap:10px"><div class="stack">${j.ppl.map(p => av(p, 26)).join("")}</div><span class="sub" style="font-size:12.5px">${PEOPLE[j.host].n.split(" ")[0]}'s jam · ${j.ppl.length} reading</span></div>
    <div class="mini-track">${j.ppl.map((p, i) => `<span style="left:${Math.min(96, (j.page / BOOKS[j.book].pages) * 100 - i * 4)}%;background:${PEOPLE[p].c}"></span>`).join("")}</div>
  </div>
  <button class="btn dark join" data-idx="${idx}">Join</button></div>`).join("")
  + `<div class="card jamcard reveal" style="background:var(--paper);border-style:dashed">
      <div class="avatar" style="--s:48px;background:var(--terra-l);color:var(--terra-d);border:none;font-size:22px">＋</div>
      <div class="info"><h4 style="font-size:17px">Jam a book from your shelf</h4><div class="sub" style="font-size:13px">Pick any book and we'll make an invite code.</div></div>
      <button class="btn ghost" id="jamFromShelf">Choose</button></div>`;

const picks = ["circus","bee","octo","evelyn","overstory","circe","hail","klara","pachinko"];
const whys = ["Friends loved it","Like The Women","Cozy & clever","92% match","Book club pick","Mythic retelling","Can't put down","Quiet & moving","Family saga"];
$("#carousel").innerHTML = picks.map((k, i) => `<div class="pick reveal-pick">${cover(k, 170, 250)}<div class="pt">${BOOKS[k].t}</div><div class="pa">${BOOKS[k].a}</div><span class="why">${whys[i]}</span></div>`).join("");
$("#prev").onclick = () => $("#carousel").scrollBy({left: -400, behavior: "smooth"});
$("#next").onclick = () => $("#carousel").scrollBy({left: 400, behavior: "smooth"});
$$(".pick").forEach((el, i) => el.addEventListener("click", () => toast(`Added “${BOOKS[picks[i]].t}” to Want to Read`)));
$$("[data-toast]").forEach(el => el.addEventListener("click", () => toast(el.dataset.toast)));

/* ---------- Bookshelf ---------- */
const shelfBooks = ["midnight","sea","tomorrow","octo","lessons","bee","circus","circe","evelyn","overstory","hail","klara","pachinko","women"];
const shelf = $("#shelf");
let shelfHTML = `<div class="decor-item bookend"></div>`;
shelfBooks.forEach((k, i) => {
  const b = BOOKS[k];
  const w = 36 + ((i * 7) % 18), h = 172 + ((i * 37) % 62);
  shelfHTML += `<div class="spine" data-k="${k}" style="--w:${w}px;--h:${h}px;--bg:linear-gradient(90deg,${b.c[1]},${b.c[0]} 45%,${b.c[1]});--fg:${b.fg}" title="${b.t}">
    <div class="band"></div><div class="st">${b.t}</div><div class="sa">${b.a.split(" ").slice(-1)[0]}</div><div class="band b2"></div></div>`;
  if (i === 5) shelfHTML += `<div class="decor-item plant"><div class="lf" style="transform:rotate(-28deg)"></div><div class="lf" style="transform:rotate(4deg);height:66px"></div><div class="lf" style="transform:rotate(30deg)"></div><div class="pot"></div></div>`;
  if (i === 10) shelfHTML += `<div class="decor-item stack-flat"><i style="width:120px;background:#A08670"></i><i style="width:110px;background:#44422D"></i><i style="width:126px;background:#755151"></i></div>`;
});
shelfHTML += `<div class="decor-item bookend" style="transform:scaleX(-1)"></div>`;
shelf.innerHTML = shelfHTML;
const spines = $$(".spine", shelf);
const detail = $("#detail");
let openSpine = null;
