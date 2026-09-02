/**
 * Minimal owner console (P11). One static, dependency-free page that drives the
 * owner API. It is a thin operator UI over the same endpoints the tests use — it
 * holds NO authority of its own (all checks are server-side). The rich Next.js
 * PWA remains the documented next build; this proves the loop end-to-end in a
 * browser and mirrors the mandatory-preview step before activation.
 */
export const OWNER_UI_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>MediKey — Owner Console</title>
<style>
:root{
  --navy:#173A78; --navy-700:#0f2a5c; --ink:#1c2430; --muted:#5b6472;
  --line:#dde3ec; --bg:#f4f6fb; --card:#fff; --saffron:#f5a623; --green:#1f9d55;
  --danger:#b00020; --danger-bg:#fff3f3; --radius:12px;
}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg)}
header{background:var(--navy);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:12px}
header .logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--saffron),#fff 55%,var(--green));display:grid;place-items:center;font-weight:800;color:var(--navy)}
header h1{font-size:17px;margin:0;font-weight:700;letter-spacing:.2px}
header .who{margin-left:auto;font-size:13px;opacity:.9}
main{max-width:940px;margin:0 auto;padding:20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px;margin:0 0 16px}
.card h2{margin:0 0 12px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--navy-700)}
label{display:block;font-size:13px;color:var(--muted);margin:8px 0 3px}
input,select,textarea{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font:inherit;background:#fff}
.row{display:flex;gap:10px;flex-wrap:wrap}
.row>div{flex:1;min-width:160px}
button{font:inherit;font-weight:600;border:0;border-radius:8px;padding:9px 15px;background:var(--navy);color:#fff;cursor:pointer}
button.ghost{background:#eef2f9;color:var(--navy-700)}
button.warn{background:var(--danger)}
button.green{background:var(--green)}
button.sm{padding:5px 10px;font-size:13px}
button:disabled{opacity:.5;cursor:not-allowed}
.pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:20px;background:#eef2f9;color:var(--navy-700);border:1px solid var(--line)}
.pill.step{background:#eafaf0;color:#0c6b38;border-color:#bfe8cf}
.pill.crit{background:var(--danger-bg);color:var(--danger);border-color:#f3c2c9}
.hidden{display:none}
.list{border:1px solid var(--line);border-radius:10px;overflow:hidden}
.item{display:flex;gap:10px;align-items:center;padding:10px 12px;border-top:1px solid var(--line)}
.item:first-child{border-top:0}
.item .grow{flex:1;min-width:0}
.item .grow small{color:var(--muted)}
.muted{color:var(--muted);font-size:13px}
.toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90%}
.toast.show{opacity:1}
.toast.err{background:var(--danger)}
code{background:#eef2f9;padding:1px 6px;border-radius:5px;font-size:13px;word-break:break-all}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:720px){.grid2{grid-template-columns:1fr}}
a.link{color:var(--navy);font-weight:600}
.tier-l1_critical{border-left:4px solid var(--danger)}
.tier-l2_additional{border-left:4px solid var(--saffron)}
.tier-l3_sensitive{border-left:4px solid var(--muted)}
iframe.preview{width:100%;height:420px;border:1px solid var(--line);border-radius:10px;background:#fff}
</style>
</head>
<body>
<header>
  <a href="/" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:12px" title="Back to medikey.site">
    <div class="logo">M</div>
    <h1>MediKey — Owner Console</h1>
  </a>
  <div class="who" id="who">not signed in</div>
</header>
<main>

<!-- AUTH -->
<section class="card" id="authCard">
  <h2>Account</h2>
  <div class="row">
    <div><label>Email</label><input id="email" placeholder="you@example.com" value="asha@example.com"></div>
    <div><label>Passphrase (dev credential, min 8)</label><input id="secret" type="password" value="correct horse battery staple"></div>
  </div>
  <div class="row" style="margin-top:12px">
    <button id="btnRegister" class="ghost">Register</button>
    <button id="btnLogin">Sign in</button>
    <div style="flex:1"></div>
    <button id="btnStepup" class="green" disabled>Step-up (re-enter passphrase)</button>
    <button id="btnLogout" class="ghost" disabled>Sign out</button>
  </div>
  <p class="muted" id="authState" style="margin:12px 0 0">Sensitive actions (disclosure, QR, delete) require step-up.</p>
</section>

<div id="app" class="hidden">
  <div class="grid2">
    <!-- SUBJECTS -->
    <section class="card">
      <h2>Emergency profiles</h2>
      <div class="list" id="subjectsList"><div class="item"><span class="muted">No profiles yet.</span></div></div>
      <div class="row" style="margin-top:12px">
        <div><label>Full name</label><input id="subName" placeholder="Asha Rao"></div>
        <div><label>Date of birth</label><input id="subDob" type="date"></div>
      </div>
      <div style="margin-top:10px"><button id="btnAddSubject">Create profile</button></div>
    </section>

    <!-- MEDICAL -->
    <section class="card" id="medCard">
      <h2>Medical information <span class="muted" id="medSubject"></span></h2>
      <div class="list" id="itemsList"><div class="item"><span class="muted">Select a profile.</span></div></div>
      <div class="row" style="margin-top:12px">
        <div><label>Type</label>
          <select id="itemType">
            <option value="allergy">Allergy</option>
            <option value="condition">Condition</option>
            <option value="medication">Medication</option>
            <option value="medication_avoidance">Do NOT administer</option>
            <option value="implant">Implant / device</option>
            <option value="surgery">Surgery</option>
            <option value="injury">Injury</option>
            <option value="blood_group">Blood group</option>
            <option value="emergency_contact">Emergency contact</option>
          </select>
        </div>
        <div><label>Critical?</label>
          <select id="itemCritical"><option value="false">No</option><option value="true">Yes (life-threatening)</option></select>
        </div>
      </div>
      <div id="itemFields" class="row" style="margin-top:6px"></div>
      <div style="margin-top:10px"><button id="btnAddItem" disabled>Add item</button></div>
    </section>
  </div>

  <div class="grid2">
    <!-- DISCLOSURE -->
    <section class="card">
      <h2>Disclosure levels <span class="pill step">step-up</span></h2>
      <p class="muted">Choose what a scanner sees. L1 = critical (public scan), L2 = break-glass, L3 = private (never via a scan). DOB cannot be placed at L1.</p>
      <div class="list" id="selectionsList"><div class="item"><span class="muted">Select a profile.</span></div></div>
      <div style="margin-top:10px"><button id="btnSaveSelections" disabled>Save disclosure</button></div>
    </section>

    <!-- QR + RIGHTS -->
    <section class="card">
      <h2>MediKey codes <span class="pill step">step-up</span></h2>
      <div class="list" id="qrList"><div class="item"><span class="muted">Select a profile.</span></div></div>
      <div class="row" style="margin-top:10px">
        <div><label>Label</label><input id="qrLabel" value="wallet card"></div>
        <div style="flex:0;display:flex;align-items:flex-end"><button id="btnCreateQr" disabled>Generate</button></div>
      </div>
      <div id="qrCreated" class="hidden" style="margin-top:12px">
        <p class="muted" style="margin:0 0 4px">Opaque code (shown once):</p>
        <div><code id="qrOpaque"></code></div>
        <p style="margin:8px 0 0"><a class="link" id="qrLink" target="_blank" rel="noopener">Open the emergency page a scanner would see →</a></p>
      </div>
      <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">
      <h2>Data rights</h2>
      <div class="row">
        <button id="btnHistory" class="ghost" disabled>Access history</button>
        <button id="btnPreview" class="ghost" disabled>Preview (L1)</button>
        <button id="btnExport" class="ghost" disabled>Export (step-up)</button>
        <div style="flex:1"></div>
        <button id="btnDeleteSubject" class="warn" disabled>Delete profile</button>
      </div>
      <div id="historyBox" class="hidden" style="margin-top:12px"></div>
    </section>
  </div>

  <!-- PREVIEW -->
  <section class="card hidden" id="previewCard">
    <h2>Scanner preview <span class="muted">— exactly what a scan renders</span></h2>
    <iframe class="preview" id="previewFrame" title="Emergency page preview"></iframe>
  </section>
</div>
</main>

<div class="toast" id="toast"></div>

<script>
const S = { token:null, stepped:false, accountId:null, subjectId:null, items:[], subjects:[] };
const $ = (id) => document.getElementById(id);

function toast(msg, err){ const t=$('toast'); t.textContent=msg; t.className='toast show'+(err?' err':''); setTimeout(()=>t.className='toast',2600); }

async function api(method, path, body){
  const headers = { 'content-type':'application/json' };
  if (S.token) headers.authorization = 'Bearer '+S.token;
  const res = await fetch(path, { method, headers, body: body?JSON.stringify(body):undefined });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || data.error || ('HTTP '+res.status));
  return data;
}

function setAuthUI(){
  $('who').textContent = S.accountId ? ('account '+S.accountId.slice(0,8)+'… · '+(S.stepped?'stepped-up':'primary')) : 'not signed in';
  $('app').classList.toggle('hidden', !S.token);
  $('btnStepup').disabled = !S.token || S.stepped;
  $('btnLogout').disabled = !S.token;
  const needStep = ['btnSaveSelections','btnCreateQr','btnExport','btnDeleteSubject'];
  needStep.forEach(id=>{ const el=$(id); if(el) el.disabled = !S.stepped || !S.subjectId && id!=='btnExport'; });
  $('btnExport').disabled = !S.stepped;
  $('authState').textContent = S.stepped ? 'Stepped-up — sensitive actions unlocked.' : 'Sensitive actions (disclosure, QR, delete) require step-up.';
}

// ---- Auth ----
$('btnRegister').onclick = async()=>{ try{ await api('POST','/api/auth/register',{email:$('email').value,secret:$('secret').value}); toast('Registered — now sign in'); }catch(e){ toast(e.message,true);} };
$('btnLogin').onclick = async()=>{ try{ const r=await api('POST','/api/auth/login',{email:$('email').value,secret:$('secret').value}); S.token=r.token; S.accountId=r.accountId; S.stepped=false; setAuthUI(); await loadSubjects(); toast('Signed in'); }catch(e){ toast(e.message,true);} };
$('btnStepup').onclick = async()=>{ try{ const r=await api('POST','/api/auth/stepup',{secret:$('secret').value}); S.token=r.token; S.stepped=true; setAuthUI(); toast('Stepped up'); }catch(e){ toast(e.message,true);} };
$('btnLogout').onclick = ()=>{ Object.assign(S,{token:null,stepped:false,accountId:null,subjectId:null,items:[],subjects:[]}); setAuthUI(); toast('Signed out'); };

// ---- Subjects ----
async function loadSubjects(){
  S.subjects = await api('GET','/api/subjects');
  const el=$('subjectsList');
  if(!S.subjects.length){ el.innerHTML='<div class="item"><span class="muted">No profiles yet.</span></div>'; return; }
  el.innerHTML = S.subjects.map(s=>\`<div class="item">
     <div class="grow"><b>\${esc(s.fullName)}</b> <small>\${s.ageYears!=null?('· age '+s.ageYears):''} · \${s.relationship}</small></div>
     <button class="sm \${s.id===S.subjectId?'':'ghost'}" data-sub="\${s.id}">\${s.id===S.subjectId?'selected':'select'}</button>
   </div>\`).join('');
  el.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>selectSubject(b.dataset.sub));
}
$('btnAddSubject').onclick = async()=>{
  try{ const r=await api('POST','/api/subjects',{fullName:$('subName').value,dateOfBirth:$('subDob').value||undefined});
    $('subName').value=''; $('subDob').value=''; await loadSubjects(); selectSubject(r.subjectId); toast('Profile created'); }
  catch(e){ toast(e.message,true);} };

async function selectSubject(id){
  S.subjectId=id;
  const s=S.subjects.find(x=>x.id===id);
  $('medSubject').textContent = s?('— '+s.fullName):'';
  await Promise.all([loadItems(), loadQr()]);
  $('historyBox').classList.add('hidden'); $('previewCard').classList.add('hidden');
  ['btnAddItem','btnPreview','btnHistory'].forEach(x=>$(x).disabled=false);
  setAuthUI(); loadSubjects();
}

// ---- Medical items ----
const FIELDS = {
  allergy:[['name','Substance'],['reaction','Reaction']],
  condition:[['name','Condition']],
  medication:[['name','Medication'],['dose','Dose']],
  medication_avoidance:[['name','Do NOT administer']],
  implant:[['name','Implant / device']],
  surgery:[['name','Surgery']],
  injury:[['name','Injury']],
  blood_group:[['group','Blood group (e.g. O+)']],
  emergency_contact:[['name','Name'],['relationship','Relationship'],['phone','Phone']],
};
function renderItemFields(){
  const t=$('itemType').value;
  $('itemFields').innerHTML = FIELDS[t].map(([k,label])=>\`<div><label>\${label}</label><input data-f="\${k}"></div>\`).join('');
}
$('itemType').onchange = renderItemFields;
$('btnAddItem').onclick = async()=>{
  if(!S.subjectId) return;
  const data={}; $('itemFields').querySelectorAll('[data-f]').forEach(i=>{ if(i.value) data[i.dataset.f]=i.value; });
  const type=$('itemType').value; const isCritical=$('itemCritical').value==='true';
  try{ await api('POST','/api/subjects/'+S.subjectId+'/items',{type,data,isCritical,severity:isCritical?'life_threatening':undefined});
    $('itemFields').querySelectorAll('[data-f]').forEach(i=>i.value=''); await loadItems(); toast('Item added'); }
  catch(e){ toast(e.message,true);} };
async function loadItems(){
  S.items = await api('GET','/api/subjects/'+S.subjectId+'/items');
  const el=$('itemsList');
  el.innerHTML = S.items.length ? S.items.map(i=>\`<div class="item">
     <div class="grow"><b>\${label(i.type)}</b> \${i.isCritical?'<span class="pill crit">critical</span>':''}<br><small>\${esc(summarize(i))} · \${i.provenance.replace('_','-')}</small></div>
     <button class="sm warn" data-del="\${i.id}">delete</button>
   </div>\`).join('') : '<div class="item"><span class="muted">No items yet.</span></div>';
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ try{ await api('DELETE','/api/items/'+b.dataset.del); await loadItems(); await renderSelections(); toast('Deleted'); }catch(e){toast(e.message,true);} });
  await renderSelections();
}
function summarize(i){ const d=i.data||{}; return Object.values(d).filter(v=>typeof v==='string').join(' · ')||'—'; }

// ---- Disclosure selections ----
async function renderSelections(){
  const el=$('selectionsList');
  const rows=[
    {ref:'name',label:'Name',def:'l1_critical'},
    {ref:'age',label:'Age',def:'l1_critical'},
    {ref:'dob',label:'Date of birth (min L2)',def:'l2_additional',minL2:true},
    ...S.items.map(i=>({ref:'item:'+i.id,label:label(i.type)+' — '+summarize(i),def:i.isCritical?'l1_critical':'l2_additional'})),
  ];
  el.innerHTML = rows.map(r=>\`<div class="item tier-\${r.def}" data-row="\${r.ref}">
     <div class="grow">\${esc(r.label)}</div>
     <select data-ref="\${r.ref}" class="selTier" style="width:auto">
       <option value="">— hide —</option>
       <option value="l1_critical" \${r.minL2?'disabled':''}>L1 · critical</option>
       <option value="l2_additional">L2 · break-glass</option>
       <option value="l3_sensitive">L3 · private</option>
     </select></div>\`).join('');
  // default selections
  el.querySelectorAll('.selTier').forEach(sel=>{ const r=rows.find(x=>x.ref===sel.dataset.ref); sel.value=r.def; });
}
$('btnSaveSelections').onclick = async()=>{
  const entries=[]; $('selectionsList').querySelectorAll('.selTier').forEach(sel=>{ if(sel.value) entries.push({fieldRef:sel.dataset.ref,tier:sel.value}); });
  try{ await api('PUT','/api/subjects/'+S.subjectId+'/selections',{entries}); toast('Disclosure saved'); showPreview(); }
  catch(e){ toast(e.message,true);} };

// ---- QR ----
async function loadQr(){
  const list=await api('GET','/api/subjects/'+S.subjectId+'/qr');
  const el=$('qrList');
  el.innerHTML = list.length ? list.map(q=>\`<div class="item">
     <div class="grow"><b>\${esc(q.label)}</b> <small>· \${q.status}</small></div>
     \${q.status==='active'?\`<button class="sm warn" data-rev="\${q.qrId}" \${S.stepped?'':'disabled'}>revoke</button>\`:''}
   </div>\`).join('') : '<div class="item"><span class="muted">No codes yet.</span></div>';
  el.querySelectorAll('[data-rev]').forEach(b=>b.onclick=async()=>{ try{ await api('POST','/api/qr/'+b.dataset.rev+'/revoke'); await loadQr(); toast('Revoked'); }catch(e){toast(e.message,true);} });
}
$('btnCreateQr').onclick = async()=>{
  try{ const r=await api('POST','/api/subjects/'+S.subjectId+'/qr',{label:$('qrLabel').value});
    $('qrCreated').classList.remove('hidden'); $('qrOpaque').textContent=r.opaqueId;
    const link=location.origin+'/e/'+r.opaqueId; $('qrLink').href=link; $('qrLink').textContent='Open '+link+' →';
    await loadQr(); toast('Code generated'); }
  catch(e){ toast(e.message,true);} };

// ---- Rights ----
$('btnPreview').onclick = showPreview;
async function showPreview(){
  if(!S.subjectId) return;
  $('previewCard').classList.remove('hidden');
  try{
    // Fetch with the bearer token, then inject via srcdoc (an iframe navigation
    // would not carry the Authorization header → 401).
    const headers = S.token ? { authorization:'Bearer '+S.token } : {};
    const res = await fetch('/api/subjects/'+S.subjectId+'/preview.html', { headers });
    $('previewFrame').srcdoc = await res.text();
  }catch(e){ toast(e.message,true); }
}
$('btnHistory').onclick = async()=>{
  try{ const h=await api('GET','/api/subjects/'+S.subjectId+'/history'); const box=$('historyBox'); box.classList.remove('hidden');
    box.innerHTML = h.length ? '<div class="list">'+h.map(r=>\`<div class="item"><div class="grow"><b>\${r.accessType}</b> · \${r.level} · \${r.status} \${r.city?('· '+r.city):''}<br><small>\${new Date(r.createdAt).toLocaleString()}</small></div></div>\`).join('')+'</div>' : '<p class="muted">No access yet.</p>'; }
  catch(e){ toast(e.message,true);} };
$('btnExport').onclick = async()=>{ try{ const d=await api('POST','/api/export'); const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='medikey-export.json'; a.click(); toast('Exported'); }catch(e){toast(e.message,true);} };
$('btnDeleteSubject').onclick = async()=>{ if(!confirm('Delete this profile? Crypto-shred is irreversible.')) return; try{ await api('DELETE','/api/subjects/'+S.subjectId); S.subjectId=null; await loadSubjects(); $('itemsList').innerHTML=''; $('qrList').innerHTML=''; toast('Profile deleted'); }catch(e){toast(e.message,true);} };

// ---- helpers ----
function esc(s){ return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function label(t){ return ({allergy:'Allergy',condition:'Condition',medication:'Medication',medication_avoidance:'Do NOT administer',implant:'Implant / device',surgery:'Surgery',injury:'Injury',blood_group:'Blood group',emergency_contact:'Emergency contact'})[t]||t; }

renderItemFields(); setAuthUI();
</script>
</body>
</html>`;
