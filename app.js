import { makeReader, write, connectWallet, activeAccount, balanceOf, short, toGen, GEN, fmtErr }
  from "../shared/genlayer-lite.js";
import { icon, setIcons } from "../shared/icons.js";

const CONTRACT = "0x1Dfa8D1987f33bB5f31158012340956468a144Ec";
const { read } = makeReader(CONTRACT);

const WAITING = 0, LOCKED = 1, DECIDED = 2;
const SIDE_NONE = 0, SIDE_A = 1, SIDE_B = 2;
let account = null, duels = [];
const $ = (id) => document.getElementById(id);
const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

$("contractFoot").innerHTML = `contract ${short(CONTRACT)}`;
setIcons();

const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

function toast(msg, kind = "", title = "sys") {
  const el = document.createElement("div"); el.className = "toast " + kind;
  el.innerHTML = `<span class="tt">${title}</span>`; el.appendChild(document.createTextNode(msg));
  $("log").appendChild(el); setTimeout(() => el.remove(), kind === "err" ? 16000 : 5200);
}

async function refreshWallet() {
  account = await activeAccount();
  const slot = $("walletslot");
  if (account) { let bal = 0n; try { bal = await balanceOf(account); } catch (_) {} slot.innerHTML = `<span class="mono" style="font-size:12px;color:var(--txt2)">${short(account)} · ${toGen(bal)} GEN</span>`; }
  else { slot.innerHTML = `<button class="btn sm" id="connectBtn">Connect<span class="ic">${icon("arrowRight")}</span></button>`; $("connectBtn").onclick = doConnect; }
}
async function doConnect() { try { account = await connectWallet(); toast("Linked on studionet.", "ok", "wallet"); await refreshWallet(); } catch (e) { toast(fmtErr(e), "err", "wallet"); } }
async function ensureWallet() { if (!account) account = await connectWallet(); await refreshWallet(); }

async function load() {
  try {
    const count = Number(await read("get_duel_count"));
    const out = [];
    for (let i = 0; i < count; i++) out.push({ id: i, ...(await read("get_duel", [i])) });
    duels = out; render(); $("arenaMeta").textContent = count + (count === 1 ? " duel" : " duels");
  } catch (e) { $("grid").innerHTML = `<div class="empty">Arena offline. ${fmtErr(e)}</div>`; }
}

function render() {
  const g = $("grid");
  if (!duels.length) { g.innerHTML = `<div class="empty">No duels yet. Throw the first gauntlet.</div>`; return; }
  g.innerHTML = "";
  [...duels].reverse().forEach((d) => {
    const st = Number(d.status), w = Number(d.winner);
    const pill = st === WAITING ? ["p-wait", "Awaiting challenger"] : st === LOCKED ? ["p-lock", "Locked · ready"] : ["p-done", w === SIDE_A ? "FOR won" : w === SIDE_B ? "AGAINST won" : "Tie"];
    const pot = (BigInt(d.stake) * (st === WAITING ? 1n : 2n)).toString();
    const el = document.createElement("div"); el.className = "fixture";
    el.innerHTML = `
      <div class="corner for"><div class="lbl">◤ For</div><div class="who">${short(d.creator)}</div><div class="stk">${toGen(d.stake)} GEN</div></div>
      <div class="center-col">
        <div class="motion">${esc(d.motion)}</div>
        <div class="vs-badge">VS</div>
        <span class="pill ${pill[0]}">${pill[1]}</span>
        <div class="mono" style="font-size:11px;color:var(--gold);margin-top:8px">pot ${toGen(pot)} GEN</div>
      </div>
      <div class="corner against"><div class="lbl">Against ◢</div><div class="who">${st === WAITING ? "open seat" : short(d.opponent)}</div><div class="stk">${st === WAITING ? "—" : toGen(d.stake) + " GEN"}</div></div>`;
    el.onclick = () => openDetail(d.id);
    g.appendChild(el);
  });
}

function openDrawer() { $("scrim").classList.add("on"); $("drawer").classList.add("on"); }
function closeDrawer() { $("scrim").classList.remove("on"); $("drawer").classList.remove("on"); }

