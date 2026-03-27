/* ============================================================
   DATA
============================================================ */
const PRESETS = [
  [{name:'A',profit:100,deadline:2},{name:'B',profit:19,deadline:1},
   {name:'C',profit:27,deadline:2},{name:'D',profit:25,deadline:1},{name:'E',profit:15,deadline:3}],
  [{name:'A',profit:90,deadline:4},{name:'B',profit:75,deadline:4},
   {name:'C',profit:60,deadline:4},{name:'D',profit:50,deadline:4},
   {name:'E',profit:40,deadline:4},{name:'F',profit:25,deadline:4}],
  [{name:'A',profit:50,deadline:1},{name:'B',profit:40,deadline:2},
   {name:'C',profit:30,deadline:3},{name:'D',profit:20,deadline:4}],
  [{name:'A',profit:80,deadline:1},{name:'B',profit:70,deadline:1},
   {name:'C',profit:60,deadline:2},{name:'D',profit:55,deadline:1},
   {name:'E',profit:45,deadline:2},{name:'F',profit:35,deadline:3}],
];

let jobs=[], steps=[], cur=-1, playing=false, pt=null, spd=1;
let sortSteps=[], sortCur=0, sortTmr=null, searchTmr=null;

/* ============================================================
   INIT
============================================================ */
window.onload = () => {
  loadPreset(0);
  buildPseudo();
  buildGreedyChoices();
  buildCounterEx();
  buildWorked();
  setTimeout(()=>{ drawGrowth(); drawCompare(); buildNoSortDemo(); }, 100);
};

function loadPreset(i) {
  jobs = JSON.parse(JSON.stringify(PRESETS[i]));
  document.getElementById('inp').value = jobs.map(j=>`${j.name},${j.profit},${j.deadline}`).join('\n');
  resetAll();
  buildSortSteps(jobs);  // show unsorted state immediately
}

function parseInput() {
  return document.getElementById('inp').value.trim().split('\n')
    .map(l => { const p=l.split(',').map(s=>s.trim()); return p.length>=3?{name:p[0],profit:+p[1],deadline:+p[2]}:null; })
    .filter(j=>j&&!isNaN(j.profit)&&!isNaN(j.deadline));
}

/* ============================================================
   ALGORITHM
============================================================ */
function runAlgo(jl) {
  const sorted = [...jl].sort((a,b)=>b.profit-a.profit);
  const maxD = Math.max(...sorted.map(j=>j.deadline));
  const slots = new Array(maxD+1).fill(null);
  const st=[]; let comp=0, asgn=0;

  st.push({type:'sort', sorted:sorted.map(j=>({...j})),
    msg:`<span class="hl">Sort complete.</span> Order: ${sorted.map(j=>`<span class="good">${j.name}($${j.profit})</span>`).join(', ')}`,
    pl:1, comp, asgn, slots:[...slots]});
  st.push({type:'init', maxD,
    msg:`<span class="hl">Initialise</span> ${maxD} empty time slot${maxD>1?'s':''}.`,
    pl:3, comp, asgn, slots:[...slots]});

  for (let i=0; i<sorted.length; i++) {
    const job=sorted[i];
    st.push({type:'consider', ji:i, job:{...job},
      msg:`<span class="acc">Considering Job ${job.name}</span> — profit <span class="good">$${job.profit}</span>, deadline <span class="hl">T${job.deadline}</span>. Searching for latest free slot ≤ T${job.deadline}.`,
      pl:4, comp, asgn, slots:[...slots]});

    let placed=false;
    for (let t=job.deadline; t>=1; t--) {
      comp++;
      st.push({type:'check', ji:i, job:{...job}, t, free:slots[t]===null,
        msg:`Check slot T${t}: ${slots[t]===null?`<span class="good">FREE ✓</span>`:`<span class="bad">Occupied by Job ${slots[t].name}</span>`}`,
        pl:5, comp, asgn, slots:[...slots]});
      if (!slots[t]) {
        asgn++; slots[t]=job;
        st.push({type:'assign', ji:i, job:{...job}, t,
          msg:`<span class="good">✓ Job ${job.name} → slot T${t}!</span> Profit <span class="acc">$${job.profit}</span> earned.`,
          pl:6, comp, asgn, slots:[...slots]});
        placed=true; break;
      }
    }
    if (!placed) st.push({type:'skip', ji:i, job:{...job},
      msg:`<span class="bad">✗ Job ${job.name} skipped</span> — no free slot before deadline T${job.deadline}.`,
      pl:8, comp, asgn, slots:[...slots]});
  }

  const totalP=slots.reduce((s,j)=>s+(j?j.profit:0),0);
  const totalS=slots.filter(Boolean).length;
  st.push({type:'done', slots:[...slots], totalP, totalS,
    msg:`<span class="acc">Done!</span> Scheduled <span class="good">${totalS} jobs</span>, total profit <span class="good">$${totalP}</span>.`,
    pl:9, comp, asgn});

  return {st, sorted, maxD};
}

