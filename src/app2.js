spines.forEach(sp => {
  sp.addEventListener("mouseenter", () => { if (sp !== openSpine && hasGSAP) gsap.to(sp, {y: -22, rotation: -3, scale: 1.04, duration: .35, ease: "power3.out", overwrite: "auto"}); });
  sp.addEventListener("mouseleave", () => { if (sp !== openSpine && hasGSAP) gsap.to(sp, {y: 0, rotation: 0, scale: 1, duration: .6, ease: "elastic.out(1,.5)", overwrite: "auto"}); });
  sp.addEventListener("click", e => { e.stopPropagation(); openDetail(sp); });
});
$$(".act").forEach(el => {
  el.addEventListener("mouseenter", () => hasGSAP && !reduce && gsap.to(el, {x: 5, duration: .3, ease: "power2.out"}));
  el.addEventListener("mouseleave", () => hasGSAP && !reduce && gsap.to(el, {x: 0, duration: .4, ease: "power2.out"}));
});
function openDetail(sp) {
  const k = sp.dataset.k, b = BOOKS[k];
  if (openSpine && openSpine !== sp) closeDetail(true);
  openSpine = sp;
  detail.innerHTML = `<button class="iconbtn close" aria-label="Close">✕</button>${cover(k, 110, 165)}
    <div style="flex:1;min-width:0"><span class="chip" style="font-size:11px">${b.g}</span><h4 style="margin-top:8px;padding-right:20px">${b.t}</h4><div class="sub" style="font-size:12.5px">${b.a}</div>
    <div class="stars" style="font-size:14px">${stars(Math.round(b.r))} <span class="sub" style="font-size:12px">${b.r.toFixed(1)}</span></div>
    <p>${b.d}</p><div class="row"><button class="btn primary" style="padding:8px 12px;font-size:12px" data-jam="${k}">▶ Jam it</button><button class="btn ghost" style="padding:8px 12px;font-size:12px" data-rev>Review</button></div></div>`;
  const wrap = $(".shelf-wrap").getBoundingClientRect(), r = sp.getBoundingClientRect();
  const dw = Math.min(330, wrap.width - 24);
  let left = r.left - wrap.left + r.width + 12, fromLeft = true;
  if (left + dw > wrap.width - 10) { left = r.left - wrap.left - dw - 12; fromLeft = false; }
  left = Math.max(10, Math.min(left, wrap.width - dw - 10));
  detail.style.cssText = `display:flex;width:${dw}px;left:${left}px;top:${Math.max(10, r.top - wrap.top - 30)}px;transform-origin:${fromLeft ? "left" : "right"} center`;
  $(".close", detail).onclick = e => { e.stopPropagation(); closeDetail(); };
  $("[data-jam]", detail).onclick = () => { closeDetail(); startJam(k); };
  $("[data-rev]", detail).onclick = () => toast(`Writing a review for “${b.t}”`);
  if (!hasGSAP || reduce) return;
  const tl = gsap.timeline();
  tl.to(sp, {rotationY: fromLeft ? 80 : -80, y: -30, duration: .35, ease: "power2.in", transformPerspective: 600, overwrite: "auto"})
    .fromTo(detail, {rotationY: fromLeft ? -90 : 90, opacity: 0, transformPerspective: 900}, {rotationY: 0, opacity: 1, duration: .65, ease: "back.out(1.4)"}, "-=.05")
    .from($$(".chip,h4,.sub,.stars,p,.row", detail), {y: 10, opacity: 0, stagger: .04, duration: .3}, "-=.35");
}
function closeDetail(instant) {
  const sp = openSpine; openSpine = null;
  if (!hasGSAP || reduce) { detail.style.display = "none"; return; }
  if (sp) gsap.to(sp, {rotationY: 0, y: 0, rotation: 0, scale: 1, duration: .5, ease: "power3.out", overwrite: "auto"});
  if (instant) { detail.style.display = "none"; return; }
  gsap.to(detail, {rotationY: -90, opacity: 0, duration: .3, ease: "power2.in", onComplete: () => { if (!openSpine) detail.style.display = "none"; }});
}
document.addEventListener("click", e => { if (openSpine && !detail.contains(e.target) && !e.target.closest(".spine")) closeDetail(); });

function dropSpines() {
  if (!hasGSAP || reduce) return;
  gsap.fromTo(spines, {y: -340, rotation: () => gsap.utils.random(-25, 25), opacity: 0},
    {y: 0, rotation: 0, opacity: 1, duration: 1.1, ease: "bounce.out", stagger: {each: .07, from: "random"}, overwrite: "auto"});
  gsap.fromTo(".shelf .decor-item", {y: -200, opacity: 0}, {y: 0, opacity: 1, duration: .9, ease: "bounce.out", stagger: .15, delay: .5});
}
$("#reshelve").onclick = () => { closeDetail(true); dropSpines(); };
$("#jamFromShelf").onclick = () => { $("#shelfSection").scrollIntoView({behavior: reduce ? "auto" : "smooth"}); toast("Click any book, then “Jam it”"); };