function openCreate() {
  $("drawerTitle").textContent = "Open a duel";
  $("drawerBody").innerHTML = `
    <p style="color:var(--txt2);font-size:14.5px">State the motion and argue the FOR side. A challenger must match your stake to enter.</p>
    <label>The motion</label><input id="motion" maxlength="160" placeholder="Resolved: open models win the AI race." />
    <label>Your opening case (you argue FOR)</label><textarea id="caseA" placeholder="Lay out your strongest argument…"></textarea>
    <label>Your stake (GEN) — opponent must match</label><input id="stake" type="number" min="0" step="0.1" value="2" />
    <button class="btn pink block" id="createBtn" style="margin-top:18px">Throw the gauntlet <span class="ic">${icon("swords")}</span></button>`;
  $("createBtn").onclick = doCreate; openDrawer();
}

function openDetail(id) {
  const d = duels.find((x) => x.id === id); if (!d) return;
  const st = Number(d.status), w = Number(d.winner);
  $("drawerTitle").textContent = "Duel #" + id;
  let body = `<div style="font-family:'Clash Display';font-weight:600;font-size:22px;line-height:1.15">${esc(d.motion)}</div>
    <div class="mono" style="color:var(--dim);font-size:12px;margin-top:6px">pot ${toGen((BigInt(d.stake) * (st === WAITING ? 1n : 2n)).toString())} GEN · ${toGen(d.stake)} GEN each</div>
    <div class="cases">
      <div class="case fa"><div class="lbl">FOR · ${short(d.creator)}</div><div class="txt">${esc(d.case_a)}</div></div>
      <div class="case fb"><div class="lbl">AGAINST · ${st === WAITING ? "open seat" : short(d.opponent)}</div><div class="txt">${d.case_b ? esc(d.case_b) : "<span style='color:var(--dim)'>Awaiting a challenger.</span>"}</div></div>
    </div>`;
  if (st === DECIDED) {
    const cls = w === SIDE_A ? "win-a" : w === SIDE_B ? "win-b" : "win-tie";
    const label = w === SIDE_A ? "Side A takes the pot" : w === SIDE_B ? "Side B takes the pot" : "Tie · stakes refunded";
    body += `<div class="winbanner ${cls}">${label}</div>`;
    if (d.rationale) body += `<div class="rationale">Jury: ${esc(d.rationale)}</div>`;
  } else if (st === WAITING) {
    body += `<label>Your counter-case (you argue AGAINST)</label><textarea id="caseB" placeholder="Tear down the motion…"></textarea>
      <button class="btn cyan block" id="acceptBtn" style="margin-top:14px">Accept & match ${toGen(d.stake)} GEN <span class="ic">${icon("swords")}</span></button>`;
  } else if (st === LOCKED) {
    body += `<button class="btn pink block" id="ruleBtn" style="margin-top:6px">Convene the AI jury <span class="ic">${icon("gavel")}</span></button>
      <div class="hint" style="text-align:center;margin-top:8px">Validators read both cases and must agree on the winner. Calls a real LLM.</div>`;
  }
  $("drawerBody").innerHTML = body; openDrawer();
  if (st === WAITING) $("acceptBtn").onclick = () => doAccept(id, d.stake);
  if (st === LOCKED) $("ruleBtn").onclick = () => doRule(id);
}

