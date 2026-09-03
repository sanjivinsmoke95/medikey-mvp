/**
 * Owner experience (redesigned). A calm, consumer-facing health-identity app —
 * Home · My Profile · Medical · Sharing · Activity · Settings — over the SAME
 * secure endpoints the tests use. No authority lives here: step-up, ownership,
 * disclosure tiers and audit are all enforced server-side. The old admin-style
 * console is replaced by progressive disclosure: the owner sees identity and
 * emergency info first; security controls live under Settings.
 */
export const OWNER_UI_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>MediKey</title>
<style>
:root{
  --navy:#173A78; --navy-700:#0f2a5c; --ink:#182230; --muted:#63707f; --faint:#8b97a6;
  --line:#e6ebf2; --bg:#f5f8fc; --card:#ffffff; --soft:#eef4fb;
  --accent:#173A78; --green:#1f9d55; --green-soft:#e7f6ee; --saffron:#f5a623;
  --danger:#c02636; --danger-soft:#fdecee; --radius:16px;
  --shadow:0 1px 2px rgba(16,32,64,.04),0 10px 30px -14px rgba(16,32,64,.16);
}
@media (prefers-color-scheme:dark){:root{
  --ink:#e9eef6; --muted:#9fabbc; --faint:#7b8698; --line:#212b3c; --bg:#0c111b; --card:#121a2b;
  --soft:#16203400; --soft:#152036; --danger-soft:#2a1416; --green-soft:#12281c;
  --shadow:0 1px 2px rgba(0,0,0,.3),0 14px 36px -16px rgba(0,0,0,.6);}}
