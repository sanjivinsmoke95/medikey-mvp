/**
 * Provider experience — a simple, mobile-first console for healthcare providers.
 * Scan patient QR → request consent → view approved data → add records.
 * No authority lives here: consent enforcement is 100% server-side.
 */
export const PROVIDER_UI_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>MediKey Provider</title>
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
.btn.danger{background:var(--danger);color:#fff}
.btn.sm{padding:6px 12px;font-size:13.5px;border-radius:9px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.block{width:100%}
.btn.green{background:var(--green);color:#fff}
label.fld{display:block;font-size:13px;color:var(--muted);margin:12px 0 5px;font-weight:500}
input,select,textarea{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
input:focus,select:focus,textarea:focus{outline:2px solid var(--accent);outline-offset:1px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.pad{padding:20px}
.muted{color:var(--muted)} .faint{color:var(--faint)} .small{font-size:13px}
.hidden{display:none!important}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:20px;border:1px solid var(--line)}
.chip.emergency{background:var(--danger-soft);color:var(--danger);border-color:transparent}
.chip.clinical{background:var(--orange-soft);color:var(--orange);border-color:transparent}
.chip.private{background:var(--soft);color:var(--navy);border-color:transparent}
.chip.verified{background:var(--green-soft);color:var(--green);border-color:transparent}
.chip.self{background:#fef9e7;color:#8a6d0b;border-color:transparent}
.chip.pending{background:var(--soft);color:var(--muted);border-color:transparent}
.shell{max-width:520px;margin:0 auto;padding:16px;min-height:100vh}
.topbar{display:flex;align-items:center;gap:10px;padding:12px 0 20px}
.topbar .brand{display:flex;align-items:center;gap:9px;font-weight:750;font-size:17px}
.topbar .label{font-size:12px;font-weight:700;color:var(--orange);background:var(--orange-soft);padding:2px 8px;border-radius:6px}
.rowitem{display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid var(--line)}
.rowitem:first-child{border-top:0}
.rowitem .grow{flex:1;min-width:0}
.rowitem h4{font-size:15px} .rowitem p{margin:2px 0 0;color:var(--muted);font-size:13px}
.empty{padding:30px 20px;text-align:center;color:var(--muted)}
.cat-grid{display:grid;gap:8px;margin:12px 0}
.cat-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;cursor:pointer;user-select:none}
.cat-item.on{border-color:var(--accent);background:var(--soft)}
.cat-item .check{width:20px;height:20px;border:2px solid var(--line);border-radius:6px;display:grid;place-items:center;flex:0 0 auto;font-size:12px}
.cat-item.on .check{background:var(--accent);border-color:var(--accent);color:#fff}
.patient-card{background:linear-gradient(135deg,var(--navy),var(--navy-700));color:#fff;border-radius:16px;padding:20px;margin:16px 0}
.patient-card h3{font-size:18px;font-weight:700}
.patient-card .meta{opacity:.75;font-size:13px;margin-top:4px}
.timer{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--orange);font-weight:600;padding:12px 16px;background:var(--orange-soft);border-radius:10px;margin:12px 0}
.section-h{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:700;margin:20px 0 8px}
.med-item{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:8px 0}
.med-item h4{font-size:15px;font-weight:650}
.med-item .meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:11px 18px;border-radius:12px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:60;max-width:90%}
.toast.show{opacity:1}.toast.err{background:var(--danger);color:#fff}
</style>
</head>
<body>
<div class="shell">

<div class="topbar">
  <span class="brand"><span class="logo">M</span> MediKey</span>
  <span class="label">PROVIDER</span>
  <div style="flex:1"></div>
  <button id="btnSignOut" class="btn ghost sm hidden" onclick="signOut()">Sign out</button>
</div>

<div id="main"></div>

</div>
<div class="toast" id="toast"></div>

<script>
const S = { token:null, stepped:false, email:null, secret:null, accountId:null, role:null, providerName:null, providerOrg:null, view:'auth', patientSubjectId:null, patientName:null, activeGrant:null };
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

/* ---- auth ---- */
function renderAuth(){
  S.view='auth';
  $('btnSignOut').classList.add('hidden');
  $('main').innerHTML=\`
    <div class="card pad" style="margin-top:30px">
      <h2 style="font-size:22px;margin-bottom:4px">Provider sign in</h2>
      <p class="muted" style="margin:0 0 14px">Sign in with your provider account.</p>
      <label class="fld">Email</label><input id="pEmail" placeholder="provider@clinic.com" value="dr.rao@clinic.com">
      <label class="fld">Passphrase</label><input id="pSecret" type="password" value="provider">
      <button id="pLogin" class="btn block" style="margin-top:16px">Sign in</button>
      <p class="muted small" style="text-align:center;margin:14px 0 4px">New provider?</p>
      <button id="pReg" class="btn ghost block" style="margin-top:4px">Register as provider</button>
    </div>\`;
  $('pLogin').onclick=async()=>{ try{
    const sec=$('pSecret').value;
    const r=await api('POST','/api/auth/login',{email:$('pEmail').value,secret:sec});
    S.secret=sec; await onSignedIn(r);
  }catch(e){ toast(e.message,true);} };
  $('pReg').onclick=()=>renderRegister();
}

function renderRegister(){
  $('main').innerHTML=\`
    <div class="card pad" style="margin-top:30px">
      <h2 style="font-size:22px;margin-bottom:4px">Register as provider</h2>
      <p class="muted" style="margin:0 0 14px">Create a healthcare provider account.</p>
      <label class="fld">Your name (Dr. …)</label><input id="rName" placeholder="Dr. Rao">
      <label class="fld">Organisation</label><input id="rOrg" placeholder="District Hospital">
      <label class="fld">Email</label><input id="rEmail" placeholder="you@clinic.com">
      <label class="fld">Passphrase</label><input id="rSecret" type="password">
      <button id="rGo" class="btn block" style="margin-top:16px">Create provider account</button>
      <button class="btn ghost block" style="margin-top:8px" onclick="renderAuth()">Back to sign in</button>
    </div>\`;
  $('rGo').onclick=async()=>{ try{
    const sec=$('rSecret').value;
    await api('POST','/api/auth/register',{email:$('rEmail').value,secret:sec,role:'provider',providerName:$('rName').value,providerOrg:$('rOrg').value});
    const r=await api('POST','/api/auth/login',{email:$('rEmail').value,secret:sec});
    S.secret=sec; await onSignedIn(r); toast('Provider account created');
  }catch(e){ toast(e.message,true);} };
}

async function onSignedIn(r){
  S.token=r.token; S.accountId=r.accountId; S.stepped=(r.authStrength==='stepped_up');
  S.role=r.role; S.providerName=r.providerName; S.providerOrg=r.providerOrg;
  $('btnSignOut').classList.remove('hidden');
  renderHome();
}

function signOut(){
  Object.assign(S,{token:null,stepped:false,secret:null,accountId:null,role:null,providerName:null,providerOrg:null,patientSubjectId:null,patientName:null,activeGrant:null});
  $('btnSignOut').classList.add('hidden');
  renderAuth();
}

/* ---- step-up ---- */
async function ensureStepUp(){
  if(S.stepped) return true;
  if(S.secret){ try{ const r=await api('POST','/api/auth/stepup',{secret:S.secret}); S.token=r.token; S.stepped=true; return true; }catch{} }
  return false;
}

/* ---- provider home ---- */
async function renderHome(){
  S.view='home';
  let grants=[]; try{ grants=await api('GET','/api/provider/grants'); }catch{}
  const active=grants.filter(g=>g.status==='granted'&&g.expiresAt&&Date.parse(g.expiresAt)>Date.now());
  const pending=grants.filter(g=>g.status==='pending');

  $('main').innerHTML=\`
    <h1 style="font-size:24px;margin-bottom:6px">Welcome\${S.providerName?', '+esc(S.providerName):''}</h1>
    <p class="muted" style="margin:0 0 20px">\${esc(S.providerOrg||'Healthcare Provider')}</p>

    <div class="card pad" style="text-align:center;padding:30px 20px">
      <div style="font-size:48px;margin-bottom:12px">📷</div>
      <h3 style="font-size:18px;margin-bottom:8px">Scan patient QR</h3>
      <p class="muted small" style="margin:0 0 16px">Scan or enter a patient's MediKey code to request access to their medical information.</p>
      <button class="btn block" onclick="showScanInput()">Scan patient QR</button>
    </div>

    \${active.length?\`
      <div class="section-h">Active access</div>
      <div class="card">\${active.map(grantRow).join('')}</div>
    \`:''}

    \${pending.length?\`
      <div class="section-h">Pending requests</div>
      <div class="card">\${pending.map(g=>\`
        <div class="rowitem">
          <div style="width:36px;height:36px;border-radius:10px;background:var(--orange-soft);display:grid;place-items:center">⏳</div>
          <div class="grow"><h4>Awaiting patient consent</h4><p>\${esc(g.purpose)} · \${esc(g.requestedCategories.join(', '))}</p></div>
        </div>\`).join('')}</div>
    \`:''}
  \`;
}

function grantRow(g){
  const mins=Math.max(0,Math.round((Date.parse(g.expiresAt)-Date.now())/60000));
  return \`<div class="rowitem" style="cursor:pointer" onclick="viewGrantData('\${g.id}')">
    <div style="width:36px;height:36px;border-radius:10px;background:var(--green-soft);display:grid;place-items:center;color:var(--green);font-size:18px">✓</div>
    <div class="grow"><h4>Access granted</h4><p>\${esc(g.purpose)} · \${mins} min remaining</p></div>
    <div style="color:var(--faint);font-size:20px">›</div>
  </div>\`;
}

/* ---- scan input ---- */
function showScanInput(){
  $('main').innerHTML=\`
    <button class="btn ghost sm" onclick="renderHome()" style="margin-bottom:16px">← Back</button>
    <div class="card pad">
      <h3 style="font-size:18px;margin-bottom:12px">Enter patient MediKey code</h3>
      <p class="muted small" style="margin:0 0 12px">Enter the opaque identifier from the patient's QR code. In production, this would use the device camera.</p>
      <label class="fld">MediKey opaque ID</label>
      <input id="qrInput" placeholder="Paste or scan the QR code identifier">
      <button id="qrResolve" class="btn block" style="margin-top:14px">Identify patient</button>
    </div>\`;
  $('qrResolve').onclick=async()=>{
    const opaque=$('qrInput').value.trim(); if(!opaque) return toast('Enter a code',true);
    try{
      const r=await api('POST','/api/provider/resolve-qr',{opaqueId:opaque});
      S.patientSubjectId=r.subjectId; S.patientName=r.patientName;
      renderConsentRequest();
    }catch(e){ toast('Patient not found or QR invalid',true); }
  };
}

/* ---- consent request form ---- */
const CATEGORIES=[
  {value:'allergy',label:'Allergies',icon:'🌾'},
  {value:'medication',label:'Current medications',icon:'💊'},
  {value:'condition',label:'Conditions',icon:'❤️'},
  {value:'medical_history',label:'Medical history',icon:'📋'},
  {value:'prescription',label:'Prescriptions',icon:'📝'},
  {value:'vaccination',label:'Vaccinations',icon:'💉'},
  {value:'surgery',label:'Procedures / Surgery',icon:'🏥'},
  {value:'document',label:'Reports / Documents',icon:'📄'},
];

function renderConsentRequest(){
  const selected=new Set(['allergy','medication','condition']);
  $('main').innerHTML=\`
    <button class="btn ghost sm" onclick="renderHome()" style="margin-bottom:16px">← Back</button>
    <div class="patient-card">
      <div style="font-size:12px;opacity:.7;margin-bottom:4px">PATIENT</div>
      <h3>\${esc(S.patientName)}</h3>
    </div>
    <div class="card pad">
      <h3 style="font-size:18px;margin-bottom:4px">Request information</h3>
      <p class="muted small" style="margin:0 0 16px">Select the categories you need and the patient will be asked to approve.</p>
      <div class="cat-grid" id="catGrid">
        \${CATEGORIES.map(c=>\`
          <div class="cat-item\${selected.has(c.value)?' on':''}" data-cat="\${c.value}" onclick="toggleCat(this)">
            <div class="check">\${selected.has(c.value)?'✓':''}</div>
            <span>\${c.icon} \${c.label}</span>
          </div>
        \`).join('')}
      </div>
      <label class="fld">Purpose</label>
      <input id="conPurpose" value="Consultation" placeholder="e.g. Consultation, Follow-up">
      <label class="fld">Duration</label>
      <select id="conDuration">
        <option value="1800">30 minutes</option>
        <option value="3600">1 hour</option>
        <option value="7200">2 hours</option>
        <option value="14400">4 hours</option>
      </select>
      <button id="conRequest" class="btn block" style="margin-top:18px">Request access</button>
    </div>\`;
  $('conRequest').onclick=async()=>{
    const cats=[]; document.querySelectorAll('.cat-item.on').forEach(el=>cats.push(el.dataset.cat));
    if(!cats.length) return toast('Select at least one category',true);
    try{
      const r=await api('POST','/api/consent/request',{
        subjectId:S.patientSubjectId,
        categories:cats,
        purpose:$('conPurpose').value||'Consultation',
        durationSeconds:parseInt($('conDuration').value),
      });
      toast('Consent request sent to patient');
      renderWaitingForConsent(r.id);
    }catch(e){ toast(e.message,true); }
  };
}

function toggleCat(el){
  el.classList.toggle('on');
  el.querySelector('.check').textContent=el.classList.contains('on')?'✓':'';
}

/* ---- waiting screen ---- */
function renderWaitingForConsent(grantId){
  let polling;
  $('main').innerHTML=\`
    <div style="text-align:center;padding:40px 16px">
      <div style="font-size:48px;margin-bottom:16px">⏳</div>
      <h2 style="font-size:22px;margin-bottom:8px">Waiting for patient consent</h2>
      <p class="muted">The patient has been notified. They need to approve your request in their MediKey app.</p>
      <div style="margin-top:20px"><span class="chip pending">Pending approval</span></div>
      <button class="btn ghost" style="margin-top:24px" onclick="clearInterval(window._poll);renderHome()">Cancel</button>
    </div>\`;
  window._poll=setInterval(async()=>{
    try{
      const grants=await api('GET','/api/provider/grants');
      const g=grants.find(x=>x.id===grantId);
      if(g&&g.status==='granted'){ clearInterval(window._poll); S.activeGrant=g; toast('Access granted'); viewGrantData(grantId); }
      if(g&&g.status==='declined'){ clearInterval(window._poll); toast('Patient declined the request',true); renderHome(); }
    }catch{}
  },2000);
}

/* ---- view granted data ---- */
async function viewGrantData(grantId){
  try{
    const r=await api('GET','/api/consent/'+grantId+'/data');
    S.activeGrant=r.grant;
    const items=r.items;
    const mins=Math.max(0,Math.round((Date.parse(r.grant.expiresAt)-Date.now())/60000));

    $('main').innerHTML=\`
      <button class="btn ghost sm" onclick="renderHome()" style="margin-bottom:16px">← Back</button>
      <div class="patient-card">
        <div style="font-size:12px;opacity:.7;margin-bottom:4px">PATIENT</div>
        <h3>\${esc(S.patientName||'Patient')}</h3>
        <div class="meta">\${esc(r.grant.purpose)}</div>
      </div>
      <div class="timer">⏱ Access expires in \${mins} minutes</div>

      \${items.length? groupItems(items) : '<div class="empty"><p>No records in the approved categories.</p></div>'}

      <div class="section-h" style="margin-top:24px">Actions</div>
      <div class="card">
        <div class="rowitem" style="cursor:pointer" onclick="showAddRecord('\${grantId}')">
          <div style="width:36px;height:36px;border-radius:10px;background:var(--green-soft);display:grid;place-items:center">+</div>
          <div class="grow"><h4>Add medical record</h4><p>Add a verified record to this patient's MediKey</p></div>
          <div style="color:var(--faint);font-size:20px">›</div>
        </div>
      </div>
    \`;
  }catch(e){ toast(e.message||'Access denied or expired',true); renderHome(); }
}

function groupItems(items){
  const groups={};
  for(const i of items){
    const key=TYPE_LABEL[i.type]||i.type;
    (groups[key]=groups[key]||[]).push(i);
  }
  let html='';
  for(const [title,list] of Object.entries(groups)){
    html+=\`<div class="section-h">\${esc(title)}</div>\`;
    for(const i of list){
      html+=renderMedItem(i);
    }
  }
  return html;
}

const TYPE_LABEL={blood_group:'Blood group',allergy:'Allergies',condition:'Conditions',medication:'Medications',medication_avoidance:'Do NOT administer',implant:'Implants',surgery:'Surgery',injury:'Injuries',emergency_contact:'Emergency contacts',document:'Documents',prescription:'Prescriptions',vaccination:'Vaccinations',procedure:'Procedures',medical_history:'Medical history'};

function renderMedItem(i){
  const d=i.data||{};
  const name=d.name||d.title||d.group||d.drug||d.vaccine||'Record';
  const detail=[];
  if(d.dose) detail.push(d.dose);
  if(d.frequency) detail.push(d.frequency);
  if(d.reaction) detail.push(d.reaction);
  if(d.notes) detail.push(d.notes);
  const vBadge=verificationBadge(i.verificationStatus,i.providerNameSnapshot);
  return \`<div class="med-item">
    <h4>\${esc(name)} \${i.isCritical?'<span class="chip emergency">critical</span>':''}</h4>
    \${detail.length?'<p class="muted small" style="margin:4px 0">'+esc(detail.join(' · '))+'</p>':''}
    <div class="meta">\${vBadge}\${i.createdAt?'<span class="muted small">'+fmtDate(i.createdAt)+'</span>':''}</div>
  </div>\`;
}

function verificationBadge(status,providerName){
  if(status==='provider_verified') return '<span class="chip verified">✓ Verified · '+(providerName?esc(providerName):'Provider')+'</span>';
  if(status==='pending') return '<span class="chip pending">⏳ Pending</span>';
  if(status==='needs_review') return '<span class="chip" style="background:var(--danger-soft);color:var(--danger)">⚠ Needs review</span>';
  return '<span class="chip self">● Self-reported</span>';
}

function fmtDate(iso){ const d=new Date(iso); return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }

/* ---- add record ---- */
function showAddRecord(grantId){
  $('main').innerHTML=\`
    <button class="btn ghost sm" onclick="viewGrantData('\${grantId}')" style="margin-bottom:16px">← Back</button>
    <div class="card pad">
      <h3 style="font-size:18px;margin-bottom:12px">Add medical record</h3>
      <p class="muted small" style="margin:0 0 16px">This record will be marked as a verified provider record with your name.</p>
      <label class="fld">Type</label>
      <select id="arType">
        <option value="medication">Medication</option>
        <option value="condition">Condition / Diagnosis</option>
        <option value="allergy">Allergy</option>
        <option value="prescription">Prescription</option>
        <option value="vaccination">Vaccination</option>
        <option value="procedure">Procedure</option>
        <option value="medical_history">Medical history</option>
      </select>
      <label class="fld">Name / Title</label><input id="arName" placeholder="e.g. Metformin, Diabetes, Penicillin allergy">
      <label class="fld">Dosage (optional)</label><input id="arDose" placeholder="e.g. 500 mg">
      <label class="fld">Notes (optional)</label><textarea id="arNotes" rows="3" placeholder="Additional details..."></textarea>
      <button id="arSave" class="btn green block" style="margin-top:16px">Add verified record</button>
    </div>\`;
  $('arSave').onclick=async()=>{
    const name=$('arName').value.trim(); if(!name) return toast('Enter a name',true);
    const data={name}; if($('arDose').value.trim()) data.dose=$('arDose').value.trim(); if($('arNotes').value.trim()) data.notes=$('arNotes').value.trim();
    try{
      await api('POST','/api/consent/'+grantId+'/add-record',{type:$('arType').value,data});
      toast('Record added to patient\\'s MediKey');
      viewGrantData(grantId);
    }catch(e){ toast(e.message,true); }
  };
}

/* ---- init ---- */
renderAuth();
</script>
</body>
</html>`;
