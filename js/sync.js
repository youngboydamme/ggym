// GGym — đồng bộ Supabase
/* ---------- cloud sync (Supabase) ----------
   mỗi mục 1 dòng trong bảng ggym_items (xem syncItems); Supabase chưa có bảng đó thì dùng cách cũ:
   1 dòng / tài khoản trong ggym_docs (syncDoc). App vẫn offline-first: lưu máy trước, có mạng thì gộp
   (theo id + thời điểm sửa, có danh sách đã xoá) rồi đẩy lên. */
const CLOUD0={url:'https://vawfperiksgzgdovbqjt.supabase.co',key:'sb_publishable_hK962oRny9XZbugoqath0Q_xnXqL0Dr'}; // điền URL + publishable key để ai cài app cũng có sẵn cấu hình
const cloudCfg=()=>{let c=null;try{c=JSON.parse(localStorage.getItem('ggym.cloud')||'null')}catch(e){}return(c&&c.url&&c.key)?c:(CLOUD0.url&&CLOUD0.key?CLOUD0:null)};
const AKEY=()=>'ggym.auth.'+P.cur;
const getAuth=()=>{try{return JSON.parse(localStorage.getItem(AKEY())||'null')}catch(e){return null}};
const setAuth=a=>{try{if(a)localStorage.setItem(AKEY(),JSON.stringify(a));else localStorage.removeItem(AKEY())}catch(e){}};
const stripD=x=>{const o=Object.assign({},x);delete o.sync;return o};
async function sbFetch(path,opt={},auth=true){const c=cloudCfg();if(!c)throw new Error('Chưa cấu hình Supabase');
 const h=Object.assign({apikey:c.key,'Content-Type':'application/json'},opt.headers||{});
 h.Authorization='Bearer '+(auth?await token():c.key);
 let r;try{r=await fetch(c.url.replace(/\/+$/,'')+path,Object.assign({},opt,{headers:h}))}catch(e){throw new Error('Không kết nối được Supabase')}
 const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch(e){}
 if(!r.ok){const e=new Error((j&&(j.msg||j.message||j.error_description||j.error))||('HTTP '+r.status));e.status=r.status;e.code=j&&(j.error_code||j.code);throw e}return j}
/* 1 email = 1 hồ sơ: nếu dữ liệu trên máy đang là của email khác thì thay bằng dữ liệu của email vừa đăng nhập
   (dữ liệu của email kia vẫn còn trên server). Dữ liệu chưa từng đăng nhập thì được gộp vào tài khoản như trước */
async function adopt(j){const nu=j.user&&j.user.id,sy=D.sync||{};
 if(sy.uid&&nu&&sy.uid!==nu){
  if(sy.dirty&&!(await new Promise(res=>confirmSheet(`Máy còn thay đổi chưa đồng bộ của <b>${esc(sy.email||'tài khoản trước')}</b>. Đăng nhập email khác sẽ bỏ các thay đổi đó. Tiếp tục?`,'Bỏ và đăng nhập',()=>res(true)))))return false;
  const h=D.settings.hintOff;D=seed();D.settings.hintOff=h;EXM=null;ensureLib();
  S=Object.assign(S,{tab:'home',view:null,exId:null,draft:null,pick:null,cf:null,hm:null});saveRaw();render()}
 saveSession(j);return true}