/* ============================================================
   BUILD & RENDER
============================================================ */
function buildSteps() {
  jobs = parseInput();
  if (!jobs.length) { alert('Enter at least one valid job.'); return; }
  resetState();
  const r = runAlgo(jobs);
  steps=r.st;
  renderInit(r.sorted, r.maxD);
  setStatus('ready');
  updSC();
  document.getElementById('btn-step').disabled=false;
  document.getElementById('btn-play').disabled=false;
  document.getElementById('exp').innerHTML='Steps ready. Press <strong>Step</strong> or <strong>Play</strong>.';
  buildSortSteps(jobs);  // pass original unsorted order so animation starts unsorted
  buildNoSortDemo();
}

function renderInit(sorted, maxD) {
  // Job cards
  const jr=document.getElementById('jobs-row'); jr.innerHTML='';
  sorted.forEach((j,i)=>{
    const d=document.createElement('div'); d.className='job-card'; d.id=`jc-${i}`;
    d.innerHTML=`<div class="rank">${i+1}</div><div class="jname">${j.name}</div><div class="jprofit">$${j.profit}</div><div class="jdl">d = T${j.deadline}</div>`;
    jr.appendChild(d);
  });
  // Timeline
  const tl=document.getElementById('tline'); tl.innerHTML='';
  for (let t=1; t<=maxD; t++) {
    const s=document.createElement('div'); s.className='slot'; s.id=`slot-${t}`;
    s.innerHTML=`<span class="sempty">Empty</span><span class="stime">T${t}</span>`;
    tl.appendChild(s);
  }
}

function applyStep(s) {
  hlPseudo(s.pl);
  document.getElementById('s-comp').textContent=s.comp;
  document.getElementById('s-asgn').textContent=s.asgn;
  document.getElementById('exp').innerHTML=s.msg;

  document.querySelectorAll('.job-card').forEach(c=>c.classList.remove('considering','skipped'));

  if (s.slots) renderSlots(s.slots);

  if (s.type==='consider'||s.type==='check') {
    document.getElementById(`jc-${s.ji}`)?.classList.add('considering');
    if (s.type==='check'&&s.free) document.getElementById(`slot-${s.t}`)?.classList.add('target');
  }
  if (s.type==='assign') {
    document.getElementById(`jc-${s.ji}`)?.classList.add('scheduled');
    const se=document.getElementById(`slot-${s.t}`);
    if (se) { se.classList.add('just-filled'); setTimeout(()=>se.classList.remove('just-filled'),550); }
  }
  if (s.type==='skip')  document.getElementById(`jc-${s.ji}`)?.classList.add('skipped');
  if (s.type==='done') {
    document.getElementById('s-prof').textContent=s.totalP;
    document.getElementById('s-sched').textContent=s.totalS;
  }
  addHist(s);
}

function renderSlots(slots) {
  for (let t=1; t<slots.length; t++) {
    const el=document.getElementById(`slot-${t}`); if (!el) continue;
    el.classList.remove('target','filled');
    if (slots[t]) {
      el.classList.add('filled');
      el.innerHTML=`<div class="sname">${slots[t].name}</div><div class="sprofit">$${slots[t].profit}</div><span class="stime">T${t}</span>`;
    } else {
      el.innerHTML=`<span class="sempty">Empty</span><span class="stime">T${t}</span>`;
    }
  }
}

