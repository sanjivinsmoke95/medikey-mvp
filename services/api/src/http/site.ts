/**
 * Full-scale public marketing website (P11+). A separate, self-contained page
 * served at `/` — it reuses the MediKey design language (palette, logo mark,
 * tier model, the emergency-card visual) and the product concepts from the docs.
 * The functional owner console lives at `/console`; the live scanner at `/e/:id`.
 *
 * Static, dependency-free, responsive, theme-aware. No trackers, no external
 * requests (consistent with the frozen "no third-party" stance).
 */
export const SITE_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MediKey — Emergency medical info, disclosed on your terms</title>
<meta name="description" content="MediKey is a privacy-first emergency medical information platform with three-tier controlled disclosure: critical info in a scan, more only when justified, private data never exposed.">
<style>
:root{
  --navy:#173A78; --navy-700:#0f2a5c; --navy-900:#0a1c40;
  --ink:#141a24; --muted:#5b6472; --line:#e5eaf2; --bg:#ffffff; --bg-soft:#f4f7fc;
  --card:#ffffff; --saffron:#f5a623; --green:#1f9d55; --danger:#b00020;
  --radius:16px; --maxw:1120px;
  --shadow:0 1px 2px rgba(16,32,64,.04),0 12px 32px -12px rgba(16,32,64,.18);
}
@media (prefers-color-scheme:dark){
  :root{--ink:#e9edf5;--muted:#9aa6b8;--line:#20293a;--bg:#0c111b;--bg-soft:#0f1626;
    --card:#121a2b;--shadow:0 1px 2px rgba(0,0,0,.3),0 16px 40px -16px rgba(0,0,0,.6);}
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 22px}
.logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--saffron),#fff 52%,var(--green));display:grid;place-items:center;font-weight:800;color:var(--navy);flex:0 0 auto;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.btn{display:inline-flex;align-items:center;gap:8px;font-weight:650;text-decoration:none;border-radius:10px;padding:11px 18px;border:1px solid transparent;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}
.btn:hover{transform:translateY(-1px)}
.btn-primary{background:var(--navy);color:#fff;box-shadow:var(--shadow)}
.btn-ghost{background:transparent;color:var(--ink);border-color:var(--line)}
.btn-white{background:#fff;color:var(--navy)}
.pill{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;padding:5px 12px;border-radius:20px;background:var(--bg-soft);border:1px solid var(--line);color:var(--muted)}
.dot{width:7px;height:7px;border-radius:50%}

/* header */
header{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:saturate(140%) blur(10px);border-bottom:1px solid var(--line)}
.nav{display:flex;align-items:center;gap:14px;height:64px}
.brand{display:flex;align-items:center;gap:11px;font-weight:750;font-size:18px;letter-spacing:.2px}
.nav .links{margin-left:22px;display:flex;gap:22px}
.nav .links a{text-decoration:none;color:var(--muted);font-weight:550;font-size:15px}
.nav .links a:hover{color:var(--ink)}
.nav .spacer{flex:1}
@media(max-width:820px){.nav .links{display:none}}

/* hero */
.hero{position:relative;overflow:hidden;background:radial-gradient(1100px 480px at 78% -8%,rgba(245,166,35,.14),transparent 60%),radial-gradient(900px 520px at 8% 0%,rgba(31,157,85,.12),transparent 55%)}
.hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:78px 0 70px}
@media(max-width:900px){.hero-grid{grid-template-columns:1fr;padding:52px 0 44px;gap:36px}}
h1{font-size:clamp(34px,5vw,54px);line-height:1.06;letter-spacing:-.02em;margin:18px 0 0}
h1 .grad{background:linear-gradient(92deg,var(--navy),var(--green));-webkit-background-clip:text;background-clip:text;color:transparent}
.lede{font-size:19px;color:var(--muted);margin:20px 0 28px;max-width:34em}
.cta-row{display:flex;gap:12px;flex-wrap:wrap}
.trust{display:flex;gap:22px;flex-wrap:wrap;margin-top:26px;color:var(--muted);font-size:14px}
.trust b{color:var(--ink)}

/* phone mock reusing the emergency card */
.phone{justify-self:center;width:300px;max-width:100%;background:var(--card);border:1px solid var(--line);border-radius:30px;box-shadow:var(--shadow);padding:14px}
.phone .scr{border:1px solid var(--line);border-radius:20px;overflow:hidden;background:var(--bg)}
.phone .bar{background:var(--navy);color:#fff;font-size:12px;padding:9px 14px;display:flex;align-items:center;gap:8px;font-weight:600}
.phone .body{padding:14px}
.phone h4{margin:.1em 0 12px;font-size:17px}
.sec{border:1px solid var(--line);border-radius:11px;padding:9px 11px;margin:9px 0;font-size:14px}
.sec .lbl{font-weight:700}
.sec.crit{border-left:5px solid var(--danger);background:color-mix(in srgb,var(--danger) 7%,var(--card))}
.chip{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:10px;padding:1px 7px;margin-left:6px;color:var(--muted);vertical-align:middle}
.caveat{color:var(--danger);font-size:12px;margin-top:3px}

/* sections */
section.block{padding:72px 0;border-top:1px solid var(--line)}
.eyebrow{color:var(--green);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px}
h2{font-size:clamp(26px,3.4vw,36px);letter-spacing:-.02em;margin:10px 0 0;line-height:1.15}
.sub{color:var(--muted);font-size:18px;margin:14px 0 0;max-width:40em}
.grid{display:grid;gap:20px;margin-top:40px}
.g3{grid-template-columns:repeat(3,1fr)}
.g2{grid-template-columns:repeat(2,1fr)}
.g4{grid-template-columns:repeat(4,1fr)}
@media(max-width:900px){.g3,.g4{grid-template-columns:1fr 1fr}}
@media(max-width:620px){.g2,.g3,.g4{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow)}
.card .ic{width:42px;height:42px;border-radius:11px;display:grid;place-items:center;font-size:20px;margin-bottom:14px;background:var(--bg-soft);border:1px solid var(--line)}
.card h3{margin:0 0 7px;font-size:18px}
.card p{margin:0;color:var(--muted);font-size:15px}
.tier{position:relative;overflow:hidden}
.tier .tag{font-size:12px;font-weight:800;letter-spacing:.06em}
.tier.l1{border-top:4px solid var(--danger)} .tier.l1 .tag{color:var(--danger)}
.tier.l2{border-top:4px solid var(--saffron)} .tier.l2 .tag{color:#b9770a}
.tier.l3{border-top:4px solid var(--muted)} .tier.l3 .tag{color:var(--muted)}
.tier ul{margin:12px 0 0;padding-left:18px;color:var(--muted);font-size:14px}
.tier li{margin:5px 0}

/* steps */
.steps{counter-reset:s;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:40px}
@media(max-width:820px){.steps{grid-template-columns:1fr 1fr}}
@media(max-width:520px){.steps{grid-template-columns:1fr}}
.step{position:relative;padding-left:52px}
.step:before{counter-increment:s;content:counter(s);position:absolute;left:0;top:-2px;width:38px;height:38px;border-radius:11px;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:800}
.step h3{margin:0 0 4px;font-size:16.5px}
.step p{margin:0;color:var(--muted);font-size:14.5px}

/* stat band */
.band{background:var(--navy);color:#fff;border-radius:22px;padding:36px;display:grid;grid-template-columns:repeat(4,1fr);gap:18px;text-align:center;box-shadow:var(--shadow)}
@media(max-width:720px){.band{grid-template-columns:1fr 1fr;padding:28px}}
.band .n{font-size:30px;font-weight:800}
.band .l{opacity:.82;font-size:14px;margin-top:4px}

/* CTA */
.cta{background:linear-gradient(135deg,var(--navy),var(--navy-900));color:#fff;border-radius:24px;padding:52px;text-align:center;box-shadow:var(--shadow)}
.cta h2{color:#fff}
.cta p{color:#cfe;opacity:.85;max-width:34em;margin:14px auto 26px}

footer{border-top:1px solid var(--line);padding:40px 0;color:var(--muted);font-size:14px}
.foot{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.foot .spacer{flex:1}
.note{font-size:12.5px;color:var(--muted);margin-top:10px}
.reveal{opacity:0;transform:translateY(14px);transition:opacity .6s ease,transform .6s ease}
.reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}
</style>
</head>
<body>
<header>
  <div class="wrap nav">
    <span class="brand"><span class="logo">M</span> MediKey</span>
    <div class="links">
      <a href="#how">How it works</a>
      <a href="#tiers">Disclosure</a>
      <a href="#security">Security</a>
      <a href="#features">Features</a>
    </div>
    <span class="spacer"></span>
    <a class="btn btn-ghost" href="/console">Owner console</a>
  </div>
</header>

<!-- HERO -->
<div class="hero"><div class="wrap hero-grid">
  <div>
    <span class="pill"><span class="dot" style="background:var(--green)"></span> Privacy-first · India-ready · synthetic-data demo</span>
    <h1>Emergency medical info,<br><span class="grad">disclosed on your terms.</span></h1>
    <p class="lede">A first responder scanning your MediKey sees exactly the critical facts you chose — allergies, blood group, a contact. Everything else stays sealed unless it's truly justified, and your private notes are never reachable from a scan.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="/console">Open the owner console →</a>
      <a class="btn btn-ghost" href="#how">See how it works</a>
    </div>
    <div class="trust">
      <span><b>3-tier</b> controlled disclosure</span>
      <span><b>Field-level</b> encryption</span>
      <span><b>No medical data</b> in the QR</span>
    </div>
  </div>
  <!-- phone mock reuses the real emergency-page card design -->
  <div class="phone" aria-hidden="true"><div class="scr">
    <div class="bar"><span class="logo" style="width:18px;height:18px;border-radius:5px;font-size:11px">M</span> Emergency Medical Information</div>
    <div class="body">
      <h4>Scan result · L1 critical</h4>
      <div class="sec"><span class="lbl">Name:</span> Asha Rao <span class="chip">user-provided</span></div>
      <div class="sec crit"><span class="lbl">Allergy:</span> penicillin — anaphylaxis <span class="chip">life-threatening</span></div>
      <div class="sec"><span class="lbl">Blood group:</span> O+ <span class="chip">verified</span><div class="caveat">confirm before transfusion</div></div>
      <div class="sec"><span class="lbl">Emergency contact:</span> Ravi — brother <span class="chip">tap to call</span></div>
    </div>
  </div></div>
</div></div>

<!-- HOW -->
<section class="block" id="how"><div class="wrap">
  <span class="eyebrow">How it works</span>
  <h2>From a scan in seconds — nothing more than needed.</h2>
  <p class="sub">The public emergency page is server-rendered, works with no app, carries no trackers, and shows only the tier you allow-listed.</p>
  <div class="steps">
    <div class="step reveal"><h3>Build a profile</h3><p>Add allergies, conditions, meds, implants, blood group and a contact — each field encrypted before it's stored.</p></div>
    <div class="step reveal"><h3>Set disclosure</h3><p>Assign every field a tier: L1 critical, L2 additional, or L3 private. DOB can never sit at L1.</p></div>
    <div class="step reveal"><h3>Generate a MediKey</h3><p>Get an opaque QR — no medical data in it, only a random id stored as a one-way hash.</p></div>
    <div class="step reveal"><h3>Responder scans</h3><p>The L1 page loads with provenance on every fact. The access is logged; you can revoke instantly.</p></div>
  </div>
</div></section>

<!-- TIERS -->
<section class="block" id="tiers" style="background:var(--bg-soft)"><div class="wrap">
  <span class="eyebrow">Controlled disclosure</span>
  <h2>Three tiers. One engine. No leaks.</h2>
  <p class="sub">A single disclosure engine drives the scan, your preview, and break-glass — so what you preview is exactly what a responder sees, and L3 is unreachable by any scanner path.</p>
  <div class="grid g3">
    <div class="card tier l1 reveal"><span class="tag">L1 · CRITICAL</span><h3>Seen on any scan</h3><p>The facts that change first-response decisions.</p><ul><li>Severe allergies</li><li>Blood group (with caveat)</li><li>Critical conditions & implants</li><li>Emergency contact — tap to call</li></ul></div>
    <div class="card tier l2 reveal"><span class="tag">L2 · ADDITIONAL</span><h3>Only via break-glass</h3><p>Released with attestation, single-use, time-boxed — and you're notified every time.</p><ul><li>Full medication list</li><li>Secondary conditions</li><li>Context for clinicians</li><li>Auto-suspends on abuse</li></ul></div>
    <div class="card tier l3 reveal"><span class="tag">L3 · PRIVATE</span><h3>Never via a scan</h3><p>Enforced three ways: token level, projection filter, and no L3 mint path exists.</p><ul><li>Sensitive history</li><li>Documents & insurance</li><li>Private notes</li><li>Owner-only, step-up gated</li></ul></div>
  </div>
</div></section>

<!-- STAT BAND -->
<section class="block"><div class="wrap">
  <div class="band reveal">
    <div><div class="n">101</div><div class="l">automated tests passing</div></div>
    <div><div class="n">3</div><div class="l">disclosure tiers enforced</div></div>
    <div><div class="n">0</div><div class="l">medical data in the QR</div></div>
    <div><div class="n">&lt;60s</div><div class="l">revocation target</div></div>
  </div>
</div></section>

<!-- SECURITY -->
<section class="block" id="security" style="background:var(--bg-soft)"><div class="wrap">
  <span class="eyebrow">Security & privacy</span>
  <h2>Built to protect, by construction.</h2>
  <p class="sub">Every guarantee below is backed by a test in the security suite — not a promise on a slide.</p>
  <div class="grid g3">
    <div class="card reveal"><div class="ic">🔐</div><h3>Field-level encryption</h3><p>Each field is envelope-encrypted with a per-record key. A raw database dump yields only ciphertext.</p></div>
    <div class="card reveal"><div class="ic">🧯</div><h3>Crypto-shred deletion</h3><p>Deleting destroys the subject key — every copy, including backups, becomes unrecoverable. No resurrection.</p></div>
    <div class="card reveal"><div class="ic">🎭</div><h3>No existence oracle</h3><p>A revoked or unknown code returns the exact same neutral page. Ownership failures look like not-found.</p></div>
    <div class="card reveal"><div class="ic">📍</div><h3>Location off by default</h3><p>Access logs are coarse and anonymous; precise location is opt-in only, never assumed.</p></div>
    <div class="card reveal"><div class="ic">🧾</div><h3>Provenance or fail</h3><p>Every fact shows where it came from. Absence is never read as negation — only stated negatives show "no known…".</p></div>
    <div class="card reveal"><div class="ic">🚫</div><h3>Display, not instruct</h3><p>The page states facts and caveats — never clinical orders. Blood group always carries "confirm before transfusion".</p></div>
  </div>
</div></section>

<!-- FEATURES -->
<section class="block" id="features"><div class="wrap">
  <span class="eyebrow">Platform</span>
  <h2>Everything the owner controls.</h2>
  <div class="grid g4">
    <div class="card reveal"><div class="ic">👤</div><h3>Profiles & dependents</h3><p>Manage your own and family profiles, each isolated by strict ownership checks.</p></div>
    <div class="card reveal"><div class="ic">🩺</div><h3>Rich medical items</h3><p>Allergies, conditions, meds, avoidances, implants, surgeries, injuries, contacts.</p></div>
    <div class="card reveal"><div class="ic">👁️</div><h3>Mandatory preview</h3><p>See the exact scanner page before activating — same engine, no surprises.</p></div>
    <div class="card reveal"><div class="ic">🔁</div><h3>Revoke & regenerate</h3><p>Kill a lost code instantly; issue a replacement without touching your data.</p></div>
    <div class="card reveal"><div class="ic">📜</div><h3>Access history</h3><p>See when your MediKey was scanned or break-glassed — coarse, medical-free.</p></div>
    <div class="card reveal"><div class="ic">📤</div><h3>Export your data</h3><p>Own-data-only export behind step-up. No bulk or admin path exists.</p></div>
    <div class="card reveal"><div class="ic">🛡️</div><h3>Step-up auth</h3><p>Sensitive actions re-verify your credential; OTP recovery can never reach step-up.</p></div>
    <div class="card reveal"><div class="ic">🌐</div><h3>SSR, no-JS scan</h3><p>The emergency page renders on the server with no critical-path JavaScript.</p></div>
  </div>
</div></section>

<!-- CTA -->
<section class="block"><div class="wrap">
  <div class="cta reveal">
    <h2>Try the working demo.</h2>
    <p>Spin through the whole loop — create a profile, set disclosure, generate a code, and open the exact page a responder would scan.</p>
    <div class="cta-row" style="justify-content:center">
      <a class="btn btn-white" href="/console">Open owner console →</a>
      <a class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.4)" href="#how">Learn more</a>
    </div>
    <p class="note" style="color:#bcd;opacity:.8">Demo uses synthetic data only. No real medical information.</p>
  </div>
</div></section>

<footer><div class="wrap foot">
  <span class="brand" style="font-size:16px"><span class="logo" style="width:26px;height:26px;border-radius:7px;font-size:14px">M</span> MediKey</span>
  <span class="spacer"></span>
  <a href="/console">Console</a><a href="#security">Security</a><a href="#tiers">Disclosure</a>
  <span style="width:100%;margin-top:8px" class="note">Privacy-first emergency medical information & controlled-disclosure platform. Not a substitute for clinical judgement — in an emergency, call your local services. Synthetic data only.</span>
</div></footer>

<script>
// lightweight scroll-reveal (no libraries)
const io=new IntersectionObserver((es)=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=(i%4*60)+'ms';io.observe(el);});
</script>
</body>
</html>`;