function saveSession(j){const a={at:j.access_token,rt:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,uid:j.user&&j.user.id,email:j.user&&j.user.email};setAuth(a);return a}
async function token(){let a=getAuth();if(!a)throw Object.assign(new Error('Chưa đăng nhập'),{status:401});
 if(Date.now()>a.exp-60000){let j;try{j=await sbFetch('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:a.rt})},false)}
  catch(e){if(e.status===400||e.status===401){setAuth(null);throw new Error('Phiên đăng nhập đã hết, hãy đăng nhập lại')}throw e}
  a=saveSession(j)}return a.at}
const authMsg=e=>{const m=String(e&&e.message||'');
 return /invalid login/i.test(m)?'Sai email hoặc mật khẩu':/not confirmed/i.test(m)?'Email chưa được xác nhận — mở hộp thư để xác nhận':/already registered|already exists/i.test(m)?'Email này đã có tài khoản — bấm Đăng nhập':/password/i.test(m)&&/6|short|weak/i.test(m)?'Mật khẩu cần ít nhất 6 ký tự':/rate limit|too many/i.test(m)?'Thử lại sau ít phút (giới hạn gửi email)':m}
function mergeDocs(L,R){const del=Object.assign({},R.del||{},L.del||{});const lNew=(L.mt||0)>=(R.mt||0);
 const out=Object.assign({},lNew?R:L,lNew?L:R);
 for(const k of ['workouts','body','exercises','routines']){const m=new Map();for(const x of (R[k]||[]))m.set(x.id,x);
  for(const x of (L[k]||[])){const y=m.get(x.id);if(!y||(x.u||0)>=(y.u||0))m.set(x.id,x)}
  out[k]=[...m.values()].filter(x=>!del[x.id])}
 if(L.active&&!R.active&&!lNew&&L.active.start>(R.mt||0))out.active=L.active; // buổi đang tập trên máy này mới bắt đầu sau lần sửa cuối ở máy khác
 out.del=del;out.mt=Math.max(L.mt||0,R.mt||0);delete out.sync;return fix(out)}
const isSeedRoutine=r=>!r.u&&R0.some(([n,,items])=>n===r.name&&JSON.stringify(items.map(([exId,sets])=>({exId,sets})))===JSON.stringify((r.items||[]).map(i=>({exId:i.exId,sets:i.sets}))));
const sig=x=>['workouts','body','exercises','routines'].map(k=>(x[k]||[]).map(i=>i.id+':'+(i.u||0)).sort().join(',')).join('|')+'|'+Object.keys(x.del||{}).length+'|'+(x.mt||0);
const KINDS=['workouts','body','exercises','routines'];
let syncing=false,syncT=null,itemsMode=null;
function scheduleSync(ms){clearTimeout(syncT);if(cloudCfg()&&getAuth())syncT=setTimeout(()=>sync(),ms==null?4000:ms)}
function syncText(){const sy=D.sync||{};if(S.syncErr)return 'Lỗi: '+esc(S.syncErr);if(syncing)return 'Đang đồng bộ…';if(!sy.at)return 'Chưa đồng bộ lần nào';
 return 'Đồng bộ lần cuối '+hm(sy.at)+', '+dm(sy.at)+(sy.dirty?' · còn thay đổi chờ gửi':'')}
function setSyncSt(){const el=$('#sync-st');if(el)el.innerHTML=syncText()}
/* Supabase đã có bảng ggym_items chưa (đã chạy file SQL mới chưa). Chưa có thì dùng cách cũ ggym_docs,
   nên đưa app lên trước khi chạy SQL vẫn an toàn */
async function hasItems(){if(itemsMode!=null)return itemsMode;
 try{await sbFetch('/rest/v1/ggym_items?select=id&limit=1');itemsMode=true}
 catch(e){if(e.status===404||e.code==='PGRST205'||e.code==='42P01')itemsMode=false;else throw e}
 return itemsMode}
/* cách cũ: cả dữ liệu là 1 dòng jsonb, ghi đè có kiểm tra rev. Trả về true nếu có dữ liệu mới tải về, null nếu đã đổi tài khoản */
async function syncDoc(uid,pid){let pulled=false;
 for(let i=0;i<4;i++){
  const rows=await sbFetch('/rest/v1/ggym_docs?select=doc,rev&user_id=eq.'+uid);if(P.cur!==pid)return null;
  const row=rows&&rows[0],sy=D.sync||{},first=!sy.rev||sy.uid!==uid,seq=editSeq;
  if(!row){const r=await sbFetch('/rest/v1/ggym_docs?select=rev',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:uid,doc:stripD(D),rev:1})}).catch(e=>{if(e.status===409)return null;throw e});
   if(P.cur!==pid)return null;if(!r)continue;D.sync={uid,rev:1,at:Date.now(),dirty:editSeq!==seq};saveRaw();return pulled}
  let push=!!sy.dirty&&!first;
  if(first||row.rev!==sy.rev){const R=fix(row.doc||{});
   if(first&&R.routines.length)D.routines=D.routines.filter(r=>!isSeedRoutine(r)); // bỏ routine mẫu chưa sửa để không bị trùng
   D=mergeDocs(D,R);ensureLib();D.sync={uid,rev:row.rev,at:sy.at,dirty:!!sy.dirty};EXM=null;pulled=true;push=sig(D)!==sig(R)}
  if(!push){D.sync=Object.assign({},D.sync,{uid,rev:row.rev,at:Date.now(),dirty:editSeq!==seq});saveRaw();return pulled}
  const r=await sbFetch('/rest/v1/ggym_docs?user_id=eq.'+uid+'&rev=eq.'+row.rev+'&select=rev',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({doc:stripD(D),rev:row.rev+1})});
  if(P.cur!==pid)return null;if(!r||!r.length){saveRaw();continue}
  D.sync={uid,rev:row.rev+1,at:Date.now(),dirty:editSeq!==seq};saveRaw();return pulled}
 throw new Error('Dữ liệu đang thay đổi ở máy khác, thử lại sau')}