/* ============================================================
   PLAYBACK
============================================================ */
function stepFwd() {
  if (cur<steps.length-1) {
    cur++; applyStep(steps[cur]); updSC();
    if (cur===steps.length-1) { pauseAnim(); setStatus('done'); document.getElementById('btn-play').disabled=true; document.getElementById('btn-step').disabled=true; }
  }
}
function playAnim() {
  if (cur>=steps.length-1) return;
  playing=true; setStatus('playing');
  document.getElementById('btn-play').disabled=true;
  document.getElementById('btn-pause').disabled=false;
  document.getElementById('btn-step').disabled=true;
  sched();
}
function sched() {
  if (!playing) return;
  pt=setTimeout(()=>{ if (!playing) return; stepFwd(); if (cur<steps.length-1) sched(); else { playing=false; setStatus('done'); document.getElementById('btn-pause').disabled=true; } }, 900/spd);
}
function pauseAnim() {
  playing=false; clearTimeout(pt); setStatus('paused');
  document.getElementById('btn-play').disabled=false;
  document.getElementById('btn-pause').disabled=true;
  document.getElementById('btn-step').disabled=false;
}
function resetAll() {
  resetState();
  document.getElementById('jobs-row').innerHTML='';
  document.getElementById('tline').innerHTML='';
  document.getElementById('exp').innerHTML='Press <strong>Build Steps</strong> to begin the walkthrough.';
  document.getElementById('btn-step').disabled=true;
  document.getElementById('btn-play').disabled=true;
  document.getElementById('btn-pause').disabled=true;
  setStatus('idle');
}
function resetState() {
  clearTimeout(pt); playing=false; steps=[]; cur=-1;
  ['s-comp','s-asgn','s-prof','s-sched'].forEach(id=>document.getElementById(id).textContent='0');
  document.getElementById('hist-body').innerHTML='';
  updSC(); hlPseudo(-1);
}
function updSC() { document.getElementById('sc').textContent=`Step ${Math.max(0,cur+1)} / ${steps.length}`; }
function setStatus(s) {
  const el=document.getElementById('status');
  el.className='status-pill st-'+s;
  el.textContent=s[0].toUpperCase()+s.slice(1);
}
function updSpd() {
  const v=+document.getElementById('spd').value;
  spd=v/4;
  document.getElementById('spd-lbl').textContent=(v/4).toFixed(2)+'×';
}

/* ============================================================
   HISTORY
============================================================ */
function addHist(s) {
  if (!['assign','skip','done'].includes(s.type)) return;
  const body=document.getElementById('hist-body');
  const tr=document.createElement('tr'); tr.className='hrow';
  const idx=cur;
  tr.onclick=()=>jumpTo(idx);
  if (s.type==='assign')
    tr.innerHTML=`<td>${cur+1}</td><td>${s.job.name}</td><td>$${s.job.profit}</td><td>T${s.t}</td><td class="c-sched">✓ Scheduled</td>`;
  else if (s.type==='skip')
    tr.innerHTML=`<td>${cur+1}</td><td>${s.job.name}</td><td>$${s.job.profit}</td><td>—</td><td class="c-skip">✗ Skipped</td>`;
  else
    tr.innerHTML=`<td colspan="5" style="color:var(--pink);text-align:center">✓ Done — Total Profit $${s.totalP}</td>`;
  if (body.rows.length>=25) body.deleteRow(0);
  body.appendChild(tr);
  document.querySelector('.hist-wrap').scrollTop=9999;
}
function jumpTo(idx) {
  pauseAnim(); resetState();
  jobs=parseInput(); const r=runAlgo(jobs); steps=r.st;
  renderInit(r.sorted,r.maxD); cur=-1;
  for (let i=0;i<=idx;i++){cur=i;applyStep(steps[i]);}
  updSC(); setStatus('paused');
  document.getElementById('btn-step').disabled=cur>=steps.length-1;
  document.getElementById('btn-play').disabled=cur>=steps.length-1;
}