/* ---------- Intro: page flip ---------- */
const PAGE_COUNT = 6;
const leavesEl = $("#leaves");
const lorem = ["She turned the page and the room seemed to turn with her.", "Somewhere a clock kept time for stories not yet read.", "The margins were full of someone else’s pencil notes.", "Every library is a map of the people who loved it.", "Chapter after chapter, the light moved across the floor.", "And then, the shelf, waiting."];
for (let i = 0; i < PAGE_COUNT; i++) {
  const lf = document.createElement("div");
  lf.className = "leaf";
  lf.style.zIndex = 50 - i;
  lf.style.transform = `translateZ(${1 + (PAGE_COUNT - i) * 0.6}px)`;
  const lines = n => [...Array(n)].map((_, j) => `<div class="ln" style="width:${70 + ((i * 13 + j * 17) % 30)}%"></div>`).join("");
  lf.innerHTML = `<div class="face front"><div class="shade"></div><div class="pagetext"><div class="orn">${["I","II","III","IV","V","VI"][i]}</div>${lorem[i]}${lines(9)}</div><div class="pagenum">${i * 2 + 3}</div></div>
                  <div class="face back"><div class="shade" style="transform:scaleX(-1)"></div><div class="pagetext">${lines(4)}<em>${lorem[(i + 2) % 6]}</em>${lines(7)}</div><div class="pagenum">${i * 2 + 4}</div></div>`;
  leavesEl.appendChild(lf);
}
const leaves = $$(".leaf", leavesEl);

let introDone = false, introTL = null;
function finishIntro() {
  if (introDone) return; introDone = true;
  document.body.classList.remove("locked");
  const intro = $("#intro");
  if (hasGSAP && !reduce) { if (introTL) introTL.kill(); gsap.to(intro, {autoAlpha: 0, duration: .6, onComplete: () => intro.remove()}); }
  else intro.remove();
  enterHome();
}
function runIntro() {
  if (!hasGSAP || reduce) { finishIntro(); return; }
  const intro = $("#intro");
  for (let i = 0; i < 26; i++) {
    const d = document.createElement("div"); d.className = "dust"; intro.appendChild(d);
    gsap.set(d, {x: gsap.utils.random(0, innerWidth), y: gsap.utils.random(0, innerHeight), scale: gsap.utils.random(.5, 1.8)});
    gsap.to(d, {opacity: gsap.utils.random(.2, .7), y: "-=" + gsap.utils.random(60, 160), x: "+=" + gsap.utils.random(-40, 40), duration: gsap.utils.random(3, 6), repeat: -1, yoyo: true, ease: "sine.inOut", delay: Math.random() * 2});
  }
  introTL = gsap.timeline({onComplete: finishIntro});
  introTL.from("#book3d", {y: 80, rotationX: 60, scale: .7, opacity: 0, duration: 1, ease: "power3.out"})
    .to("#book3d", {rotationX: 22, duration: 2.6, ease: "sine.inOut"}, "<.4");
  leaves.forEach((lf, i) => {
    const at = 0.9 + i * 0.3, d = 1.0 - i * .07;
    introTL.to(lf, {rotationY: -180, duration: d, ease: "power2.inOut", onStart: () => { lf.style.zIndex = 51 + i; }}, at)
      .to(lf, {z: 16, duration: d / 2, ease: "sine.out"}, at)
      .to(lf, {z: 1 + (PAGE_COUNT + i + 1) * 0.6, duration: d / 2, ease: "sine.in"}, at + d / 2)
      .to($$(".shade", lf), {opacity: 1, duration: d / 2, yoyo: true, repeat: 1, ease: "sine.inOut"}, at);
  });
  introTL.to(".intro-word", {opacity: 1, y: -6, duration: .8, ease: "power2.out"}, 1.2)
    .to(".intro-sub", {opacity: 1, duration: .6}, 1.6)
    .to("#book3d", {scale: 1.9, rotationX: 0, opacity: 0, duration: .9, ease: "power3.in"}, 3.75)
    .to(".intro-word,.intro-sub", {opacity: 0, y: -20, duration: .4}, "<");
}
$("#skipIntro").addEventListener("click", finishIntro);
document.addEventListener("keydown", e => { if (!introDone && (e.key === "Enter" || e.key === "Escape")) finishIntro(); });