*{box-sizing:border-box}
body{margin:0;font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{margin:0}
button,input,select,textarea{font:inherit}
.logo{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,var(--saffron),#fff 52%,var(--green));display:grid;place-items:center;font-weight:800;color:var(--navy);flex:0 0 auto}
.btn{display:inline-flex;align-items:center;gap:8px;justify-content:center;font-weight:600;border:1px solid transparent;border-radius:10px;padding:10px 16px;cursor:pointer;transition:filter .12s,transform .12s;background:var(--accent);color:#fff}
.btn:hover{filter:brightness(1.06)}
.btn:active{transform:translateY(1px)}
.btn.ghost{background:transparent;color:var(--ink);border-color:var(--line)}
.btn.soft{background:var(--soft);color:var(--navy)}
.btn.danger{background:var(--danger)}
.btn.sm{padding:6px 12px;font-size:13.5px;border-radius:9px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.block{width:100%}
label.fld{display:block;font-size:13px;color:var(--muted);margin:12px 0 5px;font-weight:500}
input,select,textarea{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
input:focus,select:focus,textarea:focus,button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.pad{padding:20px}
.muted{color:var(--muted)} .faint{color:var(--faint)} .small{font-size:13px}
.row{display:flex;gap:12px;flex-wrap:wrap}
.row>*{flex:1;min-width:150px}
.between{display:flex;align-items:center;justify-content:space-between;gap:12px}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:20px;background:var(--soft);color:var(--navy);border:1px solid var(--line)}
.chip.crit{background:var(--danger-soft);color:var(--danger);border-color:transparent}
.chip.ok{background:var(--green-soft);color:#0c6b38;border-color:transparent}
.hidden{display:none!important}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* shell */
#app{display:grid;grid-template-columns:236px 1fr;min-height:100vh}
aside{background:var(--card);border-right:1px solid var(--line);padding:18px 14px;display:flex;flex-direction:column;gap:4px;position:sticky;top:0;height:100vh}
aside .brand{display:flex;align-items:center;gap:10px;font-weight:750;font-size:18px;padding:6px 8px 16px}
nav.side a{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:var(--muted);text-decoration:none;font-weight:550;cursor:pointer}
nav.side a .i{width:20px;text-align:center}
nav.side a:hover{background:var(--soft);color:var(--ink)}
nav.side a.on{background:var(--soft);color:var(--navy);font-weight:650}
nav.side .sep{height:1px;background:var(--line);margin:10px 6px}
aside .foot{margin-top:auto;display:flex;align-items:center;gap:10px;padding:10px 8px;border-top:1px solid var(--line)}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-weight:700;color:var(--navy);overflow:hidden;flex:0 0 auto}
.avatar img{width:100%;height:100%;object-fit:cover}
main{padding:28px 32px;max-width:900px;width:100%}
.page-h{margin:0 0 4px;font-size:24px;letter-spacing:-.01em}
.page-sub{color:var(--muted);margin:0 0 22px}
.grid{display:grid;gap:16px}
.g2{grid-template-columns:1fr 1fr}

/* mobile */
.topbar{display:none}
nav.bottom{display:none}
@media(max-width:820px){
  #app{grid-template-columns:1fr}
  aside{display:none}
  main{padding:16px 16px 88px}
  .topbar{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
  .topbar .brand{display:flex;align-items:center;gap:9px;font-weight:750;font-size:17px}
  nav.bottom{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);z-index:20}
  nav.bottom a{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 0;color:var(--muted);text-decoration:none;font-size:11px;cursor:pointer}
  nav.bottom a.on{color:var(--navy)}
  nav.bottom a .i{font-size:18px}
  .g2{grid-template-columns:1fr}
}

/* identity card */
.idcard{background:linear-gradient(135deg,var(--navy),var(--navy-700));color:#fff;border-radius:20px;padding:22px;box-shadow:var(--shadow)}
.idcard .top{display:flex;align-items:center;gap:14px}
.idcard .av{width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,.14);display:grid;place-items:center;font-size:22px;font-weight:800;overflow:hidden}
.idcard .av img{width:100%;height:100%;object-fit:cover;border-radius:14px}
.idcard .facts{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px 18px}
.idcard .facts .k{font-size:12px;opacity:.7} .idcard .facts .v{font-weight:650;font-size:15px}
.idcard .acts{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}
.idcard .acts .btn{background:rgba(255,255,255,.16);border-color:transparent;color:#fff}
.idcard .acts .btn.solid{background:#fff;color:var(--navy)}

/* summary links */
.linkcard{display:flex;align-items:center;gap:14px;padding:16px 18px;cursor:pointer}
.linkcard .ic{width:42px;height:42px;border-radius:12px;background:var(--soft);display:grid;place-items:center;font-size:20px;flex:0 0 auto}
.linkcard .grow{flex:1;min-width:0}
.linkcard h4{font-size:15.5px} .linkcard p{margin:2px 0 0;color:var(--muted);font-size:13.5px}
.linkcard .arw{color:var(--faint);font-size:20px}

/* list rows */
.rowitem{display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid var(--line)}
.rowitem:first-child{border-top:0}
.rowitem .grow{flex:1;min-width:0}
.rowitem h4{font-size:15px} .rowitem p{margin:2px 0 0;color:var(--muted);font-size:13px}
.empty{padding:30px 20px;text-align:center;color:var(--muted)}
.empty .ic{font-size:30px;opacity:.5;margin-bottom:8px}

/* section header */
.sec-h{display:flex;align-items:center;justify-content:space-between;margin:26px 0 12px}
.sec-h h3{font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}

/* modal */
.scrim{position:fixed;inset:0;background:rgba(10,18,34,.5);display:grid;place-items:center;z-index:50;padding:18px}
.modal{background:var(--card);border-radius:18px;box-shadow:var(--shadow);width:100%;max-width:460px;max-height:90vh;overflow:auto}
.modal .m-h{padding:18px 20px 4px} .modal .m-b{padding:8px 20px 20px}
.modal h3{font-size:18px} .modal .m-h p{margin:6px 0 0;color:var(--muted);font-size:14px}
.qrbox{display:grid;place-items:center;padding:16px;background:#fff;border-radius:14px}
.qrbox svg{width:220px;height:220px}
.docgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
.doc{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card);cursor:pointer}
.doc img{width:100%;height:96px;object-fit:cover;display:block;background:var(--soft)}
.doc .cap{padding:8px 10px;font-size:12.5px}
.toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:11px 18px;border-radius:12px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:60;max-width:90%}
.toast.show{opacity:1}.toast.err{background:var(--danger);color:#fff}
</style>
</head>
<body>

<!-- AUTH GATE -->
<div id="auth" style="min-height:100vh;display:grid;place-items:center;padding:20px">
  <div class="card pad" style="width:100%;max-width:380px">
    <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px"><span class="logo">M</span><b style="font-size:19px">MediKey</b></div>
    <p class="muted" style="margin:0 0 14px">Your secure medical identity.</p>
    <label class="fld">Email</label><input id="email" placeholder="you@example.com" value="asha@example.com">
    <label class="fld">Passphrase <span class="faint">— any length, e.g. a short PIN</span></label><input id="secret" type="password" value="1234">
    <button id="btnLogin" class="btn block" style="margin-top:16px">Sign in</button>
    <div class="row" style="margin-top:10px">
      <button id="btnPasskeyLogin" class="btn ghost">🔑 Passkey</button>
      <button id="btnRegister" class="btn ghost">Create account</button>
    </div>
    <p class="faint small" style="text-align:center;margin:14px 0 0">Demo uses synthetic data only.</p>
  </div>
</div>

<!-- APP SHELL -->
<div id="app" class="hidden">
  <aside>
    <div class="brand"><span class="logo">M</span> MediKey</div>
    <nav class="side" id="nav">
      <a data-go="home"><span class="i">🏠</span> Home</a>
      <a data-go="profile"><span class="i">👤</span> My Profile</a>
      <a data-go="medical"><span class="i">🩺</span> Medical</a>
      <a data-go="sharing"><span class="i">🔗</span> Sharing</a>
      <div class="sep"></div>
      <a data-go="activity"><span class="i">🕑</span> Activity</a>
      <a data-go="settings"><span class="i">⚙️</span> Settings</a>
    </nav>
    <div class="foot">
      <div class="avatar" id="sideAv">M</div>
      <div style="min-width:0"><div id="sideName" style="font-weight:650;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">—</div><div class="faint small">Signed in</div></div>
    </div>
  </aside>

  <div style="min-width:0">
    <div class="topbar"><span class="brand"><span class="logo">M</span> MediKey</span><div style="flex:1"></div><div class="avatar" id="topAv" data-go="settings" style="cursor:pointer">M</div></div>
    <main id="main"></main>
    <nav class="bottom" id="navm">
      <a data-go="home"><span class="i">🏠</span>Home</a>
      <a data-go="profile"><span class="i">👤</span>Profile</a>
      <a data-go="medical"><span class="i">🩺</span>Medical</a>
      <a data-go="sharing"><span class="i">🔗</span>Sharing</a>
    </nav>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const S = { token:null, stepped:false, email:null, accountId:null, subject:null, items:[], view:'home' };
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m,err){ const t=$('toast'); t.textContent=m; t.className='toast show'+(err?' err':''); clearTimeout(t._x); t._x=setTimeout(()=>t.className='toast',2800); }

async function api(method, path, body){
  const h={}; if(body!==undefined) h['content-type']='application/json'; if(S.token) h.authorization='Bearer '+S.token;
  const r=await fetch(path,{method,headers:h,body:body!==undefined?JSON.stringify(body):undefined});
  const txt=await r.text(); let d={}; try{ d=txt?JSON.parse(txt):{}; }catch{ d={_text:txt}; }
  if(!r.ok){ const e=new Error(d.message||d.error||('HTTP '+r.status)); e.status=r.status; throw e; }
  return d;
}

/* ---------- auth ---------- */
$('btnLogin').onclick = async()=>{ try{ const r=await api('POST','/api/auth/login',{email:$('email').value,secret:$('secret').value}); await onSignedIn(r); }catch(e){ toast(e.message,true);} };
$('btnRegister').onclick = async()=>{ try{ await api('POST','/api/auth/register',{email:$('email').value,secret:$('secret').value}); const r=await api('POST','/api/auth/login',{email:$('email').value,secret:$('secret').value}); await onSignedIn(r); toast('Welcome to MediKey'); }catch(e){ toast(e.message,true);} };
function waOK(){ return window.PublicKeyCredential && PublicKeyCredential.parseRequestOptionsFromJSON; }
$('btnPasskeyLogin').onclick = async()=>{
  if(!waOK()) return toast('This browser lacks passkey support',true);
  const email=$('email').value;
  try{ const o=await api('POST','/api/auth/passkey/login/options',{email});
    const c=await navigator.credentials.get({publicKey:PublicKeyCredential.parseRequestOptionsFromJSON(o)});
    const r=await api('POST','/api/auth/passkey/login/verify',{email,response:c.toJSON()}); await onSignedIn(r); toast('Signed in with passkey');
  }catch(e){ toast(e.message||'cancelled',true);} };

async function onSignedIn(r){
  S.token=r.token; S.accountId=r.accountId; S.stepped=(r.authStrength==='stepped_up'); S.email=$('email').value;
  $('auth').classList.add('hidden'); $('app').classList.remove('hidden');
  await loadSubject(); go('home');
}
async function loadSubject(){
  const subs=await api('GET','/api/subjects');
  S.subject = subs[0] || null;
  if(S.subject){ S.items = await api('GET','/api/subjects/'+S.subject.id+'/items'); refreshChrome(); }
  else { S.items=[]; }
}
function refreshChrome(){
  const name=S.subject? S.subject.fullName : '—';
  $('sideName').textContent=name;
  const photo=S.subject&&S.subject.extras&&S.subject.extras.photo;
  const initials=(name||'M').trim()[0]||'M';
  for(const el of [$('sideAv'),$('topAv')]) el.innerHTML = photo? '<img src="'+esc(photo)+'">' : esc(initials.toUpperCase());
}

/* ---------- step-up (hidden complexity) ---------- */
function ensureStepUp(){
  return new Promise((resolve)=>{
    if(S.stepped) return resolve(true);
    openModal(\`<div class="m-h"><h3>Confirm it's you</h3><p>For your security, sensitive changes need a quick confirmation.</p></div>
      <div class="m-b">
        <label class="fld">Passphrase</label><input id="suSecret" type="password" autocomplete="current-password">
        <button id="suGo" class="btn block" style="margin-top:14px">Confirm</button>
        <button id="suPk" class="btn ghost block" style="margin-top:8px">🔑 Use passkey instead</button>
      </div>\`);
    $('suGo').onclick=async()=>{ try{ const r=await api('POST','/api/auth/stepup',{secret:$('suSecret').value}); S.token=r.token; S.stepped=true; _modalClose=null; closeModal(); resolve(true);}catch(e){toast(e.message,true);} };
    $('suPk').onclick=async()=>{ if(!waOK()) return toast('No passkey support',true);
      try{ const o=await api('POST','/api/auth/passkey/login/options',{email:S.email});
        const c=await navigator.credentials.get({publicKey:PublicKeyCredential.parseRequestOptionsFromJSON(o)});
        const r=await api('POST','/api/auth/passkey/stepup/verify',{email:S.email,response:c.toJSON()}); S.token=r.token; S.stepped=true; _modalClose=null; closeModal(); resolve(true);
      }catch(e){toast(e.message||'cancelled',true);} };
    onModalClose(()=>resolve(false));
  });
}

/* ---------- modal ---------- */
let _modalClose=null;
function openModal(html){ let s=$('scrim'); if(!s){ s=document.createElement('div'); s.id='scrim'; s.className='scrim'; document.body.appendChild(s);}
  s.innerHTML='<div class="modal">'+html+'</div>'; s.onclick=e=>{ if(e.target===s) closeModal(); }; }
function onModalClose(fn){ _modalClose=fn; }
function closeModal(){ const s=$('scrim'); if(s) s.remove(); const fn=_modalClose; _modalClose=null; if(fn) fn(); }
function confirmAction(title,msg,label,danger){
  return new Promise(res=>{ openModal(\`<div class="m-h"><h3>\${esc(title)}</h3><p>\${esc(msg)}</p></div>
    <div class="m-b" style="display:flex;gap:10px;justify-content:flex-end"><button id="cCancel" class="btn ghost">Cancel</button><button id="cGo" class="btn \${danger?'danger':''}">\${esc(label)}</button></div>\`);
    $('cCancel').onclick=()=>{ _modalClose=null; closeModal(); res(false); };
    $('cGo').onclick=()=>{ _modalClose=null; closeModal(); res(true); };
    onModalClose(()=>res(false)); });
}

/* ---------- router ---------- */
function go(view){
  S.view=view;
  document.querySelectorAll('[data-go]').forEach(a=>a.classList.toggle('on',a.dataset.go===view));
  const R={home:renderHome,profile:renderProfile,medical:renderMedical,sharing:renderSharing,activity:renderActivity,settings:renderSettings};
  (R[view]||renderHome)();
  if(window.matchMedia('(max-width:820px)').matches) window.scrollTo(0,0);
}
document.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>go(a.dataset.go));

/* ---------- helpers on items ---------- */
const TYPE_LABEL={blood_group:'Blood group',allergy:'Allergy',condition:'Condition',medication:'Medication',medication_avoidance:'Do NOT administer',implant:'Implant / device',surgery:'Surgery',injury:'Injury',emergency_contact:'Emergency contact',document:'Document'};
const byType=t=>S.items.filter(i=>i.type===t);
function itemSummary(i){ const d=i.data||{}; if(i.type==='medication') return d.name+(d.dose?(' · '+d.dose):'')+(d.frequency?(' · '+d.frequency):''); if(i.type==='allergy') return d.name+(d.reaction?(' — '+d.reaction):''); if(i.type==='emergency_contact') return d.name+(d.relationship?(' ('+d.relationship+')'):'')+(d.phone?(' · '+d.phone):''); if(i.type==='blood_group') return d.group||d.name||''; return d.name||d.title||''; }
function bloodGroup(){ const b=byType('blood_group')[0]; return b? (b.data.group||b.data.name):null; }
function criticalAllergies(){ return byType('allergy').filter(a=>a.isCritical).map(a=>a.data.name).filter(Boolean); }
function emergencyContact(){ const c=byType('emergency_contact')[0]; return c? {name:c.data.name,phone:c.data.phone,rel:c.data.relationship}:null; }
function relTime(iso){ const s=(Date.now()-Date.parse(iso))/1000; if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+' min ago'; if(s<86400)return Math.floor(s/3600)+' h ago'; if(s<172800)return 'yesterday'; return Math.floor(s/86400)+' days ago'; }

/* ================= HOME ================= */
async function renderHome(){
  if(!S.subject) return renderOnboarding();
  const s=S.subject, ex=s.extras||{};
  const allerg=criticalAllergies(), bg=bloodGroup(), ec=emergencyContact();
  let history=[]; try{ history=await api('GET','/api/subjects/'+s.id+'/history'); }catch{}
  const recent=history.slice(-3).reverse();
  $('main').innerHTML=\`
   <h1 class="page-h">\${greeting()}, \${esc(firstName())}</h1>
   <p class="page-sub">Here's your MediKey at a glance.</p>

   <div class="idcard">
     <div class="top">
       <div class="av">\${ex.photo?'<img src="'+esc(ex.photo)+'">':esc((firstName()[0]||'M').toUpperCase())}</div>
       <div><div style="font-size:19px;font-weight:750">\${esc(s.fullName)}</div>
       <div style="opacity:.75;font-size:13px">\${s.ageYears!=null?('Age '+s.ageYears):'MediKey holder'}\${ex.gender?(' · '+esc(ex.gender)):''}</div></div>
     </div>
     <div class="facts">
       <div><div class="k">Blood group</div><div class="v">\${bg?esc(bg):'Not added'}</div></div>
       <div><div class="k">Critical allergies</div><div class="v">\${allerg.length?esc(allerg.join(', ')):'None added'}</div></div>
       <div><div class="k">Emergency contact</div><div class="v">\${ec?esc(ec.name+(ec.phone?(' · '+ec.phone):'')):'Not added'}</div></div>
       <div><div class="k">Status</div><div class="v">\${statusOf()}</div></div>
     </div>
     <div class="acts">
       <button class="btn solid" onclick="viewEmergencyCard()">View emergency card</button>
       <button class="btn" onclick="go('sharing')">QR / Share</button>
     </div>
   </div>

   <div class="sec-h"><h3>Your information</h3></div>
   <div class="card">
     <div class="linkcard" onclick="go('profile')"><div class="ic">👤</div><div class="grow"><h4>Personal details</h4><p>Your contact and identity information</p></div><div class="arw">›</div></div>
     <div class="linkcard" style="border-top:1px solid var(--line)" onclick="go('medical')"><div class="ic">🩺</div><div class="grow"><h4>Medical information</h4><p>\${medicalSummary()}</p></div><div class="arw">›</div></div>
     <div class="linkcard" style="border-top:1px solid var(--line)" onclick="go('sharing')"><div class="ic">🔗</div><div class="grow"><h4>Sharing &amp; access</h4><p>\${sharingSummary()}</p></div><div class="arw">›</div></div>
   </div>

   <div class="sec-h"><h3>Recent activity</h3><a class="chip" style="cursor:pointer" onclick="go('activity')">View activity</a></div>
   <div class="card">\${recent.length? recent.map(rowActivity).join('') : emptyBlock('🕑','No access yet','Your MediKey hasn\\'t been scanned recently.')}</div>\`;
}
function renderOnboarding(){
  $('main').innerHTML=\`<h1 class="page-h">Welcome to MediKey</h1><p class="page-sub">Let's set up your medical identity. This takes a minute.</p>
    <div class="card pad" style="max-width:460px">
      <label class="fld">Full name</label><input id="obName" placeholder="e.g. Asha Rao">
      <label class="fld">Date of birth</label><input id="obDob" type="date">
      <label class="fld">Gender (optional)</label><input id="obGender" placeholder="e.g. Female">
      <div class="row"><div><label class="fld">Blood group</label><input id="obBlood" placeholder="e.g. O+"></div>
      <div><label class="fld">Emergency contact phone</label><input id="obPhone" placeholder="+91…"></div></div>
      <button id="obGo" class="btn block" style="margin-top:16px">Create my MediKey</button>
    </div>\`;
  $('obGo').onclick=async()=>{
    const name=$('obName').value.trim(); if(!name) return toast('Please enter your name',true);
    try{
      const r=await api('POST','/api/subjects',{fullName:name,dateOfBirth:$('obDob').value||undefined,extras:{gender:$('obGender').value||undefined}});
      const sid=r.subjectId;
      if($('obBlood').value.trim()) await api('POST','/api/subjects/'+sid+'/items',{type:'blood_group',data:{group:$('obBlood').value.trim()},provenance:'user_confirmed'});
      if($('obPhone').value.trim()) await api('POST','/api/subjects/'+sid+'/items',{type:'emergency_contact',data:{name:'Emergency contact',phone:$('obPhone').value.trim()},isCritical:true});
      await loadSubject(); toast('Your MediKey is ready'); go('home');
    }catch(e){ toast(e.message,true);} };
}
function greeting(){ const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; }
function firstName(){ return (S.subject.fullName||'there').split(' ')[0]; }
function statusOf(){ const ready = bloodGroup()||criticalAllergies().length||emergencyContact(); return ready? '<span style="color:#8fe3b3">● Active</span>':'○ Incomplete'; }
function medicalSummary(){ const n=S.items.filter(i=>['allergy','condition','medication'].includes(i.type)).length; return n? (n+' item'+(n>1?'s':'')+' — conditions, allergies, medications') : 'Add conditions, allergies, medications'; }
function sharingSummary(){ return 'Generate a QR and manage who can see your info'; }
function rowActivity(h){ return \`<div class="rowitem"><div class="ic" style="width:36px;height:36px;border-radius:10px;background:var(--soft);display:grid;place-items:center">\${h.accessType==='break_glass'?'🩹':'📷'}</div><div class="grow"><h4>\${activityTitle(h)}</h4><p>\${relTime(h.createdAt)}\${h.city?(' · '+esc(h.city)):''}</p></div></div>\`; }
function activityTitle(h){ if(h.accessType==='break_glass') return 'Break-glass access (additional info)'; if(h.status==='shown') return 'Your emergency info was viewed'; if(h.status==='revoked'||h.status==='not_found') return 'A revoked code was scanned'; if(h.status==='rate_limited') return 'A scan was rate-limited'; return 'MediKey scanned'; }

async function viewEmergencyCard(){
  openModal('<div class="m-h"><h3>Emergency card</h3><p>Exactly what a responder sees when they scan your MediKey.</p></div><div class="m-b"><div id="ecFrame" style="height:60vh"><div class="empty"><span class="spinner"></span></div></div></div>');
  try{ const res=await fetch('/api/subjects/'+S.subject.id+'/preview.html',{headers:{authorization:'Bearer '+S.token}}); const html=await res.text();
    $('ecFrame').innerHTML='<iframe style="width:100%;height:100%;border:1px solid var(--line);border-radius:12px" title="Emergency card"></iframe>'; $('ecFrame').firstChild.srcdoc=html;
  }catch(e){ $('ecFrame').innerHTML='<div class="empty">Could not load</div>'; }
}

/* ================= MY PROFILE ================= */
function renderProfile(){
  if(!S.subject) return renderOnboarding();
  const s=S.subject, ex=s.extras||{}; const ec=emergencyContact(), bg=bloodGroup();
  $('main').innerHTML=\`<h1 class="page-h">My Profile</h1><p class="page-sub">Your personal and identity information.</p>
   <div class="card"><div class="pad between"><h3>Basic information</h3><button class="btn soft sm" onclick="editBasic()">Edit</button></div>
     \${field('Full name',s.fullName)}\${field('Date of birth',s.dateOfBirth||'—')}\${field('Age',s.ageYears!=null?String(s.ageYears):'—')}\${field('Gender',ex.gender||'—')}</div>
   <div class="card" style="margin-top:16px"><div class="pad between"><h3>Contact information</h3><button class="btn soft sm" onclick="editContact()">Edit</button></div>
     \${field('Phone',ex.phone||'—')}\${field('Email',maskEmail())}\${field('Address',ex.address||'—')}</div>
   <div class="card" style="margin-top:16px"><div class="pad between"><h3>Emergency information</h3><button class="btn soft sm" onclick="go('medical')">Manage</button></div>
     \${field('Blood group',bg||'Not added')}\${field('Emergency contact',ec?(ec.name+(ec.rel?(' ('+ec.rel+')'):'')):'Not added')}\${field('Contact phone',ec&&ec.phone||'—')}</div>\`;
}
function field(k,v){ return \`<div class="rowitem"><div class="grow"><p style="margin:0;color:var(--muted);font-size:12.5px">\${esc(k)}</p><h4 style="font-weight:600;margin-top:2px">\${esc(v)}</h4></div></div>\`; }
function maskEmail(){ return S.email||'—'; }
function editBasic(){
  const ex=S.subject.extras||{};
  openModal(\`<div class="m-h"><h3>Edit basic information</h3></div><div class="m-b">
    <label class="fld">Full name</label><input id="eName" value="\${esc(S.subject.fullName)}">
    <label class="fld">Date of birth</label><input id="eDob" type="date" value="\${esc(S.subject.dateOfBirth||'')}">
    <label class="fld">Gender</label><input id="eGender" value="\${esc(ex.gender||'')}">
    <button id="eSave" class="btn block" style="margin-top:16px">Save changes</button></div>\`);
  $('eSave').onclick=async()=>{ if(!await ensureStepUp()) return;
    try{ await api('PATCH','/api/subjects/'+S.subject.id,{fullName:$('eName').value,dateOfBirth:$('eDob').value||undefined,extras:{gender:$('eGender').value}}); closeModal(); await loadSubject(); refreshChrome(); renderProfile(); toast('Profile updated'); }catch(e){toast(e.message,true);} };
}
function editContact(){
  const ex=S.subject.extras||{};
  openModal(\`<div class="m-h"><h3>Edit contact information</h3></div><div class="m-b">
    <label class="fld">Phone</label><input id="ePhone" value="\${esc(ex.phone||'')}">
    <label class="fld">Address</label><textarea id="eAddr" rows="2">\${esc(ex.address||'')}</textarea>
    <button id="eSave" class="btn block" style="margin-top:16px">Save changes</button></div>\`);
  $('eSave').onclick=async()=>{ if(!await ensureStepUp()) return;
    try{ await api('PATCH','/api/subjects/'+S.subject.id,{extras:{phone:$('ePhone').value,address:$('eAddr').value}}); closeModal(); await loadSubject(); renderProfile(); toast('Contact updated'); }catch(e){toast(e.message,true);} };
}

/* ================= MEDICAL ================= */
function renderMedical(){
  if(!S.subject) return renderOnboarding();
  const groups=[['allergy','Allergies','🌾'],['condition','Conditions','❤️'],['medication','Medications','💊'],['surgery','History','🏥'],['document','Documents & X-rays','📄']];
  $('main').innerHTML=\`<h1 class="page-h">Medical</h1><p class="page-sub">Kept private and encrypted. You choose what a responder can see.</p>
   \${groups.map(g=>medGroup(g[0],g[1],g[2])).join('')}\`;
}
function medGroup(type,title,icon){
  const items = type==='surgery'? S.items.filter(i=>['surgery','injury','implant'].includes(i.type)) : byType(type);
  const add = type==='document'? \`<button class="btn soft sm" onclick="addDocument()">+ Upload</button>\` : \`<button class="btn soft sm" onclick="addMedical('\${type}')">+ Add</button>\`;
  let body;
  if(!items.length){ body=emptyBlock(icon,'Nothing added','Add '+title.toLowerCase()+' to keep them handy.'); }
  else if(type==='document'){ body='<div class="pad"><div class="docgrid">'+items.map(docCard).join('')+'</div></div>'; }
  else { body=items.map(i=>\`<div class="rowitem"><div class="grow"><h4>\${esc(i.data.name||i.data.title||TYPE_LABEL[i.type])} \${i.isCritical?'<span class="chip crit">critical</span>':''}</h4><p>\${esc(itemSummary(i))} · \${esc(i.type!==type?TYPE_LABEL[i.type]:i.provenance.replace('_','-'))}</p></div><button class="btn ghost sm" onclick="delItem('\${i.id}')" aria-label="Delete">Delete</button></div>\`).join(''); }
  return \`<div class="card" style="margin-top:16px"><div class="pad between"><h3>\${icon} \${title}</h3>\${add}</div>\${body}</div>\`;
}
function docCard(i){ const d=i.data||{}; return \`<div class="doc" onclick="viewDoc('\${i.id}')">\${d.image?'<img src="'+esc(d.image)+'" alt="">':'<div style="height:96px;display:grid;place-items:center;font-size:26px;background:var(--soft)">📄</div>'}<div class="cap"><b>\${esc(d.title||'Document')}</b><br><span class="faint">\${esc(d.kind||'file')}</span></div></div>\`; }
function addMedical(type){
  const fields = {
    allergy:[['name','Substance',1],['reaction','Reaction','']],
    condition:[['name','Condition',1]],
    medication:[['name','Medication',1],['dose','Dosage',''],['frequency','Frequency','']],
    surgery:[['name','Description',1]],
  }[type]||[['name','Name',1]];
  const typeSel = type==='surgery'? \`<label class="fld">Type</label><select id="mSub"><option value="surgery">Surgery</option><option value="injury">Injury</option><option value="implant">Implant / device</option></select>\`:'';
  openModal(\`<div class="m-h"><h3>Add \${esc(TYPE_LABEL[type]||type)}</h3></div><div class="m-b">
    \${typeSel}\${fields.map(f=>\`<label class="fld">\${f[1]}\${f[2]?'':' (optional)'}</label><input data-k="\${f[0]}">\`).join('')}
    \${type==='allergy'||type==='condition'?'<label class="fld"><input type="checkbox" id="mCrit" style="width:auto;margin-right:6px">Mark as critical (life-threatening)</label>':''}
    <button id="mSave" class="btn block" style="margin-top:14px">Add</button></div>\`);
  $('mSave').onclick=async()=>{
    const data={}; document.querySelectorAll('#scrim [data-k]').forEach(i=>{ if(i.value.trim()) data[i.dataset.k]=i.value.trim(); });
    if(!data.name) return toast('Please fill the main field',true);
    const realType = type==='surgery'? $('mSub').value : type;
    const crit = $('mCrit')&&$('mCrit').checked;
    try{ await api('POST','/api/subjects/'+S.subject.id+'/items',{type:realType,data,isCritical:crit,severity:crit?'life_threatening':undefined}); closeModal(); S.items=await api('GET','/api/subjects/'+S.subject.id+'/items'); renderMedical(); toast('Added'); }catch(e){toast(e.message,true);} };
}
function addDocument(){
  openModal(\`<div class="m-h"><h3>Upload a document</h3><p>X-rays, reports, prescriptions. Stored encrypted — never shown on a scan.</p></div><div class="m-b">
    <label class="fld">Title</label><input id="dTitle" placeholder="e.g. Chest X-ray, Jan 2026">
    <label class="fld">Kind</label><select id="dKind"><option>X-ray</option><option>Lab report</option><option>Prescription</option><option>Scan</option><option>Other</option></select>
    <label class="fld">Image / file</label><input id="dFile" type="file" accept="image/*">
    <button id="dSave" class="btn block" style="margin-top:14px">Upload</button></div>\`);
  $('dSave').onclick=async()=>{
    const f=$('dFile').files[0]; if(!f) return toast('Choose a file',true); if(f.size>2_000_000) return toast('Max 2 MB for the demo',true);
    const image=await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
    try{ await api('POST','/api/subjects/'+S.subject.id+'/items',{type:'document',data:{title:$('dTitle').value||f.name,kind:$('dKind').value,mime:f.type,image}}); closeModal(); S.items=await api('GET','/api/subjects/'+S.subject.id+'/items'); renderMedical(); toast('Document uploaded'); }catch(e){toast(e.message,true);} };
}
function viewDoc(id){ const i=S.items.find(x=>x.id===id); if(!i) return; const d=i.data||{};
  openModal(\`<div class="m-h"><h3>\${esc(d.title||'Document')}</h3><p>\${esc(d.kind||'')}</p></div><div class="m-b">\${d.image?'<img src="'+esc(d.image)+'" style="width:100%;border-radius:12px">':'<div class="empty">No preview</div>'}<button class="btn danger block" style="margin-top:14px" onclick="delItem('\${id}',true)">Delete document</button></div>\`);
}
async function delItem(id,fromModal){
  if(!await confirmAction('Delete this?','This removes the item from your MediKey.','Delete',true)) return;
  try{ await api('DELETE','/api/items/'+id); if(fromModal) closeModal(); S.items=await api('GET','/api/subjects/'+S.subject.id+'/items'); renderMedical(); toast('Deleted'); }catch(e){toast(e.message,true);} }

/* ================= SHARING ================= */
async function renderSharing(){
  if(!S.subject) return renderOnboarding();
  let qrs=[]; try{ qrs=await api('GET','/api/subjects/'+S.subject.id+'/qr'); }catch{}
  const active=qrs.filter(q=>q.status==='active');
  $('main').innerHTML=\`<h1 class="page-h">Sharing</h1><p class="page-sub">Share your medical identity, and control who can see it.</p>
   <div class="card pad">
     <h3>Share my medical information</h3>
     <p class="muted small" style="margin:6px 0 14px">Generate a QR for your wallet, phone lock screen, or a printed card. A responder scans it to see your emergency info.</p>
     <button class="btn" onclick="generateQR()">Generate QR code</button>
     <button class="btn ghost" style="margin-left:8px" onclick="viewEmergencyCard()">Preview emergency card</button>
     <div id="qrOut"></div>
   </div>
   <div class="sec-h"><h3>Active access</h3></div>
   <div class="card">\${active.length? active.map(qrRow).join('') : emptyBlock('🔗','No active codes','You\\'re not sharing your MediKey with anyone yet.')}</div>
   <div class="sec-h"><h3>What responders can see</h3></div>
   <div class="card"><div class="pad"><p class="muted small" style="margin:0 0 12px">Choose the level for each item. <b>Emergency</b> shows on any scan, <b>Extended</b> only via break-glass, <b>Private</b> never on a scan.</p><div id="discEditor"></div><button id="discSave" class="btn" style="margin-top:14px">Save what's shared</button></div></div>\`;
  renderDisclosure();
}
function qrRow(q){ return \`<div class="rowitem"><div class="ic" style="width:36px;height:36px;border-radius:10px;background:var(--soft);display:grid;place-items:center">🔗</div><div class="grow"><h4>\${esc(q.label)}</h4><p>Active · created \${relTime(q.createdAt)}</p></div><button class="btn ghost sm" onclick="revokeQR('\${q.qrId}')">Revoke</button></div>\`; }
async function generateQR(){
  if(!await ensureSharable()) return;
  try{ const r=await api('POST','/api/subjects/'+S.subject.id+'/qr',{label:'MediKey card'});
    $('qrOut').innerHTML=\`<div style="margin-top:18px;display:flex;gap:18px;flex-wrap:wrap;align-items:center">
      <div class="qrbox">\${r.qrSvg}</div>
      <div style="flex:1;min-width:200px"><h4>Scan to view emergency info</h4><p class="muted small" style="margin:6px 0">Point a phone camera at this code. It opens your emergency card.</p>
      <p class="small" style="word-break:break-all;background:var(--soft);padding:8px 10px;border-radius:8px">\${esc(r.scanUrl)}</p>
      <a class="btn soft sm" href="\${esc(r.scanUrl)}" target="_blank" rel="noopener">Open the page</a></div></div>\`;
    const qrs=await api('GET','/api/subjects/'+S.subject.id+'/qr'); toast('QR generated');
  }catch(e){ toast(e.message,true);} }
async function revokeQR(id){ if(!await confirmAction('Revoke access?','This code will stop working immediately. Anyone with it can no longer see your info.','Revoke access',true)) return;
  if(!await ensureStepUp()) return;
  try{ await api('POST','/api/qr/'+id+'/revoke'); renderSharing(); toast('Access revoked'); }catch(e){toast(e.message,true);} }
/* ensure defaults are published so a scan shows something */
async function ensureSharable(){
  if(!await ensureStepUp()) return false;
  try{ const p=await api('GET','/api/subjects/'+S.subject.id+'/preview?level=l1'); if(p.fields&&p.fields.length) return true; }catch{}
  // publish sensible defaults
  await saveDisclosure(defaultEntries(),true); return true;
}
function defaultEntries(){
  const e=[{fieldRef:'name',tier:'l1_critical'},{fieldRef:'age',tier:'l1_critical'}];
  for(const i of S.items){ let tier='l2_additional';
    if(i.type==='blood_group'||i.type==='emergency_contact'||(i.type==='allergy'&&i.isCritical)) tier='l1_critical';
    else if(i.type==='document') tier='l3_sensitive';
    e.push({fieldRef:'item:'+i.id,tier}); }
  return e;
}
function renderDisclosure(){
  const rows=[{ref:'name',label:'Name',def:'l1_critical'},{ref:'age',label:'Age',def:'l1_critical'}]
    .concat(S.items.map(i=>({ref:'item:'+i.id,label:TYPE_LABEL[i.type]+' — '+(itemSummary(i)||''),def:(i.type==='blood_group'||i.type==='emergency_contact'||(i.type==='allergy'&&i.isCritical))?'l1_critical':(i.type==='document'?'l3_sensitive':'l2_additional'),doc:i.type==='document'})));
  $('discEditor').innerHTML=rows.map(r=>\`<div class="rowitem" style="padding:10px 0"><div class="grow"><h4 style="font-weight:600;font-size:14px">\${esc(r.label)}</h4></div>
    <select data-ref="\${r.ref}" style="width:auto">
      <option value="">Hide</option>
      <option value="l1_critical" \${r.doc?'disabled':''}>Emergency</option>
      <option value="l2_additional">Extended</option>
      <option value="l3_sensitive">Private</option></select></div>\`).join('');
  document.querySelectorAll('#discEditor select').forEach(sel=>{ const r=rows.find(x=>x.ref===sel.dataset.ref); sel.value=r.def; });
  $('discSave').onclick=async()=>{ const entries=[]; document.querySelectorAll('#discEditor select').forEach(s=>{ if(s.value) entries.push({fieldRef:s.dataset.ref,tier:s.value}); }); if(!await ensureStepUp())return; await saveDisclosure(entries); toast('Sharing preferences saved'); };
}
async function saveDisclosure(entries,silent){ try{ await api('PUT','/api/subjects/'+S.subject.id+'/selections',{entries}); if(!silent) renderSharing(); }catch(e){ if(!silent) toast(e.message,true); else throw e; } }

/* ================= ACTIVITY ================= */
async function renderActivity(){
  if(!S.subject) return renderOnboarding();
  let history=[]; try{ history=await api('GET','/api/subjects/'+S.subject.id+'/history'); }catch{}
  history=history.slice().reverse();
  $('main').innerHTML=\`<h1 class="page-h">Activity</h1><p class="page-sub">Everyone who has accessed your MediKey. Scans are anonymous by design.</p>
   <div class="card">\${history.length? history.map(rowActivity).join('') : emptyBlock('🕑','No activity yet','When your MediKey is scanned, it will appear here.')}</div>\`;
}

/* ================= SETTINGS ================= */
function renderSettings(){
  $('main').innerHTML=\`<h1 class="page-h">Settings</h1><p class="page-sub">Account, security, and advanced controls.</p>
   <div class="card"><div class="pad"><h3>Account</h3></div>
     \${field('Email',maskEmail())}\${field('Session',S.stepped?'Stepped-up (verified)':'Signed in')}
     <div class="rowitem"><div class="grow"><h4 style="font-weight:600">Sign out</h4></div><button class="btn ghost sm" onclick="signOut()">Sign out</button></div></div>

   <div class="card" style="margin-top:16px"><div class="pad"><h3>🔑 Passkeys</h3><p class="muted small" style="margin:6px 0 0">Sign in and confirm with your device — no password to remember.</p></div>
     <div class="rowitem"><div class="grow"><h4 style="font-weight:600">Add a passkey</h4><p>Register this device or a security key</p></div><button class="btn soft sm" onclick="addPasskey()">Add</button></div></div>

   <div class="card" style="margin-top:16px"><div class="pad"><h3>Privacy &amp; data</h3></div>
     <div class="rowitem"><div class="grow"><h4 style="font-weight:600">Export my data</h4><p>Download everything stored in your MediKey</p></div><button class="btn soft sm" onclick="exportData()">Export</button></div>
     <div class="rowitem"><div class="grow"><h4 style="font-weight:600">Full access history</h4><p>Every scan and break-glass event</p></div><button class="btn ghost sm" onclick="go('activity')">View</button></div></div>

   <div class="card" style="margin-top:16px;border-color:var(--danger)"><div class="pad"><h3 style="color:var(--danger)">Danger zone</h3></div>
     <div class="rowitem"><div class="grow"><h4 style="font-weight:600">Delete my MediKey</h4><p>Permanently erase your identity and medical data (crypto-shred)</p></div><button class="btn danger sm" onclick="deleteAccount()">Delete</button></div></div>\`;
}
function signOut(){ Object.assign(S,{token:null,stepped:false,subject:null,items:[]}); $('app').classList.add('hidden'); $('auth').classList.remove('hidden'); toast('Signed out'); }
async function addPasskey(){ if(!(window.PublicKeyCredential&&PublicKeyCredential.parseCreationOptionsFromJSON)) return toast('No passkey support',true);
  try{ const o=await api('POST','/api/auth/passkey/register/options',{}); const c=await navigator.credentials.create({publicKey:PublicKeyCredential.parseCreationOptionsFromJSON(o)}); await api('POST','/api/auth/passkey/register/verify',c.toJSON()); toast('Passkey added ✓'); }catch(e){toast(e.message||'cancelled',true);} }
async function exportData(){ if(!await ensureStepUp())return; try{ const d=await api('POST','/api/export'); const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='medikey-export.json'; a.click(); toast('Exported'); }catch(e){toast(e.message,true);} }
async function deleteAccount(){ if(!await confirmAction('Delete your MediKey?','This permanently erases your identity and all medical data. This cannot be undone.','Delete everything',true))return; if(!await ensureStepUp())return; try{ await api('DELETE','/api/account'); toast('Your MediKey was deleted'); signOut(); }catch(e){toast(e.message,true);} }

/* ---------- shared ---------- */
function emptyBlock(icon,title,sub){ return \`<div class="empty"><div class="ic">\${icon}</div><h4 style="font-weight:600;color:var(--ink)">\${esc(title)}</h4><p style="margin:4px 0 0">\${esc(sub)}</p></div>\`; }
</script>
</body>
</html>`;