/* ============================================================
   TABS
============================================================ */
function showTab(name,el) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tcontent').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
  if (name==='cplx') { setTimeout(()=>{drawGrowth();drawCompare();},50); }
  if (name==='sort')  { buildNoSortDemo(); }
}

/* ============================================================
   PSEUDOCODE
============================================================ */
const PCODE=[
  {c:'SORT jobs by profit (descending)',t:'Sort all n jobs in O(n log n). We must process highest-profit jobs first for the greedy choice to be correct.'},
  {c:'maxD ← max deadline of all jobs',t:'Determine the largest deadline to size our slots array.'},
  {c:'slots[1 .. maxD] ← empty',t:'Initialise the schedule array — one slot per time unit, all free.'},
  {c:'FOR each job j (in sorted order):',t:'Greedy loop — visit jobs from highest to lowest profit.'},
  {c:'    FOR t ← j.deadline DOWNTO 1:',t:'Scan backwards from deadline. "Latest first" preserves early slots for tight-deadline jobs.'},
  {c:'        IF slots[t] is empty THEN',t:'O(1) array check. If free, we can assign here.'},
  {c:'            slots[t] ← j  // assign + break',t:'Assign job j to slot t. Mark slot as occupied and move to next job.'},
  {c:'        END IF',t:''},
  {c:'    // if no slot found → job skipped',t:'If the inner loop finishes with no free slot found, this job is infeasible and is silently skipped.'},
  {c:'END FOR',t:'All jobs processed. Schedule is complete.'},
  {c:'RETURN slots  // optimal schedule',t:'Return the filled slots. Total profit = sum of profits of all assigned jobs.'},
];
function buildPseudo() {
  document.getElementById('pseudo').innerHTML=PCODE.map((l,i)=>`
    <div class="pline" id="pl-${i}">
      <span class="pnum">${String(i+1).padStart(2,' ')}</span>
      <span class="pcode">${fmtP(l.c)}</span>
      ${l.t?`<div class="ptip">${l.t}</div>`:''}
    </div>`).join('');
}
function fmtP(c){
  return c.replace(/\b(SORT|FOR|IF|THEN|END|RETURN|DOWNTO|each)\b/g,'<span class="kw">$1</span>')
          .replace(/\/\/.*/g,'<span class="cm">$&</span>');
}
function hlPseudo(i){
  document.querySelectorAll('.pline').forEach(e=>e.classList.remove('active'));
  if (i>=0){const e=document.getElementById(`pl-${i}`);if(e){e.classList.add('active');e.scrollIntoView({block:'nearest',behavior:'smooth'});}}
}