async function doCreate() {
  const motion = $("motion").value.trim(), caseA = $("caseA").value.trim(), stake = parseFloat($("stake").value);
  if (!motion) return toast("State the motion.", "err", "forge");
  if (!caseA) return toast("File your opening case.", "err", "forge");
  if (!(stake > 0)) return toast("Stake must be above zero.", "err", "forge");
  const btn = $("createBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> forging';
  try { await ensureWallet(); await write(CONTRACT, "open_duel", [motion, caseA], GEN(stake)); toast("Gauntlet thrown. Duel is live.", "ok", "on-chain"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err", "failed"); btn.disabled = false; btn.innerHTML = `Throw the gauntlet <span class="ic">${icon("swords")}</span>`; }
}
async function doAccept(id, stakeWei) {
  const caseB = $("caseB").value.trim(); if (!caseB) return toast("File your counter-case.", "err", "accept");
  const btn = $("acceptBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> entering';
  try { await ensureWallet(); await write(CONTRACT, "accept_duel", [id, caseB], BigInt(stakeWei)); toast("You're in. Duel locked.", "ok", "on-chain"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err", "failed"); btn.disabled = false; btn.textContent = "Accept"; }
}
async function doRule(id) {
  if (!confirm("Convene the jury now? Validators read both cases and agree on a winner. Calls a real LLM.")) return;
  const btn = $("ruleBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> jury deliberating';
  try { await ensureWallet(); toast("The jury is reading both cases…", "", "verdict"); await write(CONTRACT, "rule", [id]); toast("Verdict delivered. Pot paid.", "ok", "decided"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err", "failed"); btn.disabled = false; btn.textContent = "Convene the AI jury"; }
}

// ---- REAL 3D arena: two crystalline shards orbit + clash in WebGL
function arena3d() {
  const host = $("arena3d"); if (!host || !window.THREE) return;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070509, 0.085);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  function resize() { const w = host.clientWidth, h = host.clientHeight || 460; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); addEventListener("resize", resize);

  // two gem shards
  function shard(color, emissive) {
    const geo = new THREE.IcosahedronGeometry(1.25, 0);
    const mat = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.25, flatShading: true });
    return new THREE.Mesh(geo, mat);
  }
  const A = shard(0xff3d7f, 0x9c1d4e); const B = shard(0x3df0ff, 0x118a99);
  scene.add(A, B);
  // wireframe halos
  const haloA = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.6, 0)), new THREE.LineBasicMaterial({ color: 0xff86b0, transparent: true, opacity: 0.25 }));
  const haloB = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.6, 0)), new THREE.LineBasicMaterial({ color: 0x9af5ff, transparent: true, opacity: 0.25 }));
  scene.add(haloA, haloB);

  // spark core at clash point
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd45e }));
  scene.add(core);
  const coreLight = new THREE.PointLight(0xffd45e, 0, 12); scene.add(coreLight);

  // particle dust
  const N = 360, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 14; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x8a82b8, size: 0.05, transparent: true, opacity: 0.6 }));
  scene.add(dust);

  scene.add(new THREE.AmbientLight(0x404060, 1.1));
  const d1 = new THREE.DirectionalLight(0xff3d7f, 1.1); d1.position.set(-5, 3, 5); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x3df0ff, 1.1); d2.position.set(5, -2, 5); scene.add(d2);

  const mouse = { x: 0, y: 0 };
  addEventListener("mousemove", (e) => { mouse.x = (e.clientX / innerWidth - 0.5) * 2; mouse.y = (e.clientY / innerHeight - 0.5) * 2; });

  let t = 0, running = true;
  const vis = new IntersectionObserver((es) => { running = es[0].isIntersecting; if (running) loop(); }, { threshold: 0 });
  vis.observe(host);

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    t += 0.016;
    const sep = 2.4 + Math.sin(t * 0.9) * 1.7;     // shards approach + retreat
    A.position.set(-sep, Math.sin(t * 0.7) * 0.5, 0);
    B.position.set(sep, -Math.sin(t * 0.7) * 0.5, 0);
    haloA.position.copy(A.position); haloB.position.copy(B.position);
    A.rotation.x += 0.006; A.rotation.y += 0.009; B.rotation.x -= 0.007; B.rotation.y -= 0.008;
    haloA.rotation.copy(A.rotation); haloB.rotation.copy(B.rotation);
    // clash flash when close
    const clash = Math.max(0, 1 - sep / 1.4);
    core.scale.setScalar(0.5 + clash * 3);
    core.material.opacity = clash;
    coreLight.intensity = clash * 4;
    dust.rotation.y += 0.0006;
    camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 0.8 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  loop();
}

$("newDuelBtn").onclick = openCreate;
$("closeDrawer").onclick = closeDrawer;
$("scrim").onclick = closeDrawer;
const cb = $("connectBtn"); if (cb) cb.onclick = doConnect;
if (window.ethereum) window.ethereum.on?.("accountsChanged", refreshWallet);

arena3d();
refreshWallet();
load();
