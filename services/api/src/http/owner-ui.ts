/**
 * Patient experience — evolved from the owner console into a consent-driven
 * health record. Home · Health Record · Sharing & Consent · Emergency Card ·
 * Activity · Settings. Preserves MediKey brand identity, adds provider consent
 * workflow, verification badges, and clinical/emergency/private tier UI.
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
  --orange:#e67e22; --orange-soft:#fef3e2;
  --shadow:0 1px 2px rgba(16,32,64,.04),0 10px 30px -14px rgba(16,32,64,.16);
}
@media (prefers-color-scheme:dark){:root{
  --ink:#e9eef6; --muted:#9fabbc; --faint:#7b8698; --line:#212b3c; --bg:#0c111b; --card:#121a2b;
  --soft:#152036; --danger-soft:#2a1416; --green-soft:#12281c; --orange-soft:#2a1f10;
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
.btn.green{background:var(--green);color:#fff}
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
.chip.emergency{background:var(--danger-soft);color:var(--danger);border-color:transparent}
.chip.clinical{background:var(--orange-soft);color:var(--orange);border-color:transparent}
.chip.private{background:var(--soft);color:var(--navy);border-color:transparent}
.chip.verified{background:var(--green-soft);color:var(--green);border-color:transparent}
.chip.self{background:#fef9e7;color:#8a6d0b;border-color:transparent}
.chip.pending{background:var(--soft);color:var(--muted);border-color:transparent}
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
nav.side a.disabled{opacity:.35;pointer-events:none}
nav.bottom a.disabled{opacity:.35;pointer-events:none}
nav.side .sep{height:1px;background:var(--line);margin:10px 6px}
aside .foot{margin-top:auto;display:flex;align-items:center;gap:10px;padding:10px 8px;border-top:1px solid var(--line)}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-weight:700;color:var(--navy);overflow:hidden;flex:0 0 auto}
.avatar img{width:100%;height:100%;object-fit:cover}
main{padding:28px 32px;max-width:900px;width:100%}
.page-h{margin:0 0 4px;font-size:24px;letter-spacing:-.01em}
.page-sub{color:var(--muted);margin:0 0 22px}
.grid{display:grid;gap:16px}
.g2{grid-template-columns:1fr 1fr}
.g3{grid-template-columns:1fr 1fr 1fr}

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
  .g2,.g3{grid-template-columns:1fr}
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

/* links / rows */
.linkcard{display:flex;align-items:center;gap:14px;padding:16px 18px;cursor:pointer}
.linkcard .ic{width:42px;height:42px;border-radius:12px;background:var(--soft);display:grid;place-items:center;font-size:20px;flex:0 0 auto}
.linkcard .grow{flex:1;min-width:0}
.linkcard h4{font-size:15.5px} .linkcard p{margin:2px 0 0;color:var(--muted);font-size:13.5px}
.linkcard .arw{color:var(--faint);font-size:20px}
.rowitem{display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid var(--line)}
.rowitem:first-child{border-top:0}
.rowitem .grow{flex:1;min-width:0}
.rowitem h4{font-size:15px} .rowitem p{margin:2px 0 0;color:var(--muted);font-size:13px}
.empty{padding:30px 20px;text-align:center;color:var(--muted)}
.empty .ic{font-size:30px;opacity:.5;margin-bottom:8px}

.sec-h{display:flex;align-items:center;justify-content:space-between;margin:26px 0 12px}
.sec-h h3{font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}

/* disclosure tier markers */
.tier-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px}
.tier-dot.t-emergency{background:var(--danger)}
.tier-dot.t-clinical{background:var(--orange)}
.tier-dot.t-private{background:var(--accent)}

/* med item card */
.med-card{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:8px 0;background:var(--card)}
.med-card h4{font-size:15px;font-weight:650}
.med-card .badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}

/* modal */
.scrim{position:fixed;inset:0;background:rgba(10,18,34,.5);display:grid;place-items:center;z-index:50;padding:18px}
.modal{background:var(--card);border-radius:18px;box-shadow:var(--shadow);width:100%;max-width:480px;max-height:90vh;overflow:auto}
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

/* consent request card */
.consent-req{border:2px solid var(--orange);border-radius:var(--radius);padding:20px;background:var(--card);margin:10px 0}
.consent-req .provider-info{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.consent-req .provider-info .org-icon{width:42px;height:42px;border-radius:12px;background:var(--orange-soft);display:grid;place-items:center;font-size:20px}
.consent-active{border:2px solid var(--green);border-radius:var(--radius);padding:20px;background:var(--card);margin:10px 0}
</style>
</head>
<body>

<!-- AUTH GATE -->
<div id="auth" style="min-height:100vh;display:grid;place-items:center;padding:20px">
  <div class="card pad" style="width:100%;max-width:380px">
    <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px"><span class="logo">M</span><b style="font-size:19px">MediKey</b></div>
    <p class="muted" style="margin:0 0 14px">Your secure medical identity.</p>
    <label class="fld">Email</label><input id="email" placeholder="you@example.com" value="sanjith@example.com">
    <label class="fld">Passphrase <span class="faint">— any length</span></label><input id="secret" type="password" value="1234">
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
      <a data-go="home"><span class="i">🏠</span> Overview</a>
      <a data-go="record"><span class="i">📋</span> Health Record</a>
      <a data-go="consent"><span class="i">🤝</span> Sharing & Consent</a>
      <a data-go="emergency"><span class="i">🚨</span> Emergency Card</a>
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
      <a data-go="home"><span class="i">🏠</span>Overview</a>
      <a data-go="record"><span class="i">📋</span>Record</a>
      <a data-go="consent"><span class="i">🤝</span>Consent</a>
      <a data-go="emergency"><span class="i">🚨</span>Emergency</a>
    </nav>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const S = { token:null, stepped:false, email:null, secret:null, accountId:null, subject:null, items:[], grants:[], view:'home' };
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m,err){ const t=$('toast'); t.textContent=m; t.className='toast show'+(err?' err':''); clearTimeout(t._x); t._x=setTimeout(()=>t.className='toast',2800); }