/* ---------- Homepage entrance + scroll ---------- */
const RING_C = 2 * Math.PI * 50, PROGRESS = 62;
function setFinalStates() {
  $("#ringFill").style.strokeDashoffset = RING_C * (1 - PROGRESS / 100);
  $("#ringNum").textContent = PROGRESS; $("#pgNow").textContent = 248;
  $("#chFill").style.width = "68%"; $("#chNum").textContent = 34;
  $$("[data-count]").forEach(el => el.textContent = (+el.dataset.count).toLocaleString());
  $$(".jam-art .orb").forEach((o, i) => { const a = i * Math.PI / 2, r = i % 2 ? 100 : 140; o.style.transform = `translate(${150 + Math.cos(a) * r - 20}px,${150 + Math.sin(a) * r - 20}px)`; });
}
function countTo(el, to, dec = 0, dur = 1.6) {
  const o = {v: 0};
  return gsap.to(o, {v: to, duration: dur, ease: "power2.out", onUpdate: () => el.textContent = dec ? o.v.toFixed(dec) : Math.round(o.v).toLocaleString()});
}
function enterHome() {
  if (!hasGSAP || reduce) { setFinalStates(); return; }
  const tl = gsap.timeline({defaults: {ease: "power3.out"}});
  tl.from("nav.top > *", {y: -24, opacity: 0, stagger: .08, duration: .6})
    .from(".grid > .card", {y: 50, opacity: 0, rotationX: 8, transformPerspective: 800, stagger: .12, duration: .9}, "-=.3")
    .from("#crCover .cover", {rotationY: -70, x: 40, opacity: 0, transformPerspective: 700, duration: 1}, "-=.7")
    .to("#ringFill", {strokeDashoffset: RING_C * (1 - PROGRESS / 100), duration: 1.8, ease: "power2.inOut"}, "-=.6")
    .add(countTo($("#ringNum"), PROGRESS, 0, 1.8), "<")
    .add(countTo($("#pgNow"), 248, 0, 1.8), "<")
    .to("#chFill", {width: "68%", duration: 1.8, ease: "expo.out"}, "<.1")
    .add(countTo($("#chNum"), 34, 0, 1.6), "<")
    .from(".act", {x: 30, opacity: 0, stagger: .1, duration: .6}, "<");
  $$("[data-count]").forEach(el => tl.add(countTo(el, +el.dataset.count, +(el.dataset.dec || 0), 1.6), "<"));
  setupScroll();
}
function setupScroll() {
  if (window.ScrollTrigger) {
    $$("section .reveal").forEach(el => gsap.from(el, {y: 60, opacity: 0, duration: .9, ease: "power3.out", scrollTrigger: {trigger: el, start: "top 90%"}}));
    gsap.from(".reveal-pick", {y: 60, opacity: 0, rotation: 3, stagger: .08, duration: .8, ease: "power3.out", scrollTrigger: {trigger: "#carousel", start: "top 92%"}});
    gsap.set(spines, {opacity: 0}); gsap.set(".shelf .decor-item", {opacity: 0});
    ScrollTrigger.create({trigger: "#shelf", start: "top 82%", once: true, onEnter: dropSpines});
    $$(".decor [data-speed]").forEach(el => gsap.to(el, {y: () => +el.dataset.speed * document.body.scrollHeight * .5, ease: "none", scrollTrigger: {start: 0, end: "max", scrub: true, invalidateOnRefresh: true}}));
    gsap.to("#crCover", {y: -24, ease: "none", scrollTrigger: {trigger: ".cr", start: "top top+=80", end: "bottom top", scrub: true}});
    gsap.to(".jam-art", {y: 50, rotation: 20, ease: "none", scrollTrigger: {trigger: ".jam-hero", start: "top bottom", end: "bottom top", scrub: true}});
  } else { dropSpines(); }
  $$(".jam-art .orb").forEach((o, i) => {
    const r = i % 2 ? 100 : 140, start = i * 90, st = {a: start};
    gsap.to(st, {a: start + 360, duration: 18 + i * 4, repeat: -1, ease: "none", onUpdate: () => {
      const rad = st.a * Math.PI / 180; gsap.set(o, {x: 150 + Math.cos(rad) * r - 20, y: 150 + Math.sin(rad) * r - 20});
    }});
  });
  $$(".pagebars i").forEach((b, i) => gsap.to(b, {height: "100%", duration: .4 + (i % 3) * .15, repeat: -1, yoyo: true, ease: "sine.inOut", delay: (i % 3) * .12}));
  gsap.to("#jamCenterCover", {y: -8, rotation: 2, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut"});
}
