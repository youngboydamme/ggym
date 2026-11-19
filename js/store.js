// GGym — lưu trữ trên máy, PR, bổ sung thư viện cho dữ liệu cũ
/* ---------- storage ---------- */
/* storage: giữ nguyên khoá 'sota.*' từ trước khi đổi tên app để không mất dữ liệu.
   trước đây có nhiều hồ sơ / máy; nay 1 email = 1 hồ sơ. Vẫn mở đúng khoá của hồ sơ đang dùng lần cuối
   (thường là 'sota.v1') để không mất dữ liệu; dữ liệu hồ sơ cũ khác vẫn nằm nguyên trong máy */
const PKEY='sota.profiles',keyOf=id=>id==='main'?'sota.v1':'sota.v1.'+id;
let P=null,D=null,canStore=true;
try{P=JSON.parse(localStorage.getItem(PKEY)||'null')}catch(e){}
if(!P||!Array.isArray(P.list)||!P.list.length)P={list:[{id:'main',name:'Tôi',color:0}],cur:'main'};
if(!P.list.some(x=>x.id===P.cur))P.cur=P.list[0].id;
let KEY=keyOf(P.cur);
try{D=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){canStore=false}
const fix=x=>{x.del=x.del||{};x.exercises=x.exercises||[];x.routines=x.routines||[];x.workouts=x.workouts||[];x.body=x.body||[];x.restBy=x.restBy||{};
 x.settings=Object.assign({rest:90,sound:true,wake:true,hintOff:false},x.settings||{});x.workouts.sort((a,b)=>b.start-a.start);return x};
const lsHad=!!(D&&Array.isArray(D.workouts));
D=lsHad?fix(D):seed();
let editSeq=0;
/* IndexedDB là bản chính trên máy: chứa được nhiều hơn localStorage (~5 MB) rất nhiều.
   localStorage vẫn được ghi song song làm bản dự phòng khi còn chỗ. Mỗi lần lưu đóng dấu D.sync.sv;
   lúc mở app (storeReady) lấy bản nào lưu sau cùng, nên dữ liệu cũ chỉ có trong localStorage được chuyển sang tự động */
const IDBN='ggym',IDBS='kv';
let idbP=null,idbOk=null,lsOk=true,idbT=0,idbTxt=null,storeWarned=false,persisted=false,svLast=(D.sync&&D.sync.sv)||0;
function idb(){if(!idbP)idbP=new Promise(res=>{try{const q=indexedDB.open(IDBN,1);q.onupgradeneeded=()=>q.result.createObjectStore(IDBS);
 q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)}catch(e){res(null)}});return idbP}
async function idbGet(k){const db=await idb();if(!db)return undefined;
 return new Promise(res=>{try{const r=db.transaction(IDBS).objectStore(IDBS).get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>res(undefined)}catch(e){res(undefined)}})}
async function idbPut(k,v){const db=await idb();if(!db)return false;
 return new Promise(res=>{try{const t=db.transaction(IDBS,'readwrite');t.objectStore(IDBS).put(v,k);t.oncomplete=()=>res(true);t.onerror=t.onabort=()=>res(false)}catch(e){res(false)}})}
function storeWarn(){canStore=lsOk||idbOk!==false;if(!canStore&&!storeWarned){storeWarned=true;toast('Không lưu được vào máy — hãy xuất bản sao lưu')}if(canStore)storeWarned=false}
async function idbFlush(){clearTimeout(idbT);const txt=idbTxt;if(txt==null)return;idbTxt=null;
 const ok=await idbPut(KEY,txt);if(idbTxt==null)idbOk=ok;storeWarn()}