async function api(method, path, body){
  const h={}; if(body!==undefined) h['content-type']='application/json'; if(S.token) h.authorization='Bearer '+S.token;
  const r=await fetch(path,{method,headers:h,body:body!==undefined?JSON.stringify(body):undefined});
  const txt=await r.text(); let d={}; try{ d=txt?JSON.parse(txt):{}; }catch{ d={_text:txt}; }
  if(r.status===401 && S.token){ signOut(); throw new Error('Session expired — please sign in again'); }
  if(!r.ok){ const e=new Error(d.message||d.error||('HTTP '+r.status)); e.status=r.status; throw e; }
  return d;
}

/* ---------- auth ---------- */
$('btnLogin').onclick = async()=>{ try{ const em=$('email').value, sec=$('secret').value; let r; try{ r=await api('POST','/api/auth/login',{email:em,secret:sec}); }catch(le){ if(le.status===401){ await api('POST','/api/auth/register',{email:em,secret:sec}); r=await api('POST','/api/auth/login',{email:em,secret:sec}); } else throw le; } S.secret=sec; await onSignedIn(r); }catch(e){ toast(e.message,true);} };
$('btnRegister').onclick = async()=>{ try{ const sec=$('secret').value; await api('POST','/api/auth/register',{email:$('email').value,secret:sec}); const r=await api('POST','/api/auth/login',{email:$('email').value,secret:sec}); S.secret=sec; await onSignedIn(r); toast('Welcome to MediKey'); }catch(e){ toast(e.message,true);} };
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
  await loadSubject();
  if(!S.subject) await seedDemoProfile();
  go('home');
}
async function seedDemoProfile(){
  try{
    const sec=S.secret||$('secret').value;
    if(!S.stepped&&sec){ try{ const u=await api('POST','/api/auth/stepup',{secret:sec}); S.token=u.token; S.stepped=true; }catch{} }
    const s=await api('POST','/api/subjects',{fullName:'Sanjith M',dateOfBirth:'2002-06-15',extras:{gender:'Male'}});
    const sid=s.subjectId;
    await api('POST','/api/subjects/'+sid+'/items',{type:'blood_group',data:{group:'O+'},provenance:'user_confirmed'});
    await api('POST','/api/subjects/'+sid+'/items',{type:'allergy',data:{name:'Penicillin',reaction:'Anaphylaxis'},isCritical:true});
    await api('POST','/api/subjects/'+sid+'/items',{type:'medication',data:{name:'Metformin',dose:'500mg',frequency:'Twice daily'}});
    await api('POST','/api/subjects/'+sid+'/items',{type:'condition',data:{name:'Type-2 Diabetes'}});
    await api('POST','/api/subjects/'+sid+'/items',{type:'emergency_contact',data:{name:'Priya M',relationship:'Sister',phone:'+91 98765 43210'},isCritical:true});
    await loadSubject();
  }catch(e){ console.warn('seed failed',e); }
}
async function loadSubject(){
  const subs=await api('GET','/api/subjects');
  S.subject = subs[0] || null;
  if(S.subject){ S.items = await api('GET','/api/subjects/'+S.subject.id+'/items'); try{ S.grants=await api('GET','/api/subjects/'+S.subject.id+'/consent-grants'); }catch{ S.grants=[]; } }
  else { S.items=[]; S.grants=[]; }
  refreshChrome();
}
function refreshChrome(){
  const name=S.subject? S.subject.fullName : '—';
  $('sideName').textContent=name;
  const photo=S.subject&&S.subject.extras&&S.subject.extras.photo;
  const initials=(name||'M').trim()[0]||'M';
  for(const el of [$('sideAv'),$('topAv')]) el.innerHTML = photo? '<img src="'+esc(photo)+'">' : esc(initials.toUpperCase());
  document.querySelectorAll('[data-go]').forEach(a=>{
    if(a.dataset.go==='home'||a.dataset.go==='settings') return;
    a.classList.toggle('disabled',!S.subject);
  });
}

