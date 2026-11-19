// GGym — đồng bộ Supabase
/* ---------- cloud sync (Supabase) ----------
   1 dòng / tài khoản trong bảng ggym_docs (doc jsonb + rev). App vẫn offline-first:
   lưu máy trước, có mạng thì gộp (theo id + thời điểm sửa, có danh sách đã xoá) rồi đẩy lên. */
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
let syncing=false,syncT=null;
function scheduleSync(ms){clearTimeout(syncT);if(cloudCfg()&&getAuth())syncT=setTimeout(()=>sync(),ms==null?4000:ms)}
function syncText(){const sy=D.sync||{};if(S.syncErr)return 'Lỗi: '+esc(S.syncErr);if(syncing)return 'Đang đồng bộ…';if(!sy.at)return 'Chưa đồng bộ lần nào';
 return 'Đồng bộ lần cuối '+hm(sy.at)+', '+dm(sy.at)+(sy.dirty?' · còn thay đổi chờ gửi':'')}
function setSyncSt(){const el=$('#sync-st');if(el)el.innerHTML=syncText()}
async function sync(manual){
 if(syncing||!cloudCfg()||!getAuth())return;
 if(navigator.onLine===false){if(manual)toast('Đang offline — sẽ đồng bộ khi có mạng');return}
 syncing=true;S.syncErr='';setSyncSt();const pid=P.cur;let pulled=false,ok=false;
 try{await token();const uid=getAuth().uid;
  for(let i=0;i<4;i++){
   const rows=await sbFetch('/rest/v1/ggym_docs?select=doc,rev&user_id=eq.'+uid);if(P.cur!==pid)return;
   const row=rows&&rows[0],sy=D.sync||{},first=!sy.rev||sy.uid!==uid,seq=editSeq;
   if(!row){const r=await sbFetch('/rest/v1/ggym_docs?select=rev',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:uid,doc:stripD(D),rev:1})}).catch(e=>{if(e.status===409)return null;throw e});
    if(P.cur!==pid)return;if(!r)continue;D.sync={uid,rev:1,at:Date.now(),dirty:editSeq!==seq};saveRaw();ok=true;break}
   let push=!!sy.dirty&&!first;
   if(first||row.rev!==sy.rev){const R=fix(row.doc||{});
    if(first&&R.routines.length)D.routines=D.routines.filter(r=>!isSeedRoutine(r)); // bỏ routine mẫu chưa sửa để không bị trùng
    D=mergeDocs(D,R);ensureLib();D.sync={uid,rev:row.rev,at:sy.at,dirty:!!sy.dirty};EXM=null;pulled=true;push=sig(D)!==sig(R)}
   if(!push){D.sync=Object.assign({},D.sync,{uid,rev:row.rev,at:Date.now(),dirty:editSeq!==seq});saveRaw();ok=true;break}
   const r=await sbFetch('/rest/v1/ggym_docs?user_id=eq.'+uid+'&rev=eq.'+row.rev+'&select=rev',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({doc:stripD(D),rev:row.rev+1})});
   if(P.cur!==pid)return;if(!r||!r.length){saveRaw();continue}
   D.sync={uid,rev:row.rev+1,at:Date.now(),dirty:editSeq!==seq};saveRaw();ok=true;break}
  if(!ok)throw new Error('Dữ liệu đang thay đổi ở máy khác, thử lại sau');
  if(pulled){const ae=document.activeElement;if(!(ae&&ae.matches&&ae.matches('input')))render()}
  if(manual)toast('Đã đồng bộ')}
 catch(e){S.syncErr=e.message;if(manual)toast('Không đồng bộ được: '+e.message)}
 finally{syncing=false;setSyncSt();if(P.cur===pid&&D.sync&&D.sync.dirty&&getAuth())scheduleSync(15000)}}
function cloudHtml(){const c=cloudCfg(),a=getAuth();
 if(!c||S.cfgEdit)return `<p class="lbl">Đồng bộ đám mây (Supabase)</p><p class="mute small" style="margin:0 0 8px">Supabase → Project Settings → API: dán Project URL và Publishable key (hoặc anon key).</p><input id="cf-url" class="field" value="${c?esc(c.url):''}" placeholder="https://xxxx.supabase.co" autocomplete="off" inputmode="url"><input id="cf-key" class="field" style="margin-top:8px" value="${c?esc(c.key):''}" placeholder="sb_publishable_… hoặc anon key" autocomplete="off"><button class="btn block" data-act="cloud-cfg">Lưu cấu hình</button>`;
 if(!a)return `<p class="lbl">Đồng bộ đám mây</p><p class="mute small" style="margin:0 0 8px">Đăng nhập để tự sao lưu và dùng trên nhiều máy. Mỗi email là một hồ sơ riêng.</p>${D.sync&&D.sync.email?`<p class="mute small" style="margin:0 0 8px">Dữ liệu trên máy là của <b>${esc(D.sync.email)}</b>. Đăng nhập email khác thì máy sẽ tải dữ liệu của email đó thay vào.</p>`:''}<input id="au-email" class="field" type="email" placeholder="Email" autocomplete="username" inputmode="email" value="${esc((D.sync&&D.sync.email)||'')}"><input id="au-pass" class="field" style="margin-top:8px" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autocomplete="current-password"><div class="row2"><button class="btn red" data-act="au-in">Đăng nhập</button><button class="btn" data-act="au-up">Tạo tài khoản</button></div><button class="link" data-act="cloud-edit">Đổi cấu hình Supabase</button>`;
 return `<p class="lbl">Đồng bộ đám mây</p><div class="card" style="margin-top:0"><b>${esc(a.email||'')}</b><p class="mute small" style="margin:2px 0 0" id="sync-st">${syncText()}</p></div><div class="row2"><button class="btn" data-act="sync-now">Đồng bộ ngay</button><button class="btn danger" data-act="au-out">Đăng xuất</button></div>`}

