// GGym — hành động, sự kiện, cử chỉ, đồng hồ, khởi động
/* ---------- actions ---------- */
const A={
 close:()=>closeSheet(),
 'cloud-edit':()=>{S.cfgEdit=true;settingsSheet()},
 'cloud-cfg':()=>{const url=($('#cf-url').value||'').trim().replace(/\/+$/,''),key=($('#cf-key').value||'').trim();
  if(!/^(https:\/\/[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(url))return toast('URL phải có dạng https://xxxx.supabase.co');if(key.length<20)return toast('Key chưa đúng');
  try{localStorage.setItem('ggym.cloud',JSON.stringify({url,key}))}catch(e){}S.cfgEdit=false;settingsSheet();toast('Đã lưu cấu hình Supabase')},
 'au-in':async()=>{const em=($('#au-email').value||'').trim(),pw=$('#au-pass').value||'';if(!em||!pw)return toast('Nhập email và mật khẩu');
  try{const j=await sbFetch('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:em,password:pw})},false);if(!(await adopt(j)))return;settingsSheet();toast('Đã đăng nhập, đang đồng bộ…');await sync(true);settingsSheet()}catch(e){toast(authMsg(e))}},
 'au-up':async()=>{const em=($('#au-email').value||'').trim(),pw=$('#au-pass').value||'';if(!em||pw.length<6)return toast('Nhập email và mật khẩu ít nhất 6 ký tự');
  try{const j=await sbFetch('/auth/v1/signup',{method:'POST',body:JSON.stringify({email:em,password:pw})},false);
   if(j&&j.access_token){if(!(await adopt(j)))return;settingsSheet();await sync(true);settingsSheet()}else toast('Đã gửi email xác nhận — bấm link trong email rồi quay lại bấm Đăng nhập')}catch(e){toast(authMsg(e))}},
 /* đăng xuất: gửi nốt thay đổi lên server, giữ dữ liệu trên máy và ghi nhớ nó là của email nào */
 'au-out':()=>confirmSheet('Đăng xuất khỏi tài khoản đồng bộ? Dữ liệu vẫn để trên máy để xem offline; đăng nhập lại email này thì dùng tiếp, đăng nhập email khác thì máy sẽ tải dữ liệu của email đó.','Đăng xuất',async()=>{
  const out=async()=>{const a=getAuth()||{},sy=D.sync||{};try{await sbFetch('/auth/v1/logout',{method:'POST'})}catch(e){}setAuth(null);D.sync={uid:sy.uid||a.uid,email:a.email};saveRaw();toast('Đã đăng xuất')};
  if(D.sync&&D.sync.dirty){toast('Đang gửi nốt thay đổi…');await sync();if(D.sync&&D.sync.dirty)return confirmSheet('Chưa gửi được các thay đổi mới nhất lên server (có thể đang mất mạng). Vẫn đăng xuất? Thay đổi chỉ còn trên máy này, và sẽ mất nếu sau đó đăng nhập email khác.','Vẫn đăng xuất',out)}
  out()}),
 'sync-now':()=>sync(true),

 'share-app':async()=>{const url=location.origin+location.pathname.replace(/index\.html$/,'');
  try{if(navigator.share){await navigator.share({title:'GGym',text:'App ghi buổi tập gym, mở bằng Safari rồi Thêm vào MH chính:',url});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(url);toast('Đã chép link: '+url)}catch(e){toast('Link app: '+url)}},

 'cf-ok':()=>{const f=S.cf;S.cf=null;closeSheet();f&&f()},
 tab:d=>{if(S.view==='routine')S.view=null;if(d.t===S.tab&&S.tab==='ex')S.exId=null;S.tab=d.t;render();scrollTo(0,0)},
 settings:()=>settingsSheet(),
 'hint-off':()=>{D.settings.hintOff=true;save();render()},
 'bk-later':()=>{markBackup(Date.now()-BKD+7*864e5);render()},
 'start-empty':()=>begin({name:'Buổi tập '+partOfDay()}),
 'start-routine':d=>{const r=D.routines.find(x=>x.id===d.id);if(r)begin({name:r.name,routineId:r.id,exercises:r.items.map(it=>({exId:it.exId,sets:planOf(it).map(p=>Object.assign(planEdit(p),{done:false}))}))})},
 resume:()=>{S.view='workout';render();scrollTo(0,0)},
 minimize:()=>{S.view=null;render()},
 check:d=>{const a=D.active,e=a.exercises[d.i],s=e.sets[d.j],ty=tyId(e.exId),F=TYS[ty].f;
  if(!s.done){const p=prevOf(e)[d.j],old=Object.assign({},s);
   /* ô trống: lấy số của lần trước; kg trống = 0 (bodyweight) */
   for(const k of F)if(emp(s[k])&&p&&fv(k,p[k]))s[k]=fv(k,p[k]);if(F.includes('w')&&emp(s.w))s.w='0';
   if(!setOk(s,ty)){Object.assign(s,old);toast(needMsg(ty));return}
   s.done=true;if(!a.editId)startRest(D.restBy[e.exId]!=null?D.restBy[e.exId]:D.settings.rest)}else s.done=false;
  save();render()},
 addset:d=>{const sets=D.active.exercises[d.i].sets,l=sets[sets.length-1],n=blank();if(l)for(const k of FK)n[k]=emp(l[k])?'':l[k];sets.push(n);save();render()},
 setmenu:d=>{const s=D.active.exercises[d.i].sets[d.j];sheet(`<h3>Set</h3><div class="list"><button data-act="settype" data-i="${d.i}" data-j="${d.j}">${s.t==='w'?'Đổi thành set thường':'Đánh dấu là set khởi động (K)'}</button><button class="danger" data-act="setdel" data-i="${d.i}" data-j="${d.j}">Xoá set này</button></div>`)},
 settype:d=>{const s=D.active.exercises[d.i].sets[d.j];s.t=s.t==='w'?'n':'w';save();closeSheet();render()},
 setdel:d=>{D.active.exercises[d.i].sets.splice(d.j,1);save();closeSheet();render()},
 exmenu:d=>{const i=+d.i,e=D.active.exercises[i],cur=D.restBy[e.exId]!=null?D.restBy[e.exId]:D.settings.rest,L=D.active.exercises.length;
  sheet(`<h3>${esc(exOf(e.exId).name)}</h3><p class="lbl">Thời gian nghỉ cho bài này</p><div class="chips">${[0,45,60,90,120,150,180,240].map(s=>`<button class="chip ${s===cur?'on':''}" data-act="exrest" data-i="${i}" data-s="${s}">${s?fmtClock(s):'Tắt'}</button>`).join('')}</div>
  <div class="list"><button data-act="ro-open" data-k="w" ${L>1?'':'disabled'}>Sắp xếp thứ tự các bài (kéo thả)</button><button data-act="exswap" data-i="${i}">Thay bằng bài khác</button><button class="danger" data-act="exdel" data-i="${i}">Bỏ bài này khỏi buổi tập</button></div>`)},
 exrest:d=>{D.restBy[D.active.exercises[d.i].exId]=+d.s;save();closeSheet();render()},
 exswap:d=>{const i=+d.i;openPicker(id=>{D.active.exercises[i].exId=id;save();render()},'Thay bằng bài')},
 exdel:d=>{D.active.exercises.splice(+d.i,1);save();closeSheet();render()},
 addex:()=>openPicker(id=>{const n=Math.max(3,(exHistory(id,D.active.editId,D.active.start)[0]||{sets:[]}).sets.length);D.active.exercises.push({exId:id,sets:Array.from({length:Math.min(n,6)},blank)});save();render();setTimeout(()=>scrollTo(0,document.body.scrollHeight),60)}),
 exinfo:d=>{const id=d.id,all=!!d.all,h=exHistory(id),b=best(h.flatMap(x=>x.sets)),ty=tyId(id);sheet(`<h3>${esc(exOf(id).name)}</h3>${demoHtml(exOf(id))}<div style="margin-top:14px">${exTiles(ty,b,ty==='wr'?null:h.length)}</div><p class="lbl">${all?'Tất cả các buổi':'Các buổi gần nhất'}</p>${h.slice(0,all?h.length:5).map(sessHtml).join('')||'<p class="empty">Chưa tập bài này.</p>'}${h.length>5&&!all?`<button class="btn block" data-act="exinfo" data-id="${id}" data-all="1" style="margin-top:10px">Xem tất cả ${h.length} buổi</button>`:''}`,'tall')},
 'ref-pick':d=>{const e=exOf(d.id);S.refEx=d.id;S.rq=e.name.replace(/\(.*?\)/g,'').split(/\s+/).filter(w=>w.length>2).slice(0,2).join(' ');
  S.rsrc=S.rsrc||'wger';refSheet()},
 'ref-src':d=>{S.rsrc=d.k;refSheet()},
 'wg-set':d=>{const e=D.exercises.find(x=>x.id===S.refEx),r=(S.wgRes||[])[+d.i];if(!e||!r)return;e.wg=wgPick(r);delete e.ref;e.u=Date.now();EXM=null;save();closeSheet();render();toast(e.wg.v?'Đã gắn video minh hoạ':'Đã gắn hình minh hoạ')},
 'ref-set':d=>{const e=D.exercises.find(x=>x.id===S.refEx);if(e){if(d.r)e.ref=d.r;else delete e.ref;delete e.wg;e.u=Date.now();EXM=null;save()}closeSheet();render();toast(d.r?'Đã gắn hình minh hoạ':'Đã bỏ hình')},
 pick:d=>{const cb=S.pick;S.pick=null;closeSheet();cb&&cb(d.id)},
 newex:d=>exSheet(null,!!d.p),
 nxg:d=>{S.nxg=d.g;$$('#nx-g .chip').forEach(c=>c.classList.toggle('on',c.dataset.g===d.g))},
 nxt:d=>{S.nxt=d.t;$$('#nx-t .chip').forEach(c=>c.classList.toggle('on',c.dataset.t===d.t));const x=$('#nx-tx span');if(x)x.textContent='Ví dụ: '+TYS[d.t].x},
 'nx-save':d=>{const name=($('#nx-name').value||'').trim();if(!name)return toast('Nhập tên bài tập');
  const dup=D.exercises.find(e=>norm(e.name)===norm(name)&&e.id!==d.id);if(dup)return toast('Đã có bài tập trùng tên');
  let id=d.id,e;if(id){e=D.exercises.find(x=>x.id===id);e.name=name;e.group=S.nxg;e.u=Date.now()}else{id=uid();e={id,u:Date.now(),name,group:S.nxg,custom:true};D.exercises.push(e)}
  if(S.nxt===(TY0[id]||'wr'))delete e.ty;else e.ty=S.nxt;
  EXM=null;save();closeSheet();if(d.p&&S.pick){const cb=S.pick;S.pick=null;cb(id)}else{render();toast('Đã lưu bài tập')}},
 'ex-remove':d=>{const id=d.id,used=D.workouts.some(w=>w.exercises.some(e=>e.exId===id))||D.routines.some(r=>r.items.some(i=>i.exId===id))||(D.active&&D.active.exercises.some(e=>e.exId===id));
  if(used)return toast('Bài này đã có trong lịch sử / routine nên không xoá được');
  confirmSheet('Xoá bài tập này khỏi danh sách?','Xoá',()=>{tomb(id);D.exercises=D.exercises.filter(e=>e.id!==id);EXM=null;S.exId=null;save();render()})},
 'rest-adj':d=>{const a=D.active;if(!a||!a.restEnd)return;a.restEnd+=+d.s*1000;a.restDur=Math.max(1,a.restDur+ +d.s);if(a.restEnd<=Date.now())a.restEnd=0;save();restTick()},
 'rest-skip':()=>{if(D.active){D.active.restEnd=0;save();restTick()}},
 finish:()=>{const a=D.active;let done=0,open=0;a.exercises.forEach(e=>e.sets.forEach(s=>s.done?done++:open++));
  if(!done)return confirmSheet('Chưa có set nào được đánh dấu xong (✓). Huỷ buổi tập này luôn?','Huỷ buổi tập',()=>{D.active=null;save();S.view=null;render()});
  if(open)return confirmSheet(`Còn ${open} set chưa đánh dấu xong. Bỏ qua các set đó và lưu buổi tập?`,'Lưu buổi tập',doFinish);doFinish()},
 discard:()=>confirmSheet(D.active.editId?'Bỏ các thay đổi vừa sửa?':'Huỷ buổi tập này? Các set đã ghi sẽ mất.',D.active.editId?'Bỏ thay đổi':'Huỷ buổi tập',()=>{D.active=null;save();S.view=null;render()}),
 w2r:d=>{const w=findW(d.id);if(!w)return;D.routines.push({id:uid(),u:Date.now(),name:w.name,days:[],items:w.exercises.map(e=>({exId:e.exId,sets:e.sets.length,plan:planFromSets(e.sets)}))});save();closeSheet();toast('Đã lưu thành routine');render()},
 w2rupd:d=>{const w=findW(d.id),r=w&&D.routines.find(x=>x.id===w.routineId);if(!r)return;const done=new Map(w.exercises.map(e=>[e.exId,e]));
  r.items=r.items.map(it=>{const e=done.get(it.exId);if(!e)return it;done.delete(it.exId);return{exId:it.exId,sets:e.sets.length,plan:planFromSets(e.sets)}}).concat([...done.values()].map(e=>({exId:e.exId,sets:e.sets.length,plan:planFromSets(e.sets)})));r.u=Date.now();save();closeSheet();render();toast('Đã cập nhật routine '+r.name)},
 wopen:d=>{const w=findW(d.id);if(w)wDetail(w)},
 wedit:d=>{const w=findW(d.id);if(!w)return;begin({editId:w.id,name:w.name,start:w.start,end:w.end,routineId:w.routineId,exercises:w.exercises.map(e=>({exId:e.exId,sets:e.sets.map(s=>Object.assign(planEdit(s),{t:s.t||'n',done:true}))}))})},
 wrepeat:d=>{const w=findW(d.id);if(w)begin({name:w.name,routineId:w.routineId,exercises:w.exercises.map(e=>({exId:e.exId,sets:e.sets.map(s=>({w:'',r:'',done:false,t:s.t||'n'}))}))})},
 wdel:d=>confirmSheet('Xoá buổi tập này khỏi lịch sử?','Xoá buổi tập',()=>{tomb(d.id);D.workouts=D.workouts.filter(w=>w.id!==d.id);save();render();toast('Đã xoá')}),
 grp:d=>{S.grp=d.g==='Tất cả'?'':d.g;render()},
 'map-open':()=>mapOpen(),
 'map-to':d=>{const a=exOf(d.from),b=exOf(d.to),n=(usage()[d.from]||{n:0}).n;
  confirmSheet(`Gộp <b>${esc(a.name)}</b> (${n} buổi) vào <b>${esc(b.name)}</b>? Lịch sử, kỷ lục và routine của bài này sẽ chuyển sang bài kia, rồi bài <b>${esc(a.name)}</b> bị xoá khỏi thư viện.`,'Gộp bài',()=>{mergeEx(d.from,d.to);render();mapOpen();toast('Đã gộp vào '+b.name)})},
 'map-pick':d=>{const from=d.id;openPicker(id=>{if(id===from)return mapOpen();const a=exOf(from),b=exOf(id),n=(usage()[from]||{n:0}).n;
  confirmSheet(`Gộp <b>${esc(a.name)}</b> (${n} buổi) vào <b>${esc(b.name)}</b>?`,'Gộp bài',()=>{mergeEx(from,id);render();mapOpen();toast('Đã gộp vào '+b.name)})},'Map vào bài')},
 'map-keep':d=>{const e=D.exercises.find(x=>x.id===d.id);if(!e)return;e.keep=true;e.u=Date.now();save();render();mapOpen();toast('Đã giữ bài riêng — có thể sửa nhóm cơ / hình trong trang bài')},
 'map-unkeep':()=>{for(const e of D.exercises)if(e.keep){delete e.keep;e.u=Date.now()}save();render();mapOpen()},
 exopen:d=>{S.tab='ex';S.exId=d.id;S.met=null;S.hAll=false;render();scrollTo(0,0)},
 'h-all':()=>{S.hAll=!S.hAll;render()},
 exback:()=>{S.exId=null;render()},
 exedit:()=>exSheet(exOf(S.exId)),
 met:d=>{S.met=d.k;render()},
 hv:d=>{S.hv=d.k;render();scrollTo(0,0)},
 hm:d=>{S.hm+=+d.d;render()},
 'hm-pick':()=>{const c=new Map();for(const w of D.workouts){const k=mKey(w.start);c.set(k,(c.get(k)||0)+1)}const cur=mKey(Date.now());if(!c.has(cur))c.set(cur,0);
  const ks=[...c.keys()].sort((a,b)=>b-a);let yr=null,h='';
  for(const k of ks){const y=Math.floor(k/12);if(y!==yr){yr=y;h+=`<p class="pg">${y}</p>`}h+=`<button data-act="hm-set" data-k="${k}" class="${k===S.hm?'on':''}"><span>Tháng ${k%12+1}${k===cur?' (tháng này)':''}</span><small>${c.get(k)?c.get(k)+' buổi':'—'}</small></button>`}
  sheet(`<h3>Chọn tháng</h3><div class="plist mlist">${h}</div>`,'tall')},
 'hm-set':d=>{S.hm=+d.k;closeSheet();render();scrollTo(0,0)},
 sp:d=>{S.sp=+d.k;render()},
 sm:d=>{S.sm=d.k;render()},
 bm:d=>{S.bm=d.k;render()},
 'body-add':()=>{const v=$('#bd').value,val={};
  for(const m of BM){const el=$('#b-'+m.k);const x=el?num(el.value):0;if(!x)continue;if(!(x>=m.lo&&x<=m.hi))return toast(m.l+' không hợp lệ');val[m.k]=x}
  const p=(v||ymd(new Date())).split('-').map(Number),t=new Date(p[0],p[1]-1,p[2],12).getTime();
  const ex=D.body.find(b=>dayKey(b.d)===dayKey(t));
  if(!Object.keys(val).length)return toast('Nhập ít nhất một số đo');
  if(ex){Object.assign(ex,val);ex.u=Date.now();toast('Đã cập nhật số đo ngày '+dm(t))}else{D.body.push(Object.assign({id:uid(),u:Date.now(),d:t,bf:0},val));toast('Đã ghi số đo')}
  save();render()},
 'body-open':d=>{const b=D.body.find(x=>x.id===d.id);if(!b)return;
  sheet(`<h3>${fmtDate(b.d)}</h3><table class="cmp" style="margin-bottom:8px"><tbody>${BM.filter(m=>m.g!=='seg'&&b[m.k]).map(m=>`<tr><td>${m.l}<small>${m.en}</small></td><td><b>${bmFmt(m,b[m.k])}</b> <span class="mute small">${m.u}</span></td></tr>`).join('')}</tbody></table>${hasSeg(b)?`<p class="lbl">Từng vùng</p>${segTable(b,null)}<div style="height:10px"></div>`:''}
  <button class="btn block" data-act="body-edit" data-id="${b.id}">Sửa lần đo này</button><button class="btn block danger" style="background:none" data-act="body-del" data-id="${b.id}">Xoá lần đo này</button>`)},
 'body-edit':d=>{const b=D.body.find(x=>x.id===d.id);if(!b)return;closeSheet();S.bmore=isIB(b);S.bseg=hasSeg(b);S.btape=hasTape(b);render();
  for(const m of BM){const el=$('#b-'+m.k);if(el)el.value=b[m.k]?fx(b[m.k]):''}$('#bd').value=ymd(new Date(b.d));scrollTo(0,0);toast('Sửa số rồi bấm Ghi số đo')},
 'bimp-tpl':()=>bodyTemplate(),
 'bimp-ok':()=>{const it=S.bimp||[];S.bimp=null;let n=0,u=0;const have=new Map(D.body.map(b=>[dayKey(b.d),b]));
  for(const x of it){const b=have.get(dayKey(x.d)),v=Object.assign({},x);delete v.d;
   if(b){Object.assign(b,v);b.u=Date.now();u++}else{const nb=Object.assign({id:uid(),u:Date.now(),d:x.d,bf:0},v);D.body.push(nb);have.set(dayKey(x.d),nb);n++}}
  save();closeSheet();S.tab='body';render();toast(`Đã nhập ${n} lần đo mới${u?`, cập nhật ${u} lần`:''}`)},
 'body-del':d=>{tomb(d.id);D.body=D.body.filter(b=>b.id!==d.id);save();closeSheet();render();toast('Đã xoá')},
 'r-new':()=>{S.draft={id:null,name:'',days:[],items:[]};S.view='routine';render();scrollTo(0,0)},
 'r-edit':d=>{const r=D.routines.find(x=>x.id===d.id);if(!r)return;S.draft=JSON.parse(JSON.stringify(r));S.draft.days=S.draft.days||[];S.draft.items.forEach(it=>it.plan=planOf(it).map(planEdit));S.view='routine';render();scrollTo(0,0)},
 'r-cancel':()=>{S.draft=null;S.view=null;render()},
 'r-day':d=>{const r=S.draft,x=+d.d;r.days=r.days.includes(x)?r.days.filter(y=>y!==x):r.days.concat(x);render()},
 'r-sadd':d=>{const pl=S.draft.items[d.i].plan;if(pl.length>=12)return;const l=pl[pl.length-1],n=rset();if(l)for(const k of FK)n[k]=emp(l[k])?'':l[k];pl.push(n);render()},
 'r-sdel':d=>{const pl=S.draft.items[d.i].plan;if(pl.length>1)pl.splice(+d.j,1);else toast('Mỗi bài cần ít nhất 1 set');render()},
 'r-stype':d=>{const p=S.draft.items[d.i].plan[d.j];p.t=p.t==='w'?'n':'w';render()},
 'ro-open':(d,b)=>{if(b.disabled)return;closeSheet();reorderOpen(d.k)},
 'ro-ok':()=>closeSheet(),
 'r-del':d=>{S.draft.items.splice(+d.i,1);render()},
 'r-add':()=>openPicker(id=>{const n=Math.min(6,Math.max(3,((exHistory(id)[0])||{sets:[]}).sets.length));S.draft.items.push({exId:id,sets:n,plan:Array.from({length:n},rset)});render();setTimeout(()=>scrollTo(0,document.body.scrollHeight),60)}),
 'r-save':()=>{const r=S.draft;r.name=(r.name||'').trim();if(!r.name)return toast('Đặt tên cho routine');if(!r.items.length)return toast('Thêm ít nhất một bài tập');
  r.items.forEach(it=>{it.plan=planFromSets(it.plan);it.sets=it.plan.length});
  r.u=Date.now();if(r.id){const i=D.routines.findIndex(x=>x.id===r.id);D.routines[i]=r}else{r.id=uid();D.routines.push(r)}save();S.draft=null;S.view=null;S.tab='home';render();toast('Đã lưu routine')},
 'r-remove':()=>confirmSheet('Xoá routine này? Lịch sử tập không bị ảnh hưởng.','Xoá routine',()=>{tomb(S.draft.id);D.routines=D.routines.filter(x=>x.id!==S.draft.id);save();S.draft=null;S.view=null;render()}),
 defrest:d=>{D.settings.rest=+d.s;save();$$('[data-act=defrest]').forEach(c=>c.classList.toggle('on',c.dataset.s===d.s))},
 tgl:(d,b)=>{D.settings[d.k]=!D.settings[d.k];save();b.classList.toggle('on',D.settings[d.k]);b.setAttribute('aria-pressed',D.settings[d.k]);wake()},
 export:()=>exportData(),
 wipe:()=>confirmSheet('Xoá toàn bộ buổi tập, routine, bài tập tự tạo và số đo trên máy này?'+' Không thể hoàn tác — nên xuất bản sao lưu trước.','Xoá hết dữ liệu',()=>{const del=Object.assign({},D.del),t=Date.now(),sy=D.sync;['workouts','body','routines'].forEach(k=>D[k].forEach(i=>del[i.id]=t));D.exercises.forEach(e=>{if(e.custom)del[e.id]=t});D=seed();D.del=del;D.sync=sy;EXM=null;save();S.view=null;S.tab='home';render();toast('Đã xoá toàn bộ dữ liệu')})
};

/* ---------- events ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const f=A[b.dataset.act];if(f){e.preventDefault();unlockAudio();f(b.dataset,b,e)}});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button][data-act]')){e.preventDefault();e.target.click()}});
document.addEventListener('input',e=>{const t=e.target,f=t.dataset.f;if(!f)return;
 if(f==='sv'&&D.active){const k=t.dataset.k,s=D.active.exercises[t.dataset.i].sets[t.dataset.j];if(k==='tm')t.value=typeDur(t.value);s[k]=t.value;save();if(s.done)updWk(+t.dataset.i,+t.dataset.j)}
 else if(f==='wname'&&D.active){D.active.name=t.value;save()}
 else if(f==='pickq'){S.pq=t.value;$('#picklist').innerHTML=pickList()}
 else if(f==='exq'){S.q=t.value;$('#exlist').innerHTML=exListHtml()}
 else if(f==='rname'&&S.draft){S.draft.name=t.value}
 else if(f==='pv'&&S.draft){const k=t.dataset.k;if(k==='tm')t.value=typeDur(t.value);S.draft.items[t.dataset.i].plan[t.dataset.j][k]=t.value;const rs=$('#r-sum');if(rs)rs.innerHTML=rSumHtml(planTotals(S.draft.items))}
 else if(f==='refq'){S.rq=t.value;if(S.rsrc==='wger'){clearTimeout(wgT);wgT=setTimeout(wgSearch,450)}else $('#reflist').innerHTML=refList()}});
document.addEventListener('change',async e=>{const t=e.target,f=t.dataset.f;if(f!=='imp-json'&&f!=='imp-body')return;const file=t.files&&t.files[0];if(!file)return;
 if(f==='imp-body'){t.value='';try{await readBodyFile(file)}catch(err){toast('Không đọc được file')}return}
 let txt='';try{txt=await file.text()}catch(err){return toast('Không đọc được file')}t.value='';importJSON(txt)});
document.addEventListener('toggle',e=>{if(e.target.matches&&e.target.matches('details.more')){const o=e.target.open,c=e.target.classList;if(c.contains('sub'))S.bseg=o;else if(c.contains('tape'))S.btape=o;else S.bmore=o}},true);
document.addEventListener('focusin',e=>{if(e.target.matches('.row input')){const t=e.target;setTimeout(()=>{try{t.select()}catch(x){}},0)}});

/* ---------- cử chỉ: vuốt set sang trái để xoá, giữ tên bài để sắp xếp ---------- */
/* noClick: chặn cú click mà trình duyệt bắn ra ngay sau khi vuốt / giữ, để không bấm nhầm nút bên dưới ngón tay */
let noClick=0,swp=null,swOpen=null,lp=null,lpFired=false;const SWW=84;
document.addEventListener('click',e=>{if(Date.now()<noClick){e.stopPropagation();e.preventDefault()}},true);
const swClose=r=>{if(!r)return;r.style.transform='';r.parentNode&&r.parentNode.classList.remove('swo');if(swOpen===r)swOpen=null};
document.addEventListener('pointerdown',e=>{
 const row=e.target.closest('[data-sw]');
 if(swOpen&&swOpen!==row&&!e.target.closest('.swdel'))swClose(swOpen);
 if(row&&e.button<=0)swp={row,x0:e.clientX,y0:e.clientY,id:e.pointerId,base:row===swOpen?-SWW:0,x:0,on:false};
 const h=e.target.closest('[data-lp]');
 if(h&&e.button<=0){clearTimeout(lp&&lp.t);lp={x:e.clientX,y:e.clientY,id:e.pointerId,t:setTimeout(()=>{lp=null;lpFired=true;try{navigator.vibrate&&navigator.vibrate(12)}catch(x){}reorderOpen(h.dataset.lp)},480)}}
 const it=e.target.closest('.ro-i');if(it&&e.button<=0)roStart(e,it)});
document.addEventListener('pointermove',e=>{
 if(lp&&e.pointerId===lp.id&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10){clearTimeout(lp.t);lp=null}
 if(dr&&e.pointerId===dr.id){roMove(e);return}
 const s=swp;if(!s||e.pointerId!==s.id)return;const dx=e.clientX-s.x0,dy=e.clientY-s.y0;
 if(!s.on){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){swp=null;return}if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy))return;
  s.on=true;s.row.style.transition='none';s.row.parentNode.classList.add('swo');const a=document.activeElement;if(a&&s.row.contains(a))a.blur()}
 s.x=Math.min(0,s.base+dx);s.row.style.transform=`translateX(${s.x}px)`});
const ptrEnd=e=>{
 if(lp&&e.pointerId===lp.id){clearTimeout(lp.t);lp=null}
 if(lpFired){lpFired=false;noClick=Date.now()+400}
 if(dr&&e.pointerId===dr.id){roEnd();return}
 const s=swp;if(!s||e.pointerId!==s.id)return;swp=null;if(!s.on)return;noClick=Date.now()+350;s.row.style.transition='';
 const W=s.row.offsetWidth;
 if(e.type==='pointerup'&&s.x<-W*.55){const b=s.row.parentNode.querySelector('.swdel');s.row.style.transform='translateX(-100%)';setTimeout(()=>A[b.dataset.act](b.dataset,b),160)}
 else if(s.x<-40){s.row.style.transform=`translateX(-${SWW}px)`;swOpen=s.row}else swClose(s.row)};
document.addEventListener('pointerup',ptrEnd);document.addEventListener('pointercancel',ptrEnd);
document.addEventListener('contextmenu',e=>{if(e.target.closest('[data-lp]'))e.preventDefault()});

/* sắp xếp bài: danh sách gọn, giữ và kéo từng bài (đổi thứ tự áp dụng ngay khi thả) */
const roList=k=>k==='r'?(S.draft&&S.draft.items):(D.active&&D.active.exercises);
function reorderOpen(k){const L=roList(k);if(!L||L.length<2)return;S.rok=k;
 sheet(`<h3>Sắp xếp bài tập</h3><p class="mute small" style="margin:-4px 0 10px">Giữ một bài rồi kéo lên / xuống.</p><div id="ro" class="ro">${roHtml()}</div><button class="btn red block" data-act="ro-ok" style="margin-top:14px">Xong</button>`,'tall')}
const roHtml=()=>(roList(S.rok)||[]).map((x,i)=>{const e=exOf(x.exId),n=(x.plan||x.sets||[]).length;return `<div class="ro-i" data-i="${i}">${thumb(e)}<span><b>${esc(e.name)}</b><small>${n} set</small></span><i class="ro-g" aria-hidden="true">${ICON.grip}</i></div>`}).join('');
let dr=null;
function roStart(e,it){e.preventDefault();const box=it.parentNode,items=[...box.children],i=items.indexOf(it),pn=box.closest('.panel');
 const H=items.length>1?items[1].offsetTop-items[0].offsetTop:it.offsetHeight;
 dr={id:e.pointerId,it,items,i,to:i,y0:e.clientY,H,pn,st:pn?pn.scrollTop:0,ly:e.clientY};it.classList.add('drag');items.forEach(x=>{if(x!==it)x.style.transition='transform .15s'})}
function roMove(e){const d=dr;d.ly=e.clientY;
 /* tự cuộn khi kéo gần mép trên / dưới của bảng */
 if(d.pn){const r=d.pn.getBoundingClientRect();if(e.clientY<r.top+60)d.pn.scrollTop-=10;else if(e.clientY>r.bottom-60)d.pn.scrollTop+=10}
 const dy=e.clientY-d.y0+(d.pn?d.pn.scrollTop-d.st:0);d.it.style.transform=`translateY(${dy}px)`;
 d.to=Math.max(0,Math.min(d.items.length-1,d.i+Math.round(dy/d.H)));
 d.items.forEach((x,j)=>{if(x===d.it)return;const sh=d.i<d.to&&j>d.i&&j<=d.to?-d.H:d.to<d.i&&j>=d.to&&j<d.i?d.H:0;x.style.transform=sh?`translateY(${sh}px)`:''})}
function roEnd(){const d=dr;dr=null;noClick=Date.now()+300;const L=roList(S.rok);
 if(L&&d.to!==d.i){L.splice(d.to,0,L.splice(d.i,1)[0]);if(S.rok==='w')save();render()}
 const box=$('#ro');if(box)box.innerHTML=roHtml()}

/* ---------- timers, sound, wake lock ---------- */
let ac=null;function unlockAudio(){try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C)ac=new C()}if(ac&&ac.state==='suspended')ac.resume()}catch(e){}}
function beep(){if(!D.settings.sound||!ac)return;try{[0,.28,.56].forEach((t,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=i===2?1175:880;o.connect(g);g.connect(ac.destination);const s=ac.currentTime+t;g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(.35,s+.02);g.gain.exponentialRampToValueAtTime(.0001,s+.22);o.start(s);o.stop(s+.25)})}catch(e){}}
function restTick(){const a=D.active,bar=$('#rest');if(!a||!a.restEnd){bar.hidden=true;return}
 const left=(a.restEnd-Date.now())/1000;
 if(left<=0){const late=left<-5;a.restEnd=0;save();bar.hidden=true;if(!late){beep();try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}toast('Hết giờ nghỉ — vào set tiếp!')}return}
 bar.hidden=false;$('#rest-t').textContent=fmtClock(Math.ceil(left));$('#rest-p').style.width=Math.min(100,100*left/(a.restDur||1))+'%'}
function tick(){const a=D.active;if(a){const sec=((a.editId?a.end:Date.now())-a.start)/1000;$$('.elapsed').forEach(el=>el.textContent=fmtClock(sec))}restTick()}
setInterval(tick,500);
let wl=null;async function wake(){try{const want=D.settings.wake&&D.active&&S.view==='workout'&&document.visibilityState==='visible';
 if(want&&!wl&&navigator.wakeLock){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null})}else if(!want&&wl){await wl.release();wl=null}}catch(e){wl=null}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){tick();wake();scheduleSync(300)}});
window.addEventListener('online',()=>scheduleSync(300));

/* ---------- boot ---------- */
(async()=>{
/* xin trình duyệt giữ dữ liệu lâu dài (không tự xoá khi máy thiếu chỗ); Safari chỉ cho khi app mở từ màn hình chính */
try{if(standalone&&navigator.storage&&navigator.storage.persist)await navigator.storage.persist()}catch(e){}
await storeReady();
ensureLib();
if(D.active)S.view='workout';
render();
scheduleSync(600);
if(!embed&&'serviceWorker' in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('sw.js').catch(()=>{})}
})();