/* ---------- step-up ---------- */
async function ensureStepUp(){
  if(S.stepped) return true;
  if(S.secret){ try{ const r=await api('POST','/api/auth/stepup',{secret:S.secret}); S.token=r.token; S.stepped=true; return true; }catch{} }
  return new Promise((resolve)=>{
    openModal(\`<div class="m-h"><h3>Confirm it's you</h3><p>Sensitive changes need a quick confirmation.</p></div>
      <div class="m-b">
        <label class="fld">Passphrase</label><input id="suSecret" type="password" autocomplete="current-password" value="\${esc(S.secret||'')}">
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
  const R={home:renderHome,record:renderRecord,consent:renderConsent,emergency:renderEmergency,activity:renderActivity,settings:renderSettings,profile:renderProfile};
  (R[view]||renderHome)();
  if(window.matchMedia('(max-width:820px)').matches) window.scrollTo(0,0);
}
document.querySelectorAll('[data-go]').forEach(a=>a.onclick=()=>go(a.dataset.go));

/* ---------- helpers ---------- */
const TYPE_LABEL={blood_group:'Blood group',allergy:'Allergy',condition:'Condition',medication:'Medication',medication_avoidance:'Do NOT administer',implant:'Implant / device',surgery:'Surgery',injury:'Injury',emergency_contact:'Emergency contact',document:'Document',prescription:'Prescription',vaccination:'Vaccination',procedure:'Procedure',medical_history:'Medical history'};
const byType=t=>S.items.filter(i=>i.type===t);
function itemSummary(i){ const d=i.data||{}; if(i.type==='medication') return d.name+(d.dose?(' · '+d.dose):'')+(d.frequency?(' · '+d.frequency):''); if(i.type==='allergy') return d.name+(d.reaction?(' — '+d.reaction):''); if(i.type==='emergency_contact') return d.name+(d.relationship?(' ('+d.relationship+')'):'')+(d.phone?(' · '+d.phone):''); if(i.type==='blood_group') return d.group||d.name||''; if(i.type==='prescription') return d.drug||d.name||''; if(i.type==='vaccination') return d.vaccine||d.name||''; return d.name||d.title||''; }
function bloodGroup(){ const b=byType('blood_group')[0]; return b? (b.data.group||b.data.name):null; }
function criticalAllergies(){ return byType('allergy').filter(a=>a.isCritical).map(a=>a.data.name).filter(Boolean); }
function emergencyContact(){ const c=byType('emergency_contact')[0]; return c? {name:c.data.name,phone:c.data.phone,rel:c.data.relationship}:null; }
function relTime(iso){ const s=(Date.now()-Date.parse(iso))/1000; if(s<60)return'just now'; if(s<3600)return Math.floor(s/60)+' min ago'; if(s<86400)return Math.floor(s/3600)+' h ago'; if(s<172800)return 'yesterday'; return Math.floor(s/86400)+' days ago'; }
function fmtDate(iso){ const d=new Date(iso); return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function firstName(){ return (S.subject.fullName||'there').split(' ')[0]; }
function greeting(){ const h=new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening'; }
function verBadge(i){ const s=i.verificationStatus||'self_reported'; if(s==='provider_verified') return '<span class="chip verified">✓ Verified'+(i.providerNameSnapshot?(' · '+esc(i.providerNameSnapshot)):'')+'</span>'; if(s==='pending') return '<span class="chip pending">⏳ Pending</span>'; if(s==='needs_review') return '<span class="chip" style="background:var(--danger-soft);color:var(--danger)">⚠ Needs review</span>'; return '<span class="chip self">● Self-reported</span>'; }
function emptyBlock(icon,title,sub){ return \`<div class="empty"><div class="ic">\${icon}</div><h4 style="font-weight:600;color:var(--ink)">\${esc(title)}</h4><p style="margin:4px 0 0">\${esc(sub)}</p></div>\`; }

/* ================= OVERVIEW ================= */
async function renderHome(){
  if(!S.subject) return renderOnboarding();
  const s=S.subject, ex=s.extras||{};
  const allerg=criticalAllergies(), bg=bloodGroup(), ec=emergencyContact();
  const pendingGrants=S.grants.filter(g=>g.status==='pending');
  const activeGrants=S.grants.filter(g=>g.status==='granted'&&g.expiresAt&&Date.parse(g.expiresAt)>Date.now());
  let history=[]; try{ history=await api('GET','/api/subjects/'+s.id+'/history'); }catch{}
  const recent=history.slice(-3).reverse();
  const verified=S.items.filter(i=>(i.verificationStatus||'self_reported')==='provider_verified').length;
  const total=S.items.length;

  $('main').innerHTML=\`
   <h1 class="page-h">\${greeting()}, \${esc(firstName())}</h1>
   <p class="page-sub">Your MediKey at a glance.</p>

   <div class="idcard">
     <div class="top">
       <div class="av">\${ex.photo?'<img src="'+esc(ex.photo)+'">':esc((firstName()[0]||'M').toUpperCase())}</div>
       <div><div style="font-size:19px;font-weight:750">\${esc(s.fullName)}</div>
       <div style="opacity:.75;font-size:13px">\${s.ageYears!=null?('Age '+s.ageYears):'MediKey holder'}\${ex.gender?(' · '+esc(ex.gender)):''}</div></div>
     </div>
     <div class="facts">
       <div><div class="k">Blood group</div><div class="v">\${bg?esc(bg):'Not added'}</div></div>
       <div><div class="k">Critical allergies</div><div class="v">\${allerg.length?esc(allerg.join(', ')):'None added'}</div></div>
       <div><div class="k">Emergency contact</div><div class="v">\${ec?esc(ec.name):'Not added'}</div></div>
       <div><div class="k">Records</div><div class="v">\${total} total\${verified?' · '+verified+' verified':''}</div></div>
     </div>
     <div class="acts">
       <button class="btn solid" onclick="go('emergency')">Emergency card</button>
       <button class="btn" onclick="go('consent')">Sharing</button>
     </div>
   </div>

   \${pendingGrants.length?\`
   <div class="sec-h"><h3>Consent requests</h3></div>
   \${pendingGrants.map(g=>consentRequestCard(g)).join('')}
   \`:''}

   <div class="sec-h"><h3>Disclosure</h3></div>
   <div class="grid g3">
     <div class="card pad" style="border-top:3px solid var(--danger)"><div style="font-size:12px;font-weight:700;color:var(--danger)">EMERGENCY</div><div style="font-size:14px;margin-top:4px">Immediate access on scan</div></div>
     <div class="card pad" style="border-top:3px solid var(--orange)"><div style="font-size:12px;font-weight:700;color:var(--orange)">CLINICAL</div><div style="font-size:14px;margin-top:4px">Requires patient consent</div></div>
     <div class="card pad" style="border-top:3px solid var(--accent)"><div style="font-size:12px;font-weight:700;color:var(--accent)">PRIVATE</div><div style="font-size:14px;margin-top:4px">Never shared</div></div>
   </div>

   \${activeGrants.length?\`
   <div class="sec-h"><h3>Active access</h3></div>
   <div class="card">\${activeGrants.map(activeGrantRow).join('')}</div>
   \`:''}

   <div class="sec-h"><h3>Your information</h3></div>
   <div class="card">
     <div class="linkcard" onclick="go('record')"><div class="ic">📋</div><div class="grow"><h4>Health record</h4><p>\${total} items\${verified?' · '+verified+' provider-verified':''}</p></div><div class="arw">›</div></div>
     <div class="linkcard" style="border-top:1px solid var(--line)" onclick="go('consent')"><div class="ic">🤝</div><div class="grow"><h4>Sharing & consent</h4><p>\${activeGrants.length?activeGrants.length+' active':'No active access'}\${pendingGrants.length?' · '+pendingGrants.length+' pending':''}</p></div><div class="arw">›</div></div>
   </div>

   <div class="sec-h"><h3>Recent activity</h3><a class="chip" style="cursor:pointer" onclick="go('activity')">View all</a></div>
   <div class="card">\${recent.length? recent.map(rowActivity).join('') : emptyBlock('🕑','No activity yet','Your MediKey hasn\\'t been accessed yet.')}</div>\`;
}

function consentRequestCard(g){
  return \`<div class="consent-req">
    <div class="provider-info"><div class="org-icon">🏥</div><div><h4>\${esc(g.providerOrg||g.providerName)}</h4><p class="muted small">\${esc(g.providerName)}</p></div></div>
    <p class="small muted" style="margin:0 0 8px">Requested access to:</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">\${g.requestedCategories.map(c=>'<span class="chip clinical">'+esc(TYPE_LABEL[c]||c)+'</span>').join('')}</div>
    <p class="small"><b>Purpose:</b> \${esc(g.purpose)}</p>
    <p class="small muted">Duration: \${Math.round(g.durationSeconds/60)} minutes</p>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button class="btn ghost" onclick="declineGrant('\${g.id}')">Decline</button>
      <button class="btn green" onclick="approveGrant('\${g.id}')">Grant access</button>
    </div>
  </div>\`;
}

function activeGrantRow(g){
  const mins=Math.max(0,Math.round((Date.parse(g.expiresAt)-Date.now())/60000));
  return \`<div class="rowitem">
    <div style="width:36px;height:36px;border-radius:10px;background:var(--green-soft);display:grid;place-items:center;color:var(--green);font-size:16px">🏥</div>
    <div class="grow"><h4>\${esc(g.providerOrg||g.providerName)}</h4><p>\${esc(g.approvedCategories?.map(c=>TYPE_LABEL[c]||c).join(', ')||'Clinical information')} · \${mins} min remaining</p></div>
    <button class="btn danger sm" onclick="revokeGrant('\${g.id}')">Revoke</button>
  </div>\`;
}

async function approveGrant(id){
  try{ await api('POST','/api/consent/'+id+'/grant'); toast('Access granted'); S.grants=await api('GET','/api/subjects/'+S.subject.id+'/consent-grants'); go(S.view); }catch(e){toast(e.message,true);}
}
async function declineGrant(id){
  try{ await api('POST','/api/consent/'+id+'/decline'); toast('Request declined'); S.grants=await api('GET','/api/subjects/'+S.subject.id+'/consent-grants'); go(S.view); }catch(e){toast(e.message,true);}
}
async function revokeGrant(id){
  if(!await confirmAction('Revoke access?','They will immediately lose access to the information you shared.','Revoke access',true)) return;
  try{ await api('POST','/api/consent/'+id+'/revoke'); toast('Access revoked'); S.grants=await api('GET','/api/subjects/'+S.subject.id+'/consent-grants'); go(S.view); }catch(e){toast(e.message,true);}
}

function renderOnboarding(){
  const hint = S.view!=='home' ? '<div style="background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:14px;color:var(--muted)">Create your profile first to access <b style="color:var(--ink)">'+esc(S.view.charAt(0).toUpperCase()+S.view.slice(1))+'</b> and all other pages.</div>' : '';
  $('main').innerHTML=\`<h1 class="page-h">Welcome to MediKey</h1><p class="page-sub">Let's set up your medical identity.</p>
    \${hint}
    <div class="card pad" style="max-width:460px">
      <label class="fld">Full name</label><input id="obName" placeholder="e.g. Sanjith M">
      <label class="fld">Date of birth</label><input id="obDob" type="date">
      <label class="fld">Gender (optional)</label><input id="obGender" placeholder="e.g. Male">
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

function rowActivity(h){ return \`<div class="rowitem"><div class="ic" style="width:36px;height:36px;border-radius:10px;background:var(--soft);display:grid;place-items:center">\${h.accessType==='break_glass'?'🩹':h.accessType==='provider_consent'?'🏥':'📷'}</div><div class="grow"><h4>\${activityTitle(h)}</h4><p>\${relTime(h.createdAt)}\${h.providerName?(' · '+esc(h.providerName)):''}\${h.city?(' · '+esc(h.city)):''}</p></div></div>\`; }
function activityTitle(h){ if(h.accessType==='provider_consent'&&h.status==='shown') return 'Provider accessed clinical records'; if(h.accessType==='provider_consent'&&h.status==='revoked') return 'Provider access revoked'; if(h.accessType==='break_glass') return 'Break-glass access'; if(h.status==='shown') return 'Emergency info viewed (scan)'; if(h.status==='revoked'||h.status==='not_found') return 'Revoked code scanned'; if(h.status==='rate_limited') return 'Scan rate-limited'; return 'MediKey accessed'; }

/* ================= HEALTH RECORD ================= */
function renderRecord(){
  if(!S.subject) return renderOnboarding();
  const groups=[
    ['allergy','Allergies','🌾'],
    ['medication','Medications','💊'],
    ['condition','Conditions','❤️'],
    ['prescription','Prescriptions','📝'],
    ['vaccination','Vaccinations','💉'],
    ['surgery','Procedures & Surgery','🏥'],
    ['medical_history','Medical History','📋'],
    ['document','Reports & Documents','📄'],
  ];
  $('main').innerHTML=\`<h1 class="page-h">Health Record</h1><p class="page-sub">Your complete medical information. Each record shows its source and verification status.</p>
   \${groups.map(g=>recGroup(g[0],g[1],g[2])).join('')}\`;
}

function recGroup(type,title,icon){
  const items = type==='surgery'? S.items.filter(i=>['surgery','injury','implant','procedure'].includes(i.type)) : byType(type);
  const add = type==='document'? '<button class="btn soft sm" onclick="addDocument()">+ Upload</button>' : '<button class="btn soft sm" onclick="addMedical(\\''+type+'\\')">+ Add</button>';
  let body;
  if(!items.length){ body=emptyBlock(icon,'Nothing added','Add '+title.toLowerCase()+' to keep them handy.'); }
  else if(type==='document'){ body='<div class="pad"><div class="docgrid">'+items.map(docCard).join('')+'</div></div>'; }
  else { body=items.map(i=>medItemRow(i)).join(''); }
  return \`<div class="card" style="margin-top:16px"><div class="pad between"><h3>\${icon} \${title}</h3>\${add}</div>\${body}</div>\`;
}

function medItemRow(i){
  const summary=itemSummary(i);
  return \`<div class="rowitem">
    <div class="grow">
      <h4>\${esc(i.data.name||i.data.title||i.data.group||TYPE_LABEL[i.type])} \${i.isCritical?'<span class="chip crit">critical</span>':''}</h4>
      <p>\${esc(summary)}</p>
      <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">\${verBadge(i)}\${i.createdAt?'<span class="faint small">'+fmtDate(i.createdAt)+'</span>':''}</div>
    </div>
    <button class="btn ghost sm" onclick="delItem('\${i.id}')" aria-label="Delete">Delete</button>
  </div>\`;
}

function docCard(i){ const d=i.data||{}; return \`<div class="doc" onclick="viewDoc('\${i.id}')">\${d.image?'<img src="'+esc(d.image)+'" alt="">':'<div style="height:96px;display:grid;place-items:center;font-size:26px;background:var(--soft)">📄</div>'}<div class="cap"><b>\${esc(d.title||'Document')}</b><br><span class="faint">\${esc(d.kind||'file')}</span>\${verBadge(i)}</div></div>\`; }

function addMedical(type){
  const fields = {
    allergy:[['name','Substance',1],['reaction','Reaction','']],
    condition:[['name','Condition',1]],
    medication:[['name','Medication',1],['dose','Dosage',''],['frequency','Frequency','']],
    surgery:[['name','Description',1]],
    prescription:[['drug','Drug name',1],['dose','Dosage',''],['frequency','Frequency','']],
    vaccination:[['vaccine','Vaccine name',1],['date','Date given','']],
    medical_history:[['name','Description',1],['date','Date','']],
  }[type]||[['name','Name',1]];
  const typeSel = type==='surgery'? '<label class="fld">Type</label><select id="mSub"><option value="surgery">Surgery</option><option value="injury">Injury</option><option value="implant">Implant / device</option><option value="procedure">Procedure</option></select>':'';
  openModal(\`<div class="m-h"><h3>Add \${esc(TYPE_LABEL[type]||type)}</h3></div><div class="m-b">
    \${typeSel}\${fields.map(f=>'<label class="fld">'+f[1]+(f[2]?'':' (optional)')+'</label><input data-k="'+f[0]+'">').join('')}
    \${type==='allergy'||type==='condition'?'<label class="fld"><input type="checkbox" id="mCrit" style="width:auto;margin-right:6px">Mark as critical</label>':''}
    <button id="mSave" class="btn block" style="margin-top:14px">Add</button></div>\`);
  $('mSave').onclick=async()=>{
    const data={}; document.querySelectorAll('#scrim [data-k]').forEach(i=>{ if(i.value.trim()) data[i.dataset.k]=i.value.trim(); });
    if(!data.name&&!data.drug&&!data.vaccine) return toast('Please fill the main field',true);
    if(!data.name) data.name=data.drug||data.vaccine||'';
    const realType = type==='surgery'? $('mSub').value : type;
    const crit = $('mCrit')&&$('mCrit').checked;
    try{ await api('POST','/api/subjects/'+S.subject.id+'/items',{type:realType,data,isCritical:crit,severity:crit?'life_threatening':undefined}); closeModal(); S.items=await api('GET','/api/subjects/'+S.subject.id+'/items'); renderRecord(); toast('Added'); }catch(e){toast(e.message,true);} };
}

function addDocument(){
  openModal(\`<div class="m-h"><h3>Upload a document</h3><p>X-rays, reports, prescriptions. Stored encrypted.</p></div><div class="m-b">
    <label class="fld">Title</label><input id="dTitle" placeholder="e.g. Chest X-ray, Jan 2026">
    <label class="fld">Kind</label><select id="dKind"><option>X-ray</option><option>Lab report</option><option>Prescription</option><option>Scan</option><option>Other</option></select>
    <label class="fld">Image / file</label><input id="dFile" type="file" accept="image/*">
    <button id="dSave" class="btn block" style="margin-top:14px">Upload</button></div>\`);
  $('dSave').onclick=async()=>{
    const f=$('dFile').files[0]; if(!f) return toast('Choose a file',true); if(f.size>2_000_000) return toast('Max 2 MB',true);
    const image=await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
    try{ await api('POST','/api/subjects/'+S.subject.id+'/items',{type:'document',data:{title:$('dTitle').value||f.name,kind:$('dKind').value,mime:f.type,image}}); closeModal(); S.items=await api('GET','/api/subjects/'+S.subject.id+'/items'); renderRecord(); toast('Document uploaded'); }catch(e){toast(e.message,true);} };
}
function viewDoc(id){ const i=S.items.find(x=>x.id===id); if(!i) return; const d=i.data||{};
  openModal(\`<div class="m-h"><h3>\${esc(d.title||'Document')}</h3><p>\${esc(d.kind||'')}</p></div><div class="m-b">\${d.image?'<img src="'+esc(d.image)+'" style="width:100%;border-radius:12px">':'<div class="empty">No preview</div>'}<div style="margin-top:8px">\${verBadge(i)}</div><button class="btn danger block" style="margin-top:14px" onclick="delItem('\${id}',true)">Delete document</button></div>\`);
}
async function delItem(id,fromModal){
  if(!await confirmAction('Delete this?','This removes the item from your MediKey.','Delete',true)) return;
  try{ await api('DELETE','/api/items/'+id); if(fromModal) closeModal(); S.items=await api('GET','/api/subjects/'+S.subject.id+'/items'); if(S.view==='record') renderRecord(); else go(S.view); toast('Deleted'); }catch(e){toast(e.message,true);} }

/* ================= SHARING & CONSENT ================= */
async function renderConsent(){
  if(!S.subject) return renderOnboarding();
  S.grants=await api('GET','/api/subjects/'+S.subject.id+'/consent-grants').catch(()=>[]);
  const pending=S.grants.filter(g=>g.status==='pending');
  const active=S.grants.filter(g=>g.status==='granted'&&g.expiresAt&&Date.parse(g.expiresAt)>Date.now());
  const past=S.grants.filter(g=>g.status==='revoked'||g.status==='declined'||g.status==='expired'||(g.status==='granted'&&g.expiresAt&&Date.parse(g.expiresAt)<=Date.now()));
  let qrs=[]; try{ qrs=await api('GET','/api/subjects/'+S.subject.id+'/qr'); }catch{}
  const activeQrs=qrs.filter(q=>q.status==='active');

  $('main').innerHTML=\`<h1 class="page-h">Sharing & Consent</h1><p class="page-sub">Control who can see your medical information.</p>

   \${pending.length?\`
   <div class="sec-h"><h3>Pending requests</h3></div>
   \${pending.map(g=>consentRequestCard(g)).join('')}
   \`:''}

   \${active.length?\`
   <div class="sec-h"><h3>Active access</h3></div>
   <div class="card">\${active.map(activeGrantRow).join('')}</div>
   \`:''}

   <div class="sec-h"><h3>Disclosure tiers</h3></div>
   <div class="grid g3">
     <div class="card pad" style="border-top:3px solid var(--danger)"><div style="font-size:12px;font-weight:700;color:var(--danger)">🔴 EMERGENCY</div><div style="font-size:14px;margin-top:4px;color:var(--muted)">Visible immediately when scanned</div></div>
     <div class="card pad" style="border-top:3px solid var(--orange)"><div style="font-size:12px;font-weight:700;color:var(--orange)">🟠 CLINICAL</div><div style="font-size:14px;margin-top:4px;color:var(--muted)">Requires explicit patient consent</div></div>
     <div class="card pad" style="border-top:3px solid var(--accent)"><div style="font-size:12px;font-weight:700;color:var(--accent)">🔵 PRIVATE</div><div style="font-size:14px;margin-top:4px;color:var(--muted)">Never shared with anyone</div></div>
   </div>

   <div class="sec-h"><h3>QR code</h3></div>
   <div class="card pad">
     <p class="muted small" style="margin:0 0 14px">Generate a QR for your wallet, phone, or a printed card. Responders scan it to see emergency info; providers scan it to request clinical access.</p>
     <button class="btn" onclick="generateQR()">Generate QR code</button>
     <div id="qrOut"></div>
   </div>

   \${activeQrs.length?\`
   <div class="sec-h"><h3>Active QR codes</h3></div>
   <div class="card">\${activeQrs.map(qrRow).join('')}</div>
   \`:''}

   <div class="sec-h"><h3>What responders see (disclosure)</h3></div>
   <div class="card"><div class="pad"><p class="muted small" style="margin:0 0 12px">Choose the tier for each item.</p><div id="discEditor"></div><button id="discSave" class="btn" style="margin-top:14px">Save disclosure</button></div></div>

   \${past.length?\`
   <div class="sec-h"><h3>Past access</h3></div>
   <div class="card">\${past.slice(0,10).map(pastGrantRow).join('')}</div>
   \`:''}
  \`;
  renderDisclosure();
}

function pastGrantRow(g){
  const icon=g.status==='revoked'?'🔒':g.status==='declined'?'✕':'⏱';
  const label=g.status==='revoked'?'Revoked':g.status==='declined'?'Declined':'Expired';
  return \`<div class="rowitem"><div style="width:36px;height:36px;border-radius:10px;background:var(--soft);display:grid;place-items:center">\${icon}</div><div class="grow"><h4>\${esc(g.providerOrg||g.providerName)}</h4><p>\${label} · \${esc(g.purpose)} · \${relTime(g.createdAt)}</p></div></div>\`;
}

function qrRow(q){ return \`<div class="rowitem"><div style="width:36px;height:36px;border-radius:10px;background:var(--soft);display:grid;place-items:center">🔗</div><div class="grow"><h4>\${esc(q.label)}</h4><p>Active · created \${relTime(q.createdAt)}</p></div><button class="btn ghost sm" onclick="revokeQR('\${q.qrId}')">Revoke</button></div>\`; }

async function generateQR(){
  if(!await ensureSharable()) return;
  try{ const r=await api('POST','/api/subjects/'+S.subject.id+'/qr',{label:'MediKey card'});
    $('qrOut').innerHTML=\`<div style="margin-top:18px;display:flex;gap:18px;flex-wrap:wrap;align-items:center">
      <div class="qrbox">\${r.qrSvg}</div>
      <div style="flex:1;min-width:200px"><h4>Scan to view emergency info</h4><p class="muted small" style="margin:6px 0">A responder sees emergency data immediately. A provider can use this to request clinical access.</p>
      <p class="small" style="word-break:break-all;background:var(--soft);padding:8px 10px;border-radius:8px">\${esc(r.scanUrl)}</p></div></div>\`;
    toast('QR generated');
  }catch(e){ toast(e.message,true);} }

async function revokeQR(id){ if(!await confirmAction('Revoke this QR?','Anyone with this code can no longer access your info.','Revoke',true)) return;
  if(!await ensureStepUp()) return;
  try{ await api('POST','/api/qr/'+id+'/revoke'); renderConsent(); toast('QR revoked'); }catch(e){toast(e.message,true);} }

async function ensureSharable(){
  if(!await ensureStepUp()) return false;
  try{ const p=await api('GET','/api/subjects/'+S.subject.id+'/preview?level=l1'); if(p.fields&&p.fields.length) return true; }catch{}
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
  const el=$('discEditor'); if(!el) return;
  el.innerHTML=rows.map(r=>\`<div class="rowitem" style="padding:10px 0"><div class="grow"><h4 style="font-weight:600;font-size:14px">\${esc(r.label)}</h4></div>
    <select data-ref="\${r.ref}" style="width:auto">
      <option value="">Hide</option>
      <option value="l1_critical" \${r.doc?'disabled':''}>🔴 Emergency</option>
      <option value="l2_additional">🟠 Clinical</option>
      <option value="l3_sensitive">🔵 Private</option></select></div>\`).join('');
  document.querySelectorAll('#discEditor select').forEach(sel=>{ const r=rows.find(x=>x.ref===sel.dataset.ref); sel.value=r.def; });
  const btn=$('discSave'); if(btn) btn.onclick=async()=>{ const entries=[]; document.querySelectorAll('#discEditor select').forEach(s=>{ if(s.value) entries.push({fieldRef:s.dataset.ref,tier:s.value}); }); if(!await ensureStepUp())return; await saveDisclosure(entries); toast('Disclosure saved'); };
}
async function saveDisclosure(entries,silent){ try{ await api('PUT','/api/subjects/'+S.subject.id+'/selections',{entries}); if(!silent) renderConsent(); }catch(e){ if(!silent) toast(e.message,true); else throw e; } }

/* ================= EMERGENCY CARD ================= */
async function renderEmergency(){
  if(!S.subject) return renderOnboarding();
  $('main').innerHTML=\`<h1 class="page-h">Emergency Card</h1><p class="page-sub">Exactly what a responder sees when they scan your MediKey.</p>
    <div class="card pad" style="margin-bottom:16px">
      <p class="muted small" style="margin:0 0 12px">This is a live preview of your emergency page. Only items marked 🔴 Emergency appear here.</p>
      <div id="ecFrame" style="height:60vh;border:1px solid var(--line);border-radius:12px;overflow:hidden"><div class="empty"><span class="spinner"></span></div></div>
    </div>
    <button class="btn" onclick="go('consent')">Manage what's shared</button>\`;
  try{ const res=await fetch('/api/subjects/'+S.subject.id+'/preview.html',{headers:{authorization:'Bearer '+S.token}}); const html=await res.text();
    $('ecFrame').innerHTML='<iframe style="width:100%;height:100%;border:none" title="Emergency card"></iframe>'; $('ecFrame').firstChild.srcdoc=html;
  }catch(e){ $('ecFrame').innerHTML='<div class="empty">Could not load</div>'; }
}

/* ================= PROFILE ================= */
function renderProfile(){
  if(!S.subject) return renderOnboarding();
  const s=S.subject, ex=s.extras||{}; const ec=emergencyContact(), bg=bloodGroup();
  $('main').innerHTML=\`<h1 class="page-h">My Profile</h1><p class="page-sub">Personal and identity information.</p>
   <div class="card"><div class="pad between"><h3>Basic information</h3><button class="btn soft sm" onclick="editBasic()">Edit</button></div>
     \${field('Full name',s.fullName)}\${field('Date of birth',s.dateOfBirth||'—')}\${field('Age',s.ageYears!=null?String(s.ageYears):'—')}\${field('Gender',ex.gender||'—')}</div>
   <div class="card" style="margin-top:16px"><div class="pad between"><h3>Contact information</h3><button class="btn soft sm" onclick="editContact()">Edit</button></div>
     \${field('Phone',ex.phone||'—')}\${field('Email',S.email||'—')}\${field('Address',ex.address||'—')}</div>\`;
}
function field(k,v){ return \`<div class="rowitem"><div class="grow"><p style="margin:0;color:var(--muted);font-size:12.5px">\${esc(k)}</p><h4 style="font-weight:600;margin-top:2px">\${esc(v)}</h4></div></div>\`; }
function editBasic(){
  const ex=S.subject.extras||{};
  openModal(\`<div class="m-h"><h3>Edit basic information</h3></div><div class="m-b">
    <label class="fld">Full name</label><input id="eName" value="\${esc(S.subject.fullName)}">
    <label class="fld">Date of birth</label><input id="eDob" type="date" value="\${esc(S.subject.dateOfBirth||'')}">
    <label class="fld">Gender</label><input id="eGender" value="\${esc(ex.gender||'')}">
    <button id="eSave" class="btn block" style="margin-top:16px">Save</button></div>\`);
  $('eSave').onclick=async()=>{ if(!await ensureStepUp()) return;
    try{ await api('PATCH','/api/subjects/'+S.subject.id,{fullName:$('eName').value,dateOfBirth:$('eDob').value||undefined,extras:{gender:$('eGender').value}}); closeModal(); await loadSubject(); refreshChrome(); renderProfile(); toast('Updated'); }catch(e){toast(e.message,true);} };
}
function editContact(){
  const ex=S.subject.extras||{};
  openModal(\`<div class="m-h"><h3>Edit contact information</h3></div><div class="m-b">
    <label class="fld">Phone</label><input id="ePhone" value="\${esc(ex.phone||'')}">
    <label class="fld">Address</label><textarea id="eAddr" rows="2">\${esc(ex.address||'')}</textarea>
    <button id="eSave" class="btn block" style="margin-top:16px">Save</button></div>\`);
  $('eSave').onclick=async()=>{ if(!await ensureStepUp()) return;
    try{ await api('PATCH','/api/subjects/'+S.subject.id,{extras:{phone:$('ePhone').value,address:$('eAddr').value}}); closeModal(); await loadSubject(); renderProfile(); toast('Updated'); }catch(e){toast(e.message,true);} };
}

/* ================= ACTIVITY ================= */
async function renderActivity(){
  if(!S.subject) return renderOnboarding();
  let history=[]; try{ history=await api('GET','/api/subjects/'+S.subject.id+'/history'); }catch{}
  history=history.slice().reverse();
  $('main').innerHTML=\`<h1 class="page-h">Activity</h1><p class="page-sub">Everyone who has accessed your MediKey.</p>
   <div class="card">\${history.length? history.map(rowActivity).join('') : emptyBlock('🕑','No activity yet','When your MediKey is accessed, it will appear here.')}</div>\`;
}

/* ================= SETTINGS ================= */
function renderSettings(){
  $('main').innerHTML=\`<h1 class="page-h">Settings</h1><p class="page-sub">Account, security, and advanced controls.</p>
   <div class="card"><div class="pad"><h3>Account</h3></div>
     \${field('Email',S.email||'—')}\${field('Session',S.stepped?'Stepped-up (verified)':'Signed in')}
     <div class="rowitem"><div class="grow"><h4>My Profile</h4></div><button class="btn ghost sm" onclick="go('profile')">Edit</button></div>
     <div class="rowitem"><div class="grow"><h4>Sign out</h4></div><button class="btn ghost sm" onclick="signOut()">Sign out</button></div></div>

   <div class="card" style="margin-top:16px"><div class="pad"><h3>🔑 Passkeys</h3><p class="muted small" style="margin:6px 0 0">Sign in with your device — no password needed.</p></div>
     <div class="rowitem"><div class="grow"><h4>Add a passkey</h4></div><button class="btn soft sm" onclick="addPasskey()">Add</button></div></div>

   <div class="card" style="margin-top:16px"><div class="pad"><h3>Privacy & data</h3></div>
     <div class="rowitem"><div class="grow"><h4>Export my data</h4></div><button class="btn soft sm" onclick="exportData()">Export</button></div>
     <div class="rowitem"><div class="grow"><h4>Access history</h4></div><button class="btn ghost sm" onclick="go('activity')">View</button></div></div>

   <div class="card" style="margin-top:16px;border-color:var(--danger)"><div class="pad"><h3 style="color:var(--danger)">Danger zone</h3></div>
     <div class="rowitem"><div class="grow"><h4>Delete my MediKey</h4><p>Permanently erase everything (crypto-shred)</p></div><button class="btn danger sm" onclick="deleteAccount()">Delete</button></div></div>\`;
}
function signOut(){ Object.assign(S,{token:null,stepped:false,secret:null,subject:null,items:[],grants:[]}); $('app').classList.add('hidden'); $('auth').classList.remove('hidden'); toast('Signed out'); }
async function addPasskey(){ if(!(window.PublicKeyCredential&&PublicKeyCredential.parseCreationOptionsFromJSON)) return toast('No passkey support',true);
  try{ const o=await api('POST','/api/auth/passkey/register/options',{}); const c=await navigator.credentials.create({publicKey:PublicKeyCredential.parseCreationOptionsFromJSON(o)}); await api('POST','/api/auth/passkey/register/verify',c.toJSON()); toast('Passkey added'); }catch(e){toast(e.message||'cancelled',true);} }
async function exportData(){ if(!await ensureStepUp())return; try{ const d=await api('POST','/api/export'); const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='medikey-export.json'; a.click(); toast('Exported'); }catch(e){toast(e.message,true);} }
async function deleteAccount(){ if(!await confirmAction('Delete your MediKey?','This permanently erases everything. Cannot be undone.','Delete everything',true))return; if(!await ensureStepUp())return; try{ await api('DELETE','/api/account'); toast('Deleted'); signOut(); }catch(e){toast(e.message,true);} }
</script>
</body>
</html>`;