/* localStorage ghi ngay (nhanh, đồng bộ); IndexedDB gom các lần lưu liên tiếp, ghi sau 250 ms và ngay khi app bị ẩn / đóng */
/* dấu lưu luôn tăng (kể cả khi đồng hồ máy bị chỉnh lùi), để bản dự phòng cũ không bao giờ thắng bản mới */
function saveRaw(){D.sync=D.sync||{};svLast=Math.max(Date.now(),svLast+1,(D.sync.sv||0)+1);D.sync.sv=svLast;const txt=JSON.stringify(D);
 try{localStorage.setItem(KEY,txt);lsOk=true}catch(e){lsOk=false}
 idbTxt=txt;clearTimeout(idbT);idbT=setTimeout(idbFlush,250);storeWarn()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')idbFlush()});
window.addEventListener('pagehide',()=>{idbFlush()});
/* gọi 1 lần trước khi vẽ app: đọc bản IndexedDB, so với bản localStorage vừa nạp ở trên */
async function storeReady(){
 let txt;try{txt=await Promise.race([idbGet(KEY),new Promise(r=>setTimeout(()=>r(undefined),1500))])}catch(e){}
 let x=null;try{x=typeof txt==='string'?JSON.parse(txt):null}catch(e){}
 const a=(x&&x.sync&&x.sync.sv)||0,b=(D.sync&&D.sync.sv)||0;svLast=Math.max(svLast,a,b);
 if(x&&Array.isArray(x.workouts)&&(a>b||!lsHad)){D=fix(x);EXM=null;idbOk=true}
 else if(lsHad&&(!x||b>a)){idbTxt=JSON.stringify(D);await idbFlush()}
 else if(x)idbOk=true;
 try{if(navigator.storage&&navigator.storage.persisted)persisted=await navigator.storage.persisted()}catch(e){}}
function save(){D.mt=Date.now();D.sync=D.sync||{};D.sync.dirty=true;editSeq++;saveRaw();scheduleSync()}
const tomb=id=>{(D.del||(D.del={}))[id]=Date.now()};
let EXM=null;
const exOf=id=>{if(!EXM)EXM=new Map(D.exercises.map(e=>[e.id,e]));return EXM.get(id)||{id,name:'(Bài tập đã xoá)',group:'Khác'}};
const tyOf=e=>{const t=(e&&e.ty)||TY0[e&&e.id];return TYS[t]?t:'wr'};
const tyId=id=>tyOf(exOf(id));
const emp=v=>v==null||v==='';
/* thời gian: chuỗi "m:ss" / "h:mm:ss" ⇄ số giây */
const parseDur=v=>{if(typeof v==='number')return Math.max(0,Math.round(v));const s=String(v==null?'':v).trim();if(!s)return 0;
 return Math.max(0,Math.round(s.split(':').reduce((a,x)=>a*60+num(x),0)))};
/* gõ số kiểu đồng hồ lò vi sóng: 4 5 → 0:45, 1 3 0 → 1:30, 3 0 0 0 → 30:00 */
const typeDur=v=>{const d=String(v||'').replace(/\D/g,'').replace(/^0+/,'').slice(-6);if(!d)return '';const x=d.padStart(3,'0'),ss=x.slice(-2),rest=x.slice(0,-2);
 return rest.length>2?+rest.slice(0,-2)+':'+rest.slice(-2)+':'+ss:+rest+':'+ss};
/* giá trị đã lưu (số) → chuỗi hiển thị trong ô nhập, và ngược lại */
const fv=(k,v)=>emp(v)?'':k==='tm'?(+v?fmtClock(+v):''):typeof v==='number'?fx(v):String(v);
const fparse=(k,v)=>k==='tm'?parseDur(v):k==='r'?Math.round(num(v)):Math.round(num(v)*100)/100;
const fmtPace=s=>fmtClock(s)+'/km';
/* 1 set → chữ, dựa vào trường có trong set nên dữ liệu cũ vẫn hiện đúng khi đổi cách ghi */
const setTxt=s=>{const w=+s.w||0,r=+s.r||0,km=+s.km||0,tm=+s.tm||0;
 if(km||tm)return [w?fx(w)+' kg':'',km?fx(km)+' km':'',tm?fmtClock(tm):''].filter(Boolean).join(' · ');
 return w?fx(w)+' kg × '+r:r+' reps'};
const setOk=(s,ty)=>ty==='wr'||ty==='r'?num(s.r)>0:ty==='dt'?num(s.km)>0||parseDur(s.tm)>0:parseDur(s.tm)>0;
const needMsg=ty=>ty==='wr'||ty==='r'?'Nhập số reps trước đã':ty==='dt'?'Nhập quãng đường hoặc thời gian':'Nhập thời gian trước đã';

/* ---------- stats ---------- */
function exHistory(exId,excludeId,before){const out=[];for(const w of D.workouts){if(w.id===excludeId||(before&&w.start>=before))continue;
 let sets=null;for(const e of w.exercises)if(e.exId===exId)sets=(sets||[]).concat(e.sets);if(sets)out.push({w,sets})}return out}
function best(sets){let mw=0,e1=0,sv=0,tv=0,mr=0,tr=0,bs=null,mt=0,tt=0,mk=0,tk=0,pc=0,bt=null;
 for(const s of sets){if(s.t==='w')continue;const w=+s.w||0,r=+s.r||0,tm=+s.tm||0,km=+s.km||0;
  /* set thời gian / quãng đường */
  if(tm||km){mw=Math.max(mw,w);tt+=tm;tk+=km;if(km&&tm){const p=tm/km;if(!pc||p<pc)pc=p}
   if(!bt||(km?km>mk||km===mk&&tm>mt:tm>mt||tm===mt&&w>(+bt.w||0)))bt=s;mt=Math.max(mt,tm);mk=Math.max(mk,km);continue}
  if(!r)continue;
  mw=Math.max(mw,w);const e=epley(w,r);if(!bs||e>e1){bs=s;e1=e}sv=Math.max(sv,w*r);tv+=w*r;mr=Math.max(mr,r);tr+=r}
 return{mw,e1,sv,tv,mr,tr,bs,mt,tt,mk,tk,pc,bt,top:bs||bt}}
const wVol=w=>w.exercises.reduce((a,e)=>a+best(e.sets).tv,0);
const wSets=w=>w.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.t!=='w').length,0);
function computePRs(w){const prs=[];for(const e of w.exercises){const prev=exHistory(e.exId,w.id,w.start);if(!prev.length)continue;
 const p=best(prev.flatMap(h=>h.sets)),n=best(e.sets);
 if(n.mw>p.mw)prs.push({exId:e.exId,k:'Tạ nặng nhất',v:fx(n.mw)+' kg'});
 if(n.e1>p.e1+0.05&&n.mw>0)prs.push({exId:e.exId,k:'1RM ước tính',v:fx(r1(n.e1))+' kg'});
 if(n.sv>p.sv)prs.push({exId:e.exId,k:'Set volume tốt nhất',v:fmtNum(n.sv)+' kg'});
 if(n.mw===0&&p.mw===0&&n.mr>p.mr)prs.push({exId:e.exId,k:'Nhiều reps nhất',v:n.mr+' reps'});
 if(n.mt>p.mt&&p.mt>0)prs.push({exId:e.exId,k:'Thời gian lâu nhất',v:fmtClock(n.mt)});
 if(n.mk>p.mk&&p.mk>0)prs.push({exId:e.exId,k:'Quãng đường xa nhất',v:fx(n.mk)+' km'});
 if(n.pc&&p.pc&&n.pc<p.pc-.5)prs.push({exId:e.exId,k:'Pace nhanh nhất',v:fmtPace(n.pc)});}
 return prs}