/* cách mới: mỗi mục 1 dòng trong ggym_items. Mỗi lần đồng bộ:
   1. gộp dữ liệu dạng cũ trong ggym_docs nếu nó đổi (lần đầu chuyển sang, hoặc máy chưa cập nhật app vừa ghi vào)
   2. tải các dòng có updated_at mới hơn mốc lần trước (lùi 2 phút cho chắc), gộp theo id + u như mergeDocs
   3. gửi các mục sửa sau lần gửi trước (u > pt), bỏ qua mục server đã có bản bằng hoặc mới hơn
   D.sync: ic = mốc tải (giờ server), pt = mốc gửi (giờ máy), drev = rev ggym_docs đã gộp, xs = id bài tập server đã có */
async function syncItems(uid,pid){
 const sy=D.sync||{},acct=sy.uid===uid,seq=editSeq,t0=Date.now(),before=sig(D);
 const R={workouts:[],body:[],exercises:[],routines:[],del:{}},srv=new Map();let ic=acct?sy.ic||null:null,fromDoc=null,n=0;
 const dr=await sbFetch('/rest/v1/ggym_docs?select=rev&user_id=eq.'+uid);if(P.cur!==pid)return null;
 const drev=dr&&dr[0]?dr[0].rev:0;
 if(drev&&!(acct&&sy.drev===drev)){const rows=await sbFetch('/rest/v1/ggym_docs?select=doc&user_id=eq.'+uid);if(P.cur!==pid)return null;if(rows&&rows[0])fromDoc=fix(rows[0].doc||{})}
 const since=ic?new Date(Date.parse(ic)-120000).toISOString():null;
 for(let off=0;;off+=1000){
  const rows=await sbFetch('/rest/v1/ggym_items?select=kind,id,data,u,updated_at&user_id=eq.'+uid+(since?'&updated_at=gt.'+encodeURIComponent(since):'')+'&order=updated_at.asc,kind.asc,id.asc&limit=1000&offset='+off);
  if(P.cur!==pid)return null;
  for(const r of rows||[]){n++;if(!ic||Date.parse(r.updated_at)>Date.parse(ic))ic=r.updated_at;srv.set(r.kind+'|'+r.id,+r.u||0);
   if(r.kind==='del')R.del[r.id]=Math.max(R.del[r.id]||0,+r.u||0);
   else if(r.kind==='meta'){if(r.data)Object.assign(R,{settings:r.data.settings,restBy:r.data.restBy,active:r.data.active||null,mt:+r.data.mt||0})}
   else if(R[r.kind]&&r.data)R[r.kind].push(r.data)}
  if(!rows||rows.length<1000)break}
 if(!acct&&(R.routines.length||(fromDoc&&fromDoc.routines.length)))D.routines=D.routines.filter(r=>!isSeedRoutine(r)); // bỏ routine mẫu chưa sửa để không bị trùng
 const keep=D.sync;
 if(fromDoc)D=mergeDocs(D,fromDoc);
 if(n)D=mergeDocs(D,R);
 if(fromDoc||n){D.sync=keep;EXM=null;ensureLib()}
 const pulled=sig(D)!==before;
 /* gửi */
 const pt=acct?+sy.pt||0:0,xs=new Set(acct?sy.xs||[]:[]),out=[];
 const add=(kind,id,data,u)=>{u=Math.round(+u||0);const s=srv.get(kind+'|'+id);if(s!=null&&s>=u)return;out.push({user_id:uid,kind,id:String(id),data,u})};
 for(const k of KINDS)for(const x of D[k]){if(D.del[x.id])continue;if(!pt||(+x.u||0)>pt||(k==='exercises'&&!xs.has(x.id)))add(k,x.id,x,x.u)}
 for(const id in D.del){const t=D.del[id];if(!pt||t>pt)add('del',id,null,t)}
 if(!pt||(D.mt||0)>pt)add('meta','doc',{settings:D.settings,restBy:D.restBy,active:D.active||null,mt:D.mt||0},D.mt||0);
 for(let i=0;i<out.length;i+=500){
  await sbFetch('/rest/v1/ggym_items?on_conflict=user_id,kind,id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(out.slice(i,i+500))});
  if(P.cur!==pid)return null}
 D.sync=Object.assign({},D.sync,{uid,ic,pt:t0,drev:drev||0,xs:D.exercises.map(e=>e.id),sent:out.length,got:n,at:Date.now(),dirty:editSeq!==seq});delete D.sync.rev;
 saveRaw();return pulled}
async function sync(manual){
 if(syncing||!cloudCfg()||!getAuth())return;
 if(navigator.onLine===false){if(manual)toast('Đang offline — sẽ đồng bộ khi có mạng');return}
 syncing=true;S.syncErr='';setSyncSt();const pid=P.cur;
 try{await token();const uid=getAuth().uid;
  const pulled=(await hasItems())?await syncItems(uid,pid):await syncDoc(uid,pid);
  if(pulled==null)return; // đã đổi tài khoản giữa chừng
  if(pulled){const ae=document.activeElement;if(!(ae&&ae.matches&&ae.matches('input')))render()}
  if(manual)toast('Đã đồng bộ')}
 catch(e){S.syncErr=e.message;if(manual)toast('Không đồng bộ được: '+e.message)}
 finally{syncing=false;setSyncSt();if(P.cur===pid&&D.sync&&D.sync.dirty&&getAuth())scheduleSync(15000)}}
function cloudHtml(){const c=cloudCfg(),a=getAuth();
 if(!c||S.cfgEdit)return `<p class="lbl">Đồng bộ đám mây (Supabase)</p><p class="mute small" style="margin:0 0 8px">Supabase → Project Settings → API: dán Project URL và Publishable key (hoặc anon key).</p><input id="cf-url" class="field" value="${c?esc(c.url):''}" placeholder="https://xxxx.supabase.co" autocomplete="off" inputmode="url"><input id="cf-key" class="field" style="margin-top:8px" value="${c?esc(c.key):''}" placeholder="sb_publishable_… hoặc anon key" autocomplete="off"><button class="btn block" data-act="cloud-cfg">Lưu cấu hình</button>`;
 if(!a)return `<p class="lbl">Đồng bộ đám mây</p><p class="mute small" style="margin:0 0 8px">Đăng nhập để tự sao lưu và dùng trên nhiều máy. Mỗi email là một hồ sơ riêng.</p>${D.sync&&D.sync.email?`<p class="mute small" style="margin:0 0 8px">Dữ liệu trên máy là của <b>${esc(D.sync.email)}</b>. Đăng nhập email khác thì máy sẽ tải dữ liệu của email đó thay vào.</p>`:''}<input id="au-email" class="field" type="email" placeholder="Email" autocomplete="username" inputmode="email" value="${esc((D.sync&&D.sync.email)||'')}"><input id="au-pass" class="field" style="margin-top:8px" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autocomplete="current-password"><div class="row2"><button class="btn red" data-act="au-in">Đăng nhập</button><button class="btn" data-act="au-up">Tạo tài khoản</button></div><button class="link" data-act="cloud-edit">Đổi cấu hình Supabase</button>`;
 return `<p class="lbl">Đồng bộ đám mây</p><div class="card" style="margin-top:0"><b>${esc(a.email||'')}</b><p class="mute small" style="margin:2px 0 0" id="sync-st">${syncText()}</p></div><div class="row2"><button class="btn" data-act="sync-now">Đồng bộ ngay</button><button class="btn danger" data-act="au-out">Đăng xuất</button></div>`}