/* ============================================================
   GROWTH CHARTS
============================================================ */
function drawGrowth(){
  const canvas=document.getElementById('gc'); if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth||640; canvas.height=250;
  const W=canvas.width,H=canvas.height;
  const PAD={t:20,r:70,b:40,l:55};
  const maxN=+document.getElementById('gn').value;
  document.getElementById('gn-lbl').textContent=maxN;
  const ns=[...Array(maxN)].map((_,i)=>i+1);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#122619'; ctx.fillRect(0,0,W,H);
  const showN2=document.getElementById('cb-n2').checked;
  const showNL=document.getElementById('cb-nl').checked;
  const showN=document.getElementById('cb-n').checked;
  const maxV=showN2?maxN*maxN:showNL?maxN*Math.log2(maxN):maxN;
  const xS=n=>PAD.l+(n-1)/(maxN-1)*(W-PAD.l-PAD.r);
  const yS=v=>H-PAD.b-(v/maxV)*(H-PAD.t-PAD.b);
  // Grid
  ctx.strokeStyle='#1e4028'; ctx.lineWidth=1;
  for(let i=0;i<=5;i++){
    const y=H-PAD.b-i/5*(H-PAD.t-PAD.b);
    ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();
    ctx.fillStyle='#3d5a47';ctx.font='10px Arial, sans-serif';ctx.textAlign='right';
    ctx.fillText(Math.round(maxV*i/5),PAD.l-4,y+3);
  }
  function line(vals,color,lbl){
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.5;
    ns.forEach((n,i)=>{const x=xS(n),y=yS(vals[i]);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.stroke();
    ctx.fillStyle=color;ctx.font='bold 11px Arial, sans-serif';ctx.textAlign='left';
    ctx.fillText(lbl,xS(maxN)+4,yS(vals[maxN-1])+4);
  }
  if(showN)  line(ns.map(n=>n),'#22c55e','n');
  if(showNL) line(ns.map(n=>n*Math.log2(n||1)),'#f472b6','n log n');
  if(showN2) line(ns.map(n=>n*n),'#f87171','n²');
  ctx.fillStyle='#7a9e88';ctx.font='11px Arial, sans-serif';ctx.textAlign='center';
  for(let n=1;n<=maxN;n+=Math.max(1,Math.floor(maxN/8)))
    ctx.fillText(n,xS(n),H-PAD.b+14);
  ctx.save();ctx.translate(13,H/2);ctx.rotate(-Math.PI/2);
  ctx.fillText('operations',0,0);ctx.restore();
  ctx.fillText('n (input size)',W/2,H-5);
}
function drawCompare(){
  const canvas=document.getElementById('cc');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth||640;canvas.height=210;
  const W=canvas.width,H=canvas.height;
  const PAD={t:20,r:140,b:40,l:55};
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#122619';ctx.fillRect(0,0,W,H);
  const maxN=20;const ns=[...Array(maxN)].map((_,i)=>i+1);
  const algs=[
    {lbl:'Greedy O(n²)',vals:ns.map(n=>n*n),col:'#22c55e'},
    {lbl:'Greedy O(n log n)',vals:ns.map(n=>n*Math.log2(n||1)),col:'#86efac'},
    {lbl:'DP O(n log n)',vals:ns.map(n=>n*Math.log2(n||1)*1.6),col:'#f472b6'},
    {lbl:'Brute Force 2ⁿ',vals:ns.map(n=>Math.pow(2,n)),col:'#f87171'},
  ];
  const maxV=Math.min(Math.pow(2,maxN),800000);
  const xS=n=>PAD.l+(n-1)/(maxN-1)*(W-PAD.l-PAD.r);
  const yS=v=>H-PAD.b-Math.min(v/maxV,1)*(H-PAD.t-PAD.b);
  ctx.strokeStyle='#1e4028';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=H-PAD.b-i/4*(H-PAD.t-PAD.b);ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(W-PAD.r,y);ctx.stroke();}
  algs.forEach(a=>{
    ctx.beginPath();ctx.strokeStyle=a.col;ctx.lineWidth=2;
    ns.forEach((n,i)=>{const x=xS(n),y=yS(a.vals[i]);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.stroke();
  });
  algs.forEach((a,i)=>{
    const lx=W-PAD.r+10,ly=28+i*30;
    ctx.fillStyle=a.col;ctx.fillRect(lx,ly,14,3);
    ctx.font='11px Arial, sans-serif';ctx.textAlign='left';ctx.fillText(a.lbl,lx+20,ly+4);
  });
  ctx.fillStyle='#7a9e88';ctx.font='11px Arial, sans-serif';ctx.textAlign='center';
  ctx.fillText('n (number of jobs)',W/2,H-5);
}

/* ============================================================
   SORT VIZ
============================================================ */
function buildSortSteps(preloaded){
  const arr=(preloaded||parseInput()||PRESETS[0]).map(j=>({...j}));
  sortSteps=[{arr:arr.map(x=>({...x})),ci:[-1,-1],sw:false,msg:'Original unsorted order.'}];
  const a=[...arr];
  for(let i=0;i<a.length-1;i++)
    for(let j=0;j<a.length-i-1;j++){
      sortSteps.push({arr:a.map(x=>({...x})),ci:[j,j+1],sw:false,msg:`Comparing ${a[j].name}($${a[j].profit}) vs ${a[j+1].name}($${a[j+1].profit})`});
      if(a[j].profit<a[j+1].profit){[a[j],a[j+1]]=[a[j+1],a[j]];sortSteps.push({arr:a.map(x=>({...x})),ci:[j,j+1],sw:true,msg:`Swap → ${a[j].name} moves left (higher profit)`});}
    }
  sortSteps.push({arr:a.map(x=>({...x})),ci:[-1,-1],sw:false,msg:`Sorted! Order: ${a.map(x=>x.name+'($'+x.profit+')').join(' > ')}`});
  sortCur=0; drawSortFrame(sortSteps[0]); updSortSC();
}
function updSortSC(){
  const el=document.getElementById('sort-sc'); if(!el)return;
  el.textContent=`Step ${sortCur} / ${sortSteps.length-1}`;
}
function drawSortFrame(state){
  const canvas=document.getElementById('sc-cvs');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth||640;canvas.height=190;
  const W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#122619';ctx.fillRect(0,0,W,H);
  const arr=state.arr,maxP=Math.max(...arr.map(a=>a.profit));
  const bw=Math.min(58,(W-40)/arr.length-8);
  const tot=arr.length*(bw+8)-8,sx=(W-tot)/2;
  arr.forEach((j,i)=>{
    const h=(j.profit/maxP)*140,x=sx+i*(bw+8),y=H-36-h;
    let col=state.ci.includes(i)?(state.sw?'#22c55e':'#f472b6'):'#163020';
    ctx.fillStyle=col;
    ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,bw,h,4);else ctx.rect(x,y,bw,h);ctx.fill();
    ctx.fillStyle='#f0f7f2';ctx.font='bold 14px Arial, sans-serif';ctx.textAlign='center';
    ctx.fillText(j.name,x+bw/2,y-6);
    ctx.fillStyle='#7a9e88';ctx.font='11px Arial, sans-serif';
    ctx.fillText('$'+j.profit,x+bw/2,H-22);
    ctx.fillStyle='#3d5a47';ctx.font='10px Arial, sans-serif';
    ctx.fillText('d='+j.deadline,x+bw/2,H-10);
  });
  document.getElementById('sort-box').textContent=state.msg;
}
function animSort(){
  clearInterval(sortTmr);
  if(sortCur>=sortSteps.length-1){ sortCur=0; }
  sortTmr=setInterval(()=>{
    if(sortCur>=sortSteps.length){clearInterval(sortTmr);return;}
    drawSortFrame(sortSteps[sortCur++]); updSortSC();
    if(sortCur>=sortSteps.length) clearInterval(sortTmr);
  },600/spd);
}
function sortStep(){
  clearInterval(sortTmr);
  if(sortCur<sortSteps.length){ drawSortFrame(sortSteps[sortCur++]); updSortSC(); }
}
function pauseSort(){ clearInterval(sortTmr); }
function resetSort(){ clearInterval(sortTmr); sortCur=0; if(sortSteps.length)drawSortFrame(sortSteps[0]); updSortSC(); }

/* ============================================================
   NO-SORT DEMO
============================================================ */
function quickSched(jl){
  const maxD=Math.max(...jl.map(j=>j.deadline));
  const slots=new Array(maxD+1).fill(null);
  for(const j of jl) for(let t=j.deadline;t>=1;t--) if(!slots[t]){slots[t]=j;break;}
  return {sched:slots.filter(Boolean),profit:slots.reduce((s,j)=>s+(j?j.profit:0),0)};
}
function buildNoSortDemo(){
  const el=document.getElementById('no-sort-demo');if(!el)return;
  const j=parseInput(); if(!j.length)return;
  const wSort=quickSched([...j].sort((a,b)=>b.profit-a.profit));
  const noSort=quickSched(j);
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="ibox red">
        <strong>❌ Without sort (input order):</strong><br>
        ${noSort.sched.map(j=>`${j.name}($${j.profit})`).join(', ')||'none'}<br>
        Total: <strong>$${noSort.profit}</strong>
      </div>
      <div class="ibox green">
        <strong>✅ With sort (greedy):</strong><br>
        ${wSort.sched.map(j=>`${j.name}($${j.profit})`).join(', ')||'none'}<br>
        Total: <strong>$${wSort.profit}</strong>
      </div>
    </div>
    <div class="ibox orange" style="margin-top:8px">
      Difference: <strong>$${wSort.profit-noSort.profit}</strong>. Sorting by profit is essential to maximising the schedule value.
    </div>`;
}

/* ============================================================
   SLOT SEARCH VIZ
============================================================ */
function animSearch(){
  clearInterval(searchTmr);
  const canvas=document.getElementById('ss-cvs');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth||640;canvas.height=170;
  const W=canvas.width,H=canvas.height;
  const baseSlots=[null,{name:'A',profit:100},null,null];
  const slots=[...baseSlots];
  const job={name:'C',profit:27,deadline:2};
  let t=job.deadline;
  const draw=()=>{
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#122619';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#f0f7f2';ctx.font='bold 13px Arial, sans-serif';ctx.textAlign='left';
    ctx.fillText(`Placing Job ${job.name} (deadline T${job.deadline}) — scanning backwards from T${job.deadline}`,28,22);
    for(let s=1;s<=3;s++){
      const x=30+(s-1)*120,y=40,sw=96,sh=68;
      const active=s===t;
      ctx.fillStyle=active?'rgba(244,114,182,0.15)':(slots[s]?'rgba(34,197,94,0.1)':'#163020');
      ctx.strokeStyle=active?'#f472b6':(slots[s]?'#22c55e':'#1e4028');
      ctx.lineWidth=2;
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,sw,sh,6);else ctx.rect(x,y,sw,sh);ctx.fill();ctx.stroke();
      ctx.fillStyle='#f0f7f2';ctx.font='bold 16px Arial, sans-serif';ctx.textAlign='center';
      ctx.fillText(slots[s]?slots[s].name:'Free',x+sw/2,y+30);
      ctx.fillStyle='#3d5a47';ctx.font='10px Arial, sans-serif';
      ctx.fillText('T'+s,x+sw/2,y+54);
    }
    if(t>=1&&t<=3){
      const ax=30+(t-1)*120+48;
      ctx.fillStyle='#f472b6';ctx.font='18px Arial, sans-serif';ctx.textAlign='center';
      ctx.fillText('↑',ax,126);
      ctx.fillStyle='#f472b6';ctx.font='11px Arial, sans-serif';
      ctx.fillText('T'+t,ax,142);
    }
  };
  draw();
  searchTmr=setInterval(()=>{
    if(!slots[t]){
      document.getElementById('search-box').innerHTML=`Slot T${t} is <span style="color:var(--green-hi)">FREE</span>! Job ${job.name} assigned to T${t}. ✓`;
      slots[t]=job;draw();clearInterval(searchTmr);return;
    }
    document.getElementById('search-box').innerHTML=`Slot T${t} occupied by <span style="color:var(--red)">Job ${slots[t].name}</span>. Try T${t-1}...`;
    t--;
    if(t<1){document.getElementById('search-box').innerHTML=`<span style="color:var(--red)">No slot found</span> — Job ${job.name} skipped.`;clearInterval(searchTmr);return;}
    draw();
  },1000);
}

/* ============================================================
   GREEDY CHOICES
============================================================ */
function buildGreedyChoices(){
  const el=document.getElementById('gchoices');if(!el)return;
  const sorted=[...PRESETS[0]].sort((a,b)=>b.profit-a.profit);
  const maxD=Math.max(...sorted.map(j=>j.deadline));
  const slots=new Array(maxD+1).fill(null);
  let html='';
  for(const j of sorted){
    let placed=false;
    for(let t=j.deadline;t>=1;t--){
      if(!slots[t]){slots[t]=j;
        html+=`<div class="gchoice"><span class="gname">${j.name}</span><span class="ginfo">profit $${j.profit} · deadline T${j.deadline}</span><span class="garrow">→</span><span class="ginfo">Latest free: T${t}</span><span class="gtag gt-ok">✓ T${t}</span></div>`;
        placed=true;break;
      }
    }
    if(!placed)
      html+=`<div class="gchoice"><span class="gname">${j.name}</span><span class="ginfo">profit $${j.profit} · deadline T${j.deadline}</span><span class="garrow">→</span><span class="ginfo">No slot ≤ T${j.deadline}</span><span class="gtag gt-bad">✗ Skipped</span></div>`;
  }
  const tot=slots.reduce((s,j)=>s+(j?j.profit:0),0);
  html+=`<div style="padding-top:10px;font-family:var(--mono);font-size:0.75rem;color:var(--pink)">Optimal Total Profit = $${tot}</div>`;
  el.innerHTML=html;
}

/* ============================================================
   COUNTEREXAMPLE
============================================================ */
function buildCounterEx(){
  const el=document.getElementById('counter-ex');if(!el)return;
  const byDL=[...PRESETS[0]].sort((a,b)=>a.deadline-b.deadline||b.profit-a.profit);
  const maxD=Math.max(...PRESETS[0].map(j=>j.deadline));
  const slots=new Array(maxD+1).fill(null);
  let html=`<div class="gchoice-wrap"><div style="font-family:var(--mono);font-size:0.68rem;color:var(--orange);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">⚠ Earliest Deadline First order: ${byDL.map(j=>j.name).join(' → ')}</div>`;
  for(const j of byDL){
    let placed=false;
    for(let t=j.deadline;t>=1;t--){
      if(!slots[t]){slots[t]=j;
        html+=`<div class="gchoice"><span class="gname">${j.name}</span><span class="ginfo">deadline T${j.deadline} · profit $${j.profit}</span><span class="garrow">→</span><span class="gtag gt-warn">Placed T${t}</span></div>`;
        placed=true;break;
      }
    }
    if(!placed)
      html+=`<div class="gchoice"><span class="gname">${j.name}</span><span class="ginfo">deadline T${j.deadline} · profit $${j.profit}</span><span class="garrow">→</span><span class="gtag gt-bad">✗ Skipped</span></div>`;
  }
  const tot=slots.reduce((s,j)=>s+(j?j.profit:0),0);
  html+=`<div style="padding-top:10px;font-family:var(--mono);font-size:0.75rem;color:var(--red)">EDF Total Profit = $${tot} &nbsp;vs&nbsp; Greedy Optimal $142 &nbsp;→&nbsp; Loss of $${142-tot}</div></div>`;
  el.innerHTML=html;
}

/* ============================================================
   WORKED EXAMPLE
============================================================ */
function buildWorked(){
  const el=document.getElementById('worked');if(!el)return;
  const ws=[
    {n:1,t:'<strong>Sort by profit:</strong> A($100) → C($27) → D($25) → B($19) → E($15). Max deadline = 3. Create slots T1, T2, T3.'},
    {n:2,t:'<strong>Job A</strong> (profit $100, deadline T2): Check T2 → free! Assign A to T2. Slots: [T1=_, T2=A, T3=_]'},
    {n:3,t:'<strong>Job C</strong> (profit $27, deadline T2): Check T2 → occupied. Check T1 → free! Assign C to T1. Slots: [T1=C, T2=A, T3=_]'},
    {n:4,t:'<strong>Job D</strong> (profit $25, deadline T1): Check T1 → occupied. No more slots. Skip D.'},
    {n:5,t:'<strong>Job B</strong> (profit $19, deadline T1): Check T1 → occupied. Skip B.'},
    {n:6,t:'<strong>Job E</strong> (profit $15, deadline T3): Check T3 → free! Assign E to T3. Slots: [T1=C, T2=A, T3=E]'},
    {n:7,t:'<strong>Result:</strong> {C at T1, A at T2, E at T3}. Total = $27 + $100 + $15 = <strong style="color:var(--green-hi)">$142</strong>. Optimal! ✓'},
  ];
  el.innerHTML=ws.map(s=>`<div class="ws"><div class="ws-n">${s.n}</div><p>${s.t}</p></div>`).join('');
}

/* ============================================================
   COLLAPSIBLE
============================================================ */
function togColl(id){
  document.getElementById('cb-'+id).classList.toggle('open');
  document.getElementById('arr-'+id).classList.toggle('open');
}

/* ============================================================
   RESIZE
============================================================ */
window.addEventListener('resize',()=>{ drawGrowth(); drawCompare(); });