/* ---------- thư viện: bổ sung bài mới cho dữ liệu cũ ---------- */
function ensureLib(){const have=new Set(D.exercises.map(e=>e.id)),del=D.del||{},byN=new Map(),t=Date.now();let add=0,merged=0;
 for(const e of D.exercises)if(e.custom)byN.set(norm(e.name),e);
 for(const [id,name,group,ref] of LIB){if(have.has(id)||del[id])continue;const x={id,name,group};if(ref)x.ref=ref;D.exercises.push(x);have.add(id);add++;
  const c=byN.get(norm(name));if(!c)continue;
  if(c.wg){x.wg=c.wg;x.u=t}else if(c.ref&&!x.ref){x.ref=c.ref;x.u=t}
  for(const w of D.workouts){let ch=0;for(const e of w.exercises)if(e.exId===c.id){e.exId=id;ch=1}if(ch)w.u=t}
  for(const r of D.routines){let ch=0;for(const it of r.items)if(it.exId===c.id){it.exId=id;ch=1}if(ch)r.u=t}
  if(D.active)for(const e of D.active.exercises)if(e.exId===c.id)e.exId=id;
  if(D.restBy[c.id]!=null){if(D.restBy[id]==null)D.restBy[id]=D.restBy[c.id];delete D.restBy[c.id]}
  tomb(c.id);D.exercises=D.exercises.filter(e=>e!==c);byN.delete(norm(name));merged++}
 if(add){EXM=null;if(merged)for(const w of D.workouts)w.prs=computePRs(w);save()}
 return{add,merged}}

