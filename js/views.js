// GGym — các màn hình: Tập, đang tập, Lịch sử, Thống kê, Bài tập, Cơ thể, Routine
/* ---------- line chart (tap/drag to inspect) ---------- */
function chart(el,pts,unit,fmt){if(!el||!pts.length)return;let hi=-1,X=null;
 const draw=()=>{const W=el.clientWidth,H=el.clientHeight;if(!W||!H)return;const P={l:44,r:16,t:18,b:26},n=pts.length;
  let x0=pts[0].x,x1=pts[n-1].x;if(x1===x0){x0-=864e5;x1+=864e5}
  let y0=Infinity,y1=-Infinity;pts.forEach(p=>{y0=Math.min(y0,p.y);y1=Math.max(y1,p.y)});const pd=(y1-y0)*.2||Math.max(1,y1*.05);y0=Math.max(0,y0-pd);y1+=pd;
  X=x=>P.l+(x-x0)/(x1-x0)*(W-P.l-P.r);const Y=y=>P.t+(1-(y-y0)/(y1-y0))*(H-P.t-P.b);
  const ticks=[0,1,2,3].map(k=>y0+(y1-y0)*k/3),dec=(y1-y0)<6?1:0;
  const line=pts.map((p,i)=>(i?'L':'M')+X(p.x).toFixed(1)+' '+Y(p.y).toFixed(1)).join('');
  const area=line+'L'+X(pts[n-1].x).toFixed(1)+' '+(H-P.b)+'L'+X(pts[0].x).toFixed(1)+' '+(H-P.b)+'Z';
  const s=pts[hi>=0?hi:n-1],sx=X(s.x),sy=Y(s.y),lab=(fmt?fmt(s.y):fmtNum(s.y)+' '+unit)+' · '+dm(s.x),lw=lab.length*7.2+18;
  const lx=Math.min(Math.max(sx-lw/2,P.l),W-P.r-lw),ly=sy-38<2?sy+12:sy-38,gid='g'+el.id;
  el.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ tiến độ"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--red)" stop-opacity=".3"/><stop offset="1" stop-color="var(--red)" stop-opacity="0"/></linearGradient></defs>
  ${ticks.map(t=>`<line x1="${P.l}" x2="${W-P.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)"/><text x="${P.l-8}" y="${Y(t)+4}" text-anchor="end" font-size="12" fill="var(--mute)">${fmt?fmt(t).replace('/km',''):fmtNum(t,dec)}</text>`).join('')}
  <text x="${P.l}" y="${H-7}" font-size="12" fill="var(--mute)">${dm(pts[0].x)}</text><text x="${W-P.r}" y="${H-7}" font-size="12" fill="var(--mute)" text-anchor="end">${dm(pts[n-1].x)}</text>
  <path d="${area}" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="var(--red)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${n<=40?pts.map(p=>`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3.2" fill="var(--card)" stroke="var(--red)" stroke-width="2"/>`).join(''):''}
  <line x1="${sx}" x2="${sx}" y1="${P.t}" y2="${H-P.b}" stroke="var(--ink)" stroke-opacity=".25" stroke-dasharray="3 3"/><circle cx="${sx}" cy="${sy}" r="6" fill="var(--red)" stroke="var(--card)" stroke-width="2.5"/>
  <rect x="${lx}" y="${ly}" width="${lw}" height="26" rx="8" fill="var(--ink)"/><text x="${lx+lw/2}" y="${ly+17.5}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--bg)">${lab}</text></svg>`};
 const pick=e=>{if(!X)return;const r=el.getBoundingClientRect(),x=e.clientX-r.left;let bi=0,bd=1e9;pts.forEach((p,i)=>{const d=Math.abs(X(p.x)-x);if(d<bd){bd=d;bi=i}});if(bi!==hi){hi=bi;draw()}};
 el.onpointerdown=pick;el.onpointermove=e=>{if(e.buttons||e.pointerType==='mouse')pick(e)};
 draw();try{new ResizeObserver(draw).observe(el)}catch(e){}}

/* ---------- views: home ---------- */
function vHome(){
 const now=new Date(),today=now.getDay(),mon=startOfWeek(now);
 const tr=new Set(D.workouts.map(w=>dayKey(w.start)));
 const wk=D.workouts.filter(w=>w.start>=mon.getTime());
 const plates=[...Array(7)].map((_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return `<div class="pl ${tr.has(dayKey(d))?'on':''} ${dayKey(d)===dayKey(now)?'today':''}"><i></i><span>${DAY[d.getDay()]}</span></div>`}).join('');
 const todays=D.routines.filter(r=>(r.days||[]).includes(today));
 const others=D.routines.filter(r=>!(r.days||[]).includes(today));
 let hint='';
 if(embed)hint=`<div class="hint"><p>Bản xem thử trong Claude: dữ liệu ở đây có thể không được giữ lại. Dùng thật thì cài bản chính lên iPhone.</p></div>`;
 else if(!standalone&&!D.settings.hintOff)hint=`<div class="hint"><p>Dùng như app: trong Safari bấm nút <b>Chia sẻ</b> → <b>Thêm vào MH chính</b>, rồi luôn mở từ biểu tượng đó (dữ liệu của tab Safari và của app là tách riêng).</p><button class="icon" data-act="hint-off" aria-label="Ẩn">${ICON.x}</button></div>`;
 if(!hint&&!embed&&needBackup())hint=`<div class="hint"><p>Dữ liệu chỉ nằm trên máy này${backupAt()?', lần sao lưu gần nhất '+fmtDate(backupAt()):''}. <button class="link" data-act="export">Xuất bản sao lưu</button> vào Tệp / iCloud Drive, hoặc bật đồng bộ trong Cài đặt.</p><button class="icon" data-act="bk-later" aria-label="Nhắc lại sau">${ICON.x}</button></div>`;
 const tr0=todays[0];
 const hero=tr0?`<div class="hero"><div class="hero-h"><small>Hôm nay · ${DAYF[today]}</small><button class="link" data-act="r-edit" data-id="${tr0.id}" aria-label="Sửa routine ${esc(tr0.name)}">${ICON.edit} Sửa</button></div><h3>${esc(tr0.name)}</h3><p class="hsum">${(t=>`${t.ex} bài · ${t.n} set${t.v?' · '+fmtVol(t.v)+' kg khối lượng':''}`)(planTotals(tr0.items))}</p><p>${tr0.items.map(it=>esc(exOf(it.exId).name.replace(/\s*\(.*\)/,''))).join(' · ')}</p><button class="btn red block" data-act="start-routine" data-id="${tr0.id}">Bắt đầu ${esc(tr0.name)}</button><button class="btn alt block" data-act="start-empty">Buổi trống</button></div>`
 :`<div class="hero"><small>Hôm nay · ${DAYF[today]}</small><h3>Ngày tự do</h3><p>Không có routine nào xếp cho hôm nay.</p><button class="btn red block" data-act="start-empty">Bắt đầu buổi trống</button></div>`;
 const rcard=r=>`<div class="card rc"><div class="rc-h"><b>${esc(r.name)}</b><span class="days">${(r.days||[]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>DAY[d]).join(' ')}</span><button class="icon" data-act="r-edit" data-id="${r.id}" aria-label="Sửa routine">${ICON.dots}</button></div><p>${(t=>`${t.ex} bài · ${t.n} set${t.v?' · '+fmtVol(t.v)+' kg':''}`)(planTotals(r.items))} — ${r.items.slice(0,4).map(it=>esc(exOf(it.exId).name.replace(/\s*\(.*\)/,''))).join(', ')}${r.items.length>4?'…':''}</p><button class="btn block" data-act="start-routine" data-id="${r.id}">Bắt đầu</button></div>`;
 return `<header class="top"><h1 class="brand">${LOGO}GGym</h1><button class="icon" data-act="settings" aria-label="Cài đặt">${ICON.cog}</button></header>`+hint+
 `<section class="week"><div class="plates">${plates}</div><div class="wsum"><div><b>${wk.length}</b>buổi tuần này</div><div><b>${fmtVol(wk.reduce((a,w)=>a+wVol(w),0))}</b>kg volume</div><div><b>${durS(wk.reduce((a,w)=>a+(w.end-w.start),0))}</b>thời gian</div></div></section>`+
 hero+`<h2>Routine</h2>`+(todays.slice(1).concat(others).map(rcard).join('')||'')+
 `<button class="btn ghost block" data-act="r-new">+ Routine mới</button>`;
}

/* ---------- views: workout ---------- */
const blank=()=>({w:'',r:'',km:'',tm:'',done:false,t:'n'});
const prevOf=e=>{const a=D.active;return((exHistory(e.exId,a.editId,a.start)[0])||{}).sets||[]};
/* khối lượng 1 set đang tập (chỉ set thường đã xong), và của cả bài */
const sVol=s=>s.done&&s.t!=='w'?num(s.w)*num(s.r):0;
const eVol=e=>e.sets.reduce((a,s)=>a+sVol(s),0);
const sVolTxt=s=>{const v=sVol(s);return v?fmtVol(v)+' kg':''};
const eVolTxt=e=>{const v=eVol(e);return v?' · '+fmtVol(v)+' kg xong':''};
function wkTotals(){let v=0,n=0;D.active.exercises.forEach(e=>e.sets.forEach(s=>{if(s.done&&s.t!=='w'){v+=sVol(s);n++}}));return{v,n}}
function vWorkout(){
 const a=D.active,t=wkTotals();
 const exs=a.exercises.map((e,i)=>{const prev=prevOf(e),ex=exOf(e.exId);let n=0;
  const F=TYS[tyOf(ex)].f,fc=fCls(F),hasV=F.includes('w')&&F.includes('r');
  const rows=e.sets.map((s,j)=>{const p=prev[j];const lab=s.t==='w'?'K':String(++n);
   return `<div class="swr"><button class="swdel" data-act="setdel" data-i="${i}" data-j="${j}" tabindex="-1">Xoá</button><div class="row ${fc} ${s.done?'done':''}" data-sw="1"><button class="setno ${s.t==='w'?'wu':''}" data-act="setmenu" data-i="${i}" data-j="${j}" aria-label="Tuỳ chọn set">${lab}</button><span class="prev"><span>${p?setTxt(p):'—'}</span>${hasV&&s.done?`<small class="sv" data-sv="${i}-${j}">${sVolTxt(s)}</small>`:''}</span>${F.map(k=>fInp('sv',k,s[k],p,i,j)).join('')}<button class="chk" data-act="check" data-i="${i}" data-j="${j}" aria-label="Xong set">${ICON.check}</button></div></div>`}).join('');
  const rest=D.restBy[e.exId]!=null?D.restBy[e.exId]:D.settings.rest;
  return `<section class="card ex"><div class="ex-h" data-lp="w"><button class="exth" data-act="exinfo" data-id="${e.exId}" aria-label="Xem cách tập">${thumb(ex)}</button><button class="ex-name" data-act="exinfo" data-id="${e.exId}">${esc(ex.name)}</button><button class="icon" data-act="exmenu" data-i="${i}" aria-label="Tuỳ chọn bài tập">${ICON.dots}</button></div><div class="ex-sub">${esc(ex.group)} · Nghỉ ${rest?fmtClock(rest):'tắt'}${hasV?`<b class="xv" data-xv="${i}">${eVolTxt(e)}</b>`:''}</div><div class="row hd ${fc}"><span>Set</span><span>Lần trước</span>${F.map(k=>`<span>${FLD[k].h}</span>`).join('')}<span></span></div>${rows}<button class="btn ghost block" data-act="addset" data-i="${i}">+ Thêm set</button></section>`}).join('');
 return `<header class="top wk"><button class="icon" data-act="minimize" aria-label="Thu nhỏ">${ICON.down}</button><div class="wk-t"><b class="elapsed">0:00</b><small>${a.editId?'Đang sửa buổi cũ':'Thời gian'}</small></div><button class="btn red sm" data-act="finish">${a.editId?'Lưu':'Kết thúc'}</button></header>
 <input class="wk-name" data-f="wname" value="${esc(a.name)}" aria-label="Tên buổi tập" autocomplete="off">
 <div class="wk-stats"><span><b id="wk-vol">${fmtVol(t.v)}</b> kg volume</span><span><b id="wk-sets">${t.n}</b> set xong</span></div>
 ${exs||'<p class="empty">Chưa có bài tập nào. Thêm bài đầu tiên nhé.</p>'}
 <button class="btn red block" data-act="addex">+ Thêm bài tập</button>
 <button class="btn block danger" data-act="discard" style="background:none">${a.editId?'Bỏ thay đổi':'Huỷ buổi tập'}</button>`;
}
/* sửa số của set đã xong: cập nhật các con số khối lượng tại chỗ, không vẽ lại (để giữ bàn phím) */
function updWk(i,j){const t=wkTotals(),v=$('#wk-vol'),n=$('#wk-sets');if(v)v.textContent=fmtVol(t.v);if(n)n.textContent=t.n;
 const e=i!=null&&D.active.exercises[i];if(!e)return;
 const sv=$(`[data-sv="${i}-${j}"]`);if(sv)sv.textContent=sVolTxt(e.sets[j]);const xv=$(`[data-xv="${i}"]`);if(xv)xv.textContent=eVolTxt(e)}

/* ---------- views: history ---------- */
const histSeg=()=>`<div class="seg hv"><button class="${S.hv!=='stats'?'on':''}" data-act="hv" data-k="log">Buổi tập</button><button class="${S.hv==='stats'?'on':''}" data-act="hv" data-k="stats">Thống kê</button></div>`;
function vHistory(){
 if(S.hv==='stats')return hdr('Lịch sử')+histSeg()+vStats();
 const ws=D.workouts,now=new Date(),cur=mKey(+now),lo=Math.min(cur,...ws.map(w=>mKey(w.start)));
 if(S.hm==null||S.hm>cur||S.hm<lo)S.hm=cur;
 const hmv=S.hm,y=Math.floor(hmv/12),m=hmv%12,mws=ws.filter(w=>mKey(w.start)===hmv);
 /* lịch tháng: tuần bắt đầu thứ Hai, ngày có tập tô đỏ, chạm để xem buổi */
 const byDay=new Map();for(const w of mws){const k=new Date(w.start).getDate();if(!byDay.has(k))byDay.set(k,w)}
 const off=(new Date(y,m,1).getDay()+6)%7,nd=new Date(y,m+1,0).getDate(),tk=dayKey(+now);
 let cells=['T2','T3','T4','T5','T6','T7','CN'].map(d=>`<span class="dh">${d}</span>`).join('')+'<span></span>'.repeat(off);
 for(let d=1;d<=nd;d++){const dt=new Date(y,m,d),w=byDay.get(d),c=(w?'on':'')+(dayKey(+dt)===tk?' td':'')+(dt>now?' fu':'');
  cells+=w?`<button class="d ${c}" data-act="wopen" data-id="${w.id}" aria-label="${d}/${m+1}: ${esc(w.name)}">${d}</button>`:`<span class="d ${c}">${d}</span>`}
 const mv=mws.reduce((a,w)=>a+wVol(w),0),mt=mws.reduce((a,w)=>a+(w.end-w.start),0);
 const cal=`<div class="card"><div class="calh"><button class="icon" data-act="hm" data-d="-1" ${hmv>lo?'':'disabled'} aria-label="Tháng trước">${ICON.back}</button><button class="calt" data-act="hm-pick">Tháng ${m+1}, ${y} ${ICON.down}</button><button class="icon fwd" data-act="hm" data-d="1" ${hmv<cur?'':'disabled'} aria-label="Tháng sau">${ICON.back}</button></div>
  <div class="cal">${cells}</div><p class="msum">${mws.length?`<b>${mws.length}</b> buổi · <b>${fmtVol(mv)}</b> kg · <b>${durS(mt)}</b>`:'Chưa có buổi tập nào trong tháng này'}</p></div>`;
 const m30=ws.filter(w=>w.start>Date.now()-30*864e5).length;
 const W7=7*864e5;let b=startOfWeek(now).getTime()+W7,a=b-W7,streak=0;const has=(x,y)=>ws.some(w=>w.start>=x&&w.start<y);
 if(!has(a,b)){b=a;a-=W7}while(has(a,b)){streak++;b=a;a-=W7}
 let list=mws.length?`<p class="mon">Các buổi tháng ${m+1}</p>`:'';
 for(const w of mws){
  const prs=(w.prs||[]).length;
  list+=`<div class="card wc" data-act="wopen" data-id="${w.id}" role="button" tabindex="0"><div class="wc-h"><b>${esc(w.name)}</b><span>${fmtDate(w.start)} · ${hm(w.start)}</span></div><div class="wc-m"><span>${fmtMin(w.end-w.start)}</span><span>${fmtVol(wVol(w))} kg</span><span>${wSets(w)} set</span>${prs?`<span class="pr">${prs} kỷ lục</span>`:''}</div><ul>${w.exercises.slice(0,5).map(e=>{const bb=best(e.sets).top;return `<li><span>${e.sets.filter(s=>s.t!=='w').length} × ${esc(exOf(e.exId).name)}</span><small>${bb?setTxt(bb):''}</small></li>`}).join('')}${w.exercises.length>5?`<li><small>+${w.exercises.length-5} bài khác</small></li>`:''}</ul></div>`}
 return hdr('Lịch sử')+histSeg()+cal+`<div class="tiles t3" style="margin-top:8px"><div><b>${ws.length}</b><span>tổng số buổi</span></div><div><b>${m30}</b><span>buổi / 30 ngày</span></div><div><b>${streak}</b><span>tuần liên tiếp</span></div></div>`+
 (list||(ws.length?`<p class="empty">Tháng ${m+1} chưa có buổi tập nào.${hmv>lo?'<br>Bấm ‹ hoặc tên tháng để xem các tháng trước.':''}</p>`:`<p class="empty">Chưa có buổi tập nào.<br>Bắt đầu ở tab Tập.</p>`));
}

/* ---------- views: thống kê ---------- */
const wReps=w=>w.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(s.t!=='w'?(+s.r||0):0),0),0);
const wMin=w=>Math.max(0,(w.end-w.start)/60000);
const SM={vol:{l:'Volume',f:wVol,u:v=>fmtVol(v)+' kg',t:v=>v>=1000?fx(r1(v/1000))+'k':fmtVol(v)},
 dur:{l:'Thời gian',f:wMin,u:v=>v>=1?fmtMin(v*60000):'0 phút',t:v=>v>=60?fx(r1(v/60))+'g':Math.round(v)+'p'},
 sets:{l:'Set',f:wSets,u:v=>v+' set',t:v=>String(Math.round(v))},
 n:{l:'Buổi',f:()=>1,u:v=>v+' buổi',t:v=>String(Math.round(v))}};
const SP={30:'30 ngày',90:'3 tháng',365:'1 năm'};
function groupSets(ws){const m={};for(const w of ws)for(const e of w.exercises){const g=exOf(e.exId).group;if(g==='Cardio')continue;for(const s of e.sets)if(s.t!=='w')m[g]=(m[g]||0)+1}return m}
function statBuckets(){const sp=S.sp||30,now=new Date(),out=[];
 if(sp===365){for(let i=11;i>=0;i--){const a=new Date(now.getFullYear(),now.getMonth()-i,1),b=new Date(a.getFullYear(),a.getMonth()+1,1);out.push({a:+a,b:+b,l:String(a.getMonth()+1),k:i?'Tháng '+(a.getMonth()+1)+'/'+a.getFullYear():'Tháng này'})}}
 else{const n=sp===30?6:13,w0=startOfWeek(now);for(let i=n-1;i>=0;i--){const a=new Date(w0);a.setDate(a.getDate()-7*i);const b=new Date(a);b.setDate(b.getDate()+7);out.push({a:+a,b:+b,l:dm(+a),k:i?'Tuần '+dm(+a)+' – '+dm(+b-864e5):'Tuần này'})}}
 const m=SM[S.sm||'vol'];return out.map(x=>({l:x.l,k:x.k,v:D.workouts.filter(w=>w.start>=x.a&&w.start<x.b).reduce((s,w)=>s+m.f(w),0)}))}
const niceTop=v=>{if(!(v>0))return 1;const e=10**Math.floor(Math.log10(v)),f=v/e;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e};
/* biểu đồ cột: chạm / kéo để xem từng cột, giá trị hiện ở dòng phía trên */
function bars(el,pts,m){if(!el||!pts.length)return;const cap=$('#bcap');let hi=pts.length-1,geo=null;
 const draw=()=>{const W=el.clientWidth,H=el.clientHeight;if(!W||!H)return;const P={l:38,r:2,t:8,b:22},n=pts.length;
  const top=niceTop(Math.max(...pts.map(p=>p.v))),Y=v=>P.t+(1-v/top)*(H-P.t-P.b),y0=H-P.b;
  const bw=(W-P.l-P.r)/n,gap=Math.max(2,bw*.3),w=bw-gap;geo={P,bw};
  const cw=Math.max(...pts.map(p=>p.l.length))*6.2+8,step=Math.max(1,Math.ceil(cw*1.4/bw)),lab=i=>i===n-1||((n-1-i)%step===0&&n-1-i>=step);
  let h=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ ${m.l} theo ${S.sp===365?'tháng':'tuần'}">`;
  for(const t of [0,top/2,top])h+=`<line x1="${P.l}" x2="${W-P.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)" ${t?'stroke-dasharray="2 4"':''}/><text x="${P.l-6}" y="${Y(t)+4}" text-anchor="end" font-size="11" fill="var(--mute)">${m.t(t)}</text>`;
  pts.forEach((p,i)=>{const x=P.l+i*bw+gap/2,cx=x+w/2;
   if(i===hi&&!(p.v>0))h+=`<rect x="${x}" y="${y0-2}" width="${w}" height="2" fill="var(--red)"/>`;
   if(p.v>0){const y=Math.min(Y(p.v),y0-2),r=Math.min(4,w/2,y0-y);h+=`<path d="M${x} ${y0}V${y+r}Q${x} ${y} ${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y0}Z" fill="var(--red)" fill-opacity="${i===hi?1:.42}"/>`}
   if(lab(i))h+=`<text x="${i===n-1&&bw<cw?W-P.r:cx}" y="${H-6}" text-anchor="${i===n-1&&bw<cw?'end':'middle'}" font-size="11" fill="var(--mute)" ${i===hi?'font-weight="700"':''}>${p.l}</text>`});
  el.innerHTML=h+'</svg>';if(cap)cap.innerHTML=`<span>${pts[hi].k}</span><b>${m.u(pts[hi].v)}</b>`};
 const pick=e=>{if(!geo)return;const r=el.getBoundingClientRect(),i=Math.max(0,Math.min(pts.length-1,Math.floor((e.clientX-r.left-geo.P.l)/geo.bw)));if(i!==hi){hi=i;draw()}};
 el.onpointerdown=pick;el.onpointermove=e=>{if(e.buttons||e.pointerType==='mouse')pick(e)};
 draw();try{new ResizeObserver(draw).observe(el)}catch(e){}}
const dlt=(c,p)=>{if(!p)return c?'<em class="dlt up">mới</em>':'<em class="dlt dn">&nbsp;</em>';const d=Math.round((c-p)/p*100);return `<em class="dlt ${d>=0?'up':'dn'}">${d>0?'▲':d<0?'▼':'='} ${Math.abs(d)}% so với kỳ trước</em>`};
function mgBars(cur,prev,weeks){const pv=prev||{},gs=GROUPS.filter(g=>cur[g]||pv[g]);if(!gs.length)return '';
 gs.sort((a,b)=>(cur[b]||0)-(cur[a]||0)||(pv[b]||0)-(pv[a]||0));const mx=Math.max(...gs.map(g=>Math.max(cur[g]||0,pv[g]||0)));
 return `<div class="mg">${gs.map(g=>{const c=cur[g]||0,p=pv[g]||0;return `<div class="mg-r ${c?'':'zero'}"><span>${g}</span><div class="mg-b">${c?`<i style="width:${c/mx*100}%"></i>`:''}${prev?`<u style="left:${p/mx*100}%" title="Kỳ trước: ${p} set"></u>`:''}</div><b>${c}${weeks?`<small>${fx(r1(c/weeks))}/tuần</small>`:''}</b></div>`}).join('')}</div>`}
function vStats(){
 const sp=S.sp||30,now=Date.now(),a=now-sp*864e5,a0=a-sp*864e5;
 const cur=D.workouts.filter(w=>w.start>=a),prev=D.workouts.filter(w=>w.start>=a0&&w.start<a);
 const chips=`<div class="chips" style="margin-top:12px">${[30,90,365].map(k=>`<button class="chip ${sp===k?'on':''}" data-act="sp" data-k="${k}">${SP[k]}</button>`).join('')}</div>`;
 if(!D.workouts.length)return chips+`<p class="empty">Chưa có buổi tập nào để thống kê.</p>`;
 const sum=(ws,f)=>ws.reduce((s,w)=>s+f(w),0),T=[['n','buổi tập',v=>v],['vol','kg volume',fmtVol],['dur','thời gian',v=>durS(v*60000)],['sets','set',v=>v]];
 const tiles=`<div class="tiles" style="margin-top:12px">${T.map(([k,l,f])=>{const c=sum(cur,SM[k].f),p=sum(prev,SM[k].f);return `<div><b>${f(c)}</b><span>${l}</span>${dlt(c,p)}</div>`}).join('')}</div>`;
 const sm=S.sm||'vol';
 const chart=`<h2>${SM[sm].l} theo ${sp===365?'tháng':'tuần'}</h2><div class="seg" style="margin-top:10px">${Object.keys(SM).map(k=>`<button class="${sm===k?'on':''}" data-act="sm" data-k="${k}">${SM[k].l}</button>`).join('')}</div><div class="card"><div class="bcap" id="bcap"></div><div class="bars" id="statbars"></div></div>`;
 const weeks=sp/7,mg=mgBars(groupSets(cur),groupSets(prev),weeks);
 const muscle=`<h2>Phân bổ nhóm cơ</h2><p class="mute small" style="margin:4px 0 0">Số set làm việc (không tính khởi động). Mức hay dùng để tăng cơ: khoảng 10–20 set mỗi nhóm cơ lớn mỗi tuần.</p><div class="card">${mg||'<p class="empty">Chưa có set nào trong kỳ này.</p>'}${mg?`<div class="leg"><span><i></i>${SP[sp]} qua</span><span><u></u>${SP[sp]} trước đó</span></div>`:''}</div>`;
 const ex={};for(const w of cur.slice().reverse())for(const e of w.exercises){const ns=e.sets.filter(s=>s.t!=='w');if(!ns.length)continue;const x=ex[e.exId]||(ex[e.exId]={id:e.exId,n:0,s:0,e:[]});x.n++;x.s+=ns.length;const b=best(ns);if(b.mw>0)x.e.push(b.e1)}
 const top=Object.values(ex).sort((p,q)=>q.n-p.n||q.s-p.s).slice(0,5);
 const topH=top.length?`<h2>Bài tập chính</h2><div class="card">${top.map(x=>{const e=exOf(x.id),l=x.e[x.e.length-1],d=x.e.length>1?r1(l-x.e[0]):0;
  return `<div class="tx" data-act="exopen" data-id="${x.id}" role="button" tabindex="0">${thumb(e)}<div><b>${esc(e.name)}</b><small>${x.n} buổi · ${x.s} set</small></div><div class="tv">${l?`<b>${fx(r1(l))} kg</b><small>1RM ước tính${d?` · <span class="${d>0?'up1':''}">${d>0?'+':'−'}${fx(Math.abs(d))}</span>`:''}</small>`:''}</div></div>`}).join('')}</div>`:'';
 const prs=cur.flatMap(w=>(w.prs||[]).map(p=>Object.assign({t:w.start},p)));
 const prH=`<h2>Kỷ lục · ${prs.length}</h2>`+(prs.length?`<div class="card"><ul class="prs">${prs.slice(0,6).map(p=>`<li><i class="medal"></i><span>${esc(exOf(p.exId).name)}</span><small>${p.k} · ${dm(p.t)}</small><b>${p.v}</b></li>`).join('')}</ul></div>`:`<p class="empty">Chưa có kỷ lục mới trong ${SP[sp]} qua.</p>`);
 const WD=[1,2,3,4,5,6,0],wd=WD.map(d=>cur.filter(w=>new Date(w.start).getDay()===d).length),wm=Math.max(1,...wd);
 const avg=cur.length?sum(cur,wMin)/cur.length:0;
 const habit=`<h2>Thói quen</h2><div class="tiles t3" style="margin-top:10px"><div><b>${fx(r1(cur.length/weeks))}</b><span>buổi / tuần</span></div><div><b>${cur.length?durS(avg*60000):'—'}</b><span>TB mỗi buổi</span></div><div><b>${cur.length?Math.round(sum(cur,wSets)/cur.length):'—'}</b><span>set / buổi</span></div></div>
 <div class="card"><p class="lbl" style="margin:0 0 10px">Ngày tập trong tuần</p><div class="wd">${wd.map((c,i)=>`<div><b>${c||''}</b><i class="${c?'':'z'}" style="height:${c?Math.max(6,c/wm*64):2}px"></i><span>${DAY[WD[i]]}</span></div>`).join('')}</div></div>`;
 return chips+tiles+chart+muscle+topH+prH+habit;
}

/* ---------- views: exercises ---------- */
function usage(){const m={};for(const w of D.workouts)for(const e of w.exercises){const u=m[e.exId]||(m[e.exId]={n:0,mw:0,mt:0,mk:0,last:0});u.n++;u.last=Math.max(u.last,w.start);for(const s of e.sets)if(s.t!=='w'){u.mw=Math.max(u.mw,+s.w||0);u.mt=Math.max(u.mt,+s.tm||0);u.mk=Math.max(u.mk,+s.km||0)}}return m}
function exListHtml(){const q=norm(S.q),u=usage();
 const list=D.exercises.filter(e=>(!S.grp||e.group===S.grp)&&(!q||norm(e.name).includes(q)||norm(e.group).includes(q)))
  .sort((a,b)=>((u[b.id]||{}).n||0)-((u[a.id]||{}).n||0)||a.name.localeCompare(b.name));
 return list.map(e=>{const x=u[e.id];return `<div class="li" data-act="exopen" data-id="${e.id}" role="button" tabindex="0"><div class="lim">${thumb(e)}<div><b>${esc(e.name)}</b><small>${esc(e.group)}${x?' · '+x.n+' buổi':''}</small></div></div><span class="pv">${!x?'':x.mk?fx(x.mk)+' km':x.mw?fx(x.mw)+' kg':x.mt?fmtClock(x.mt):''}</span></div>`}).join('')||'<p class="empty">Không tìm thấy bài tập.</p>'}
/* ---------- map bài tập: bài đã tập nhưng không phải bài có sẵn (tự tạo / đã xoá / từ bản sao lưu cũ) ---------- */
const SYN={db:'dumbbell',dumbbells:'dumbbell',bb:'barbell',kb:'kettlebell',ohp:'overhead press',rdl:'romanian deadlift',sldl:'stiff leg deadlift',
 triceps:'tricep',biceps:'bicep',rows:'row',raises:'raise',curls:'curl',extensions:'extension',presses:'press',flyes:'fly',flys:'fly',flies:'fly',
 crossovers:'crossover',butterfly:'fly',pulldowns:'pulldown',pushdowns:'pushdown',squats:'squat',lunges:'lunge',dips:'dip',shrugs:'shrug',delts:'delt',deltoid:'delt',
 lats:'lat',glutes:'glute',calves:'calf',pullups:'pullup',chinups:'chinup',pushups:'pushup',situps:'situp'};
const EQUIP=new Set(['barbell','dumbbell','cable','machine','smith','kettlebell','band','bodyweight','ez']);
const MOVE=new Set(['press','fly','curl','row','squat','deadlift','raise','extension','pushdown','pulldown','pullup','chinup','pushup','dip','lunge','thrust','shrug','crunch','kickback','pullover','crossover','situp','abduction','adduction']);
const GW={chest:'Ngực',pec:'Ngực',shoulder:'Vai',delt:'Vai',back:'Lưng',lat:'Lưng',leg:'Chân',quad:'Chân',hamstring:'Chân',calf:'Chân',glute:'Mông',hip:'Mông',bicep:'Tay trước',tricep:'Tay sau',ab:'Bụng',abs:'Bụng',core:'Bụng'};
const STOP=new Set(['the','with','on','of','and','a','to','grip','-']);
function exToks(name){let s=norm(name).replace(/[()\-_/,.]+/g,' ').replace(/\bpull\s+(down|up)s?\b/g,'pull$1').replace(/\bpush\s+(down|up)s?\b/g,'push$1').replace(/\bchin\s+ups?\b/g,'chinup').replace(/\bsit\s+ups?\b/g,'situp').replace(/\bez\s*bar\b/g,'ez');
 const out=[];for(let t of s.split(/\s+/)){if(!t||STOP.has(t))continue;t=SYN[t]||t;out.push(...t.split(' '))}return new Set(out)}
function exSim(a,b){const A=exToks(a.name),B=exToks(b.name);if(!A.size||!B.size)return 0;
 const core=x=>[...x].filter(t=>!EQUIP.has(t)),cA=core(A),cB=new Set(core(B)),eA=[...A].filter(t=>EQUIP.has(t)),eB=[...B].filter(t=>EQUIP.has(t));
 const inter=cA.filter(t=>cB.has(t)).length;let sc=cA.length+cB.size?2*inter/(cA.length+cB.size):0;
 if(eA.length&&eB.length)sc+=eA.some(t=>eB.includes(t))?.12:-.12;
 const mA=cA.filter(t=>MOVE.has(t)),mB=[...cB].filter(t=>MOVE.has(t));if(mA.length&&mB.length)sc+=mA.some(t=>mB.includes(t))?.15:-.15;
 const gA=a.group&&a.group!=='Khác'?a.group:[...A].map(t=>GW[t]).find(Boolean);if(gA&&gA===b.group)sc+=.12;if(!b.custom)sc+=.04;return sc}
function mapList(){const u=usage(),have=new Set(D.exercises.map(e=>e.id));
 const custom=D.exercises.filter(e=>e.custom&&!e.keep&&u[e.id]).sort((a,b)=>u[b.id].n-u[a.id].n);
 const gone=Object.keys(u).filter(id=>!have.has(id));
 return{u,custom,gone}}
function mapHtml(){const {u,custom,gone}=mapList();
 const lib=D.exercises.filter(e=>!e.custom);
 const sug=e=>D.exercises.filter(x=>x.id!==e.id&&!(x.custom&&!u[x.id])).map(x=>({x,s:exSim(e,x)})).filter(o=>o.s>=.25).sort((p,q)=>q.s-p.s).slice(0,3);
 const item=e=>{const x=u[e.id],sg=sug(e);
  return `<div class="card mp"><div class="mp-h">${thumb(e)}<div><b>${esc(e.name)}</b><small>${esc(e.group)} · ${x.n} buổi · lần cuối ${dm(x.last)}</small></div></div>
  ${sg.length?`<p class="lbl" style="margin:10px 0 4px">Gần giống</p>${sg.map(o=>`<div class="mp-s">${thumb(o.x)}<div><b>${esc(o.x.name)}</b><small>${esc(o.x.group)}${o.x.custom?' · bài tự tạo':''}</small></div><button class="btn sm red" data-act="map-to" data-from="${e.id}" data-to="${o.x.id}">Gộp</button></div>`).join('')}`:`<p class="mute small" style="margin:10px 0 0">Không thấy bài gần giống trong thư viện.</p>`}
  <div class="row2"><button class="btn sm" data-act="map-pick" data-id="${e.id}">Chọn bài khác</button><button class="btn sm" data-act="map-keep" data-id="${e.id}">Giữ bài riêng</button></div></div>`};
 const gi=id=>`<div class="card mp"><div class="mp-h"><span class="th none">?</span><div><b>(Bài tập đã xoá)</b><small>${u[id].n} buổi · lần cuối ${dm(u[id].last)}</small></div></div><div class="row2"><button class="btn sm red" data-act="map-pick" data-id="${id}">Chọn bài để map</button></div></div>`;
 const kept=D.exercises.filter(e=>e.custom&&e.keep&&u[e.id]).length;
 return `<h3>Map bài tập</h3><p class="mute small" style="margin:-4px 0 6px">Các bài bạn đã tập nhưng không phải bài có sẵn trong thư viện (thường là bài tự tạo). Gộp vào bài có sẵn để có hình, hướng dẫn và thống kê nhóm cơ đúng. Lịch sử, kỷ lục và routine được chuyển theo.</p>
 ${custom.map(item).join('')}${gone.map(gi).join('')}
 ${!custom.length&&!gone.length?'<p class="empty">Không còn bài nào cần map.</p>':''}
 ${kept?`<p class="mute small" style="margin:14px 2px 0">${kept} bài đã chọn giữ riêng. <button class="link" data-act="map-unkeep" style="min-height:32px;padding:0">Hiện lại</button></p>`:''}`}
function mapOpen(){sheet(mapHtml(),'tall')}
/* chuyển toàn bộ dữ liệu từ bài `from` sang bài `to`, rồi xoá `from` khỏi thư viện */
function mergeEx(from,to){const t=Date.now();
 for(const w of D.workouts){let ch=false;for(const e of w.exercises)if(e.exId===from){e.exId=to;ch=true}if(ch)w.u=t}
 for(const r of D.routines){let ch=false;for(const it of r.items)if(it.exId===from){it.exId=to;ch=true}if(ch)r.u=t}
 if(D.active)for(const e of D.active.exercises)if(e.exId===from)e.exId=to;
 if(D.restBy[from]!=null){if(D.restBy[to]==null)D.restBy[to]=D.restBy[from];delete D.restBy[from]}
 if(D.exercises.some(e=>e.id===from)){tomb(from);D.exercises=D.exercises.filter(e=>e.id!==from)}
 EXM=null;for(const w of D.workouts)w.prs=computePRs(w);save()}
function vExList(){const mp=mapList(),mn=mp.custom.length+mp.gone.length;return hdr('Bài tập','',`<button class="icon" data-act="newex" aria-label="Bài tập mới">+</button>`)+
 (mn?`<button class="hint maph" data-act="map-open"><p><b>${mn} bài đã tập chưa có trong thư viện gốc</b><br>Xem bài gần giống và gộp lại</p><span aria-hidden="true">›</span></button>`:'')+
 `<input class="search" type="search" data-f="exq" value="${esc(S.q)}" placeholder="Tìm bài tập…" autocomplete="off"><div class="chips scroll">${['Tất cả'].concat(GROUPS).map(g=>`<button class="chip ${(S.grp||'Tất cả')===g?'on':''}" data-act="grp" data-g="${g}">${g}</button>`).join('')}</div><div id="exlist">${exListHtml()}</div>`}
const MET={e1:{l:'1RM',f:b=>b.e1,u:'kg'},mw:{l:'Tạ max',f:b=>b.mw,u:'kg'},tv:{l:'Volume',f:b=>b.tv,u:'kg'},mr:{l:'Reps',f:b=>b.mr,u:'reps'},tr:{l:'Tổng reps',f:b=>b.tr,u:'reps'},
 mt:{l:'Lâu nhất',f:b=>b.mt,c:fmtClock},tt:{l:'Tổng thời gian',f:b=>b.tt,c:fmtClock},mk:{l:'Quãng đường',f:b=>b.mk,u:'km'},pc:{l:'Pace',f:b=>b.pc,c:fmtPace}};
const METS={wr:['e1','mw','tv','mr'],r:['mr','tr'],t:['mt','tt'],wt:['mw','mt'],dt:['mk','mt','pc']};
/* các ô số liệu đầu trang bài tập, theo cách ghi của bài */
function exTiles(ty,b,n){const d=(v,f)=>v?f(v):'—';const T={
 wr:[[b.mw?fx(b.mw):'—','Tạ nặng nhất (kg)'],[b.e1&&b.mw?fx(r1(b.e1)):'—','1RM ước tính (kg)'],[b.bs?(+b.bs.w?fx(b.bs.w)+'×'+b.bs.r:b.bs.r+' reps'):'—','Set tốt nhất']],
 r:[[d(b.mr,String),'Reps nhiều nhất / set'],[d(b.tr,String),'Tổng reps']],
 t:[[d(b.mt,fmtClock),'Lâu nhất / set'],[d(b.tt,fmtClock),'Tổng thời gian']],
 wt:[[d(b.mw,fx),'Tạ nặng nhất (kg)'],[d(b.mt,fmtClock),'Lâu nhất / set']],
 dt:[[d(b.mk,fx),'Xa nhất (km)'],[d(b.mt,fmtClock),'Lâu nhất'],[d(b.pc,fmtPace),'Pace tốt nhất']]}[ty];
 if(n!=null)T.push([String(n),'Số buổi đã tập']);
 return `<div class="tiles${T.length===3?' t3':''}">${T.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`}
const sessHtml=x=>`<div class="sess"><b>${fmtDate(x.w.start)} · ${esc(x.w.name)}</b><p>${x.sets.map(s=>`${s.t==='w'?'<span class="wu">K</span> ':''}${setTxt(s).replace(' kg × ','×')}`).join('  ·  ')}</p></div>`;
function vExDetail(){
 const e=exOf(S.exId),ty=tyOf(e),h=exHistory(e.id),all=h.flatMap(x=>x.sets),b=best(all),ms=METS[ty];
 if(!ms.includes(S.met))S.met=ty==='wr'?(b.mw>0||!all.length?'e1':'mr'):ms[0];
 const recs=ty!=='wr'?[]:[1,2,3,5,8,10,12,15].map(r=>[r,Math.max(0,...all.filter(s=>s.t!=='w'&&+s.r>=r).map(s=>+s.w||0))]).filter(x=>x[1]>0);
 return hdr(e.name,`<button class="icon" data-act="exback" aria-label="Quay lại">${ICON.back}</button>`,`<button class="icon" data-act="exedit" aria-label="Sửa bài tập">${ICON.dots}</button>`,true)+
 `<p class="mute small" style="margin:-6px 0 12px 50px">${esc(e.group)} · ${TYS[ty].l}</p>${demoHtml(e)}<div style="height:14px"></div>
 ${exTiles(ty,b,h.length)}
 <div class="seg">${ms.map(k=>`<button class="${S.met===k?'on':''}" data-act="met" data-k="${k}">${MET[k].l}</button>`).join('')}</div>
 ${h.length>=2?`<div class="fig" id="exchart"></div>`:`<p class="empty card">Cần ít nhất 2 buổi để vẽ biểu đồ tiến bộ.</p>`}
 ${recs.length?`<h2>Kỷ lục theo số reps</h2><p class="mute small" style="margin:0 0 8px">Mức tạ nặng nhất bạn đã làm được với ít nhất ngần ấy reps.</p><table class="rec">${recs.map(([r,w])=>`<tr><td>${r} rep${r>1?'s':''}</td><td>${fx(w)} kg</td></tr>`).join('')}</table>`:''}
 <h2>Lịch sử</h2>${h.slice(0,S.hAll?h.length:5).map(sessHtml).join('')||'<p class="empty">Chưa tập bài này.</p>'}${h.length>5?`<button class="btn block" data-act="h-all" style="margin-top:10px">${S.hAll?'Thu gọn':'Xem tất cả '+h.length+' buổi'}</button>`:''}`;
}

/* ---------- views: body ---------- */
/* chỉ số cơ thể: kg/bf có từ trước, phần còn lại là các chỉ số thường có trên phiếu InBody.
   dir: 1 = tăng là tốt, -1 = giảm là tốt, 0 = trung tính */
const BM=[
 {k:'kg',l:'Cân nặng',en:'Weight',u:'kg',lo:20,hi:300,dir:0,g:'main'},
 {k:'bf',l:'% mỡ',en:'PBF',u:'%',lo:2,hi:70,dir:-1,g:'main'},
 {k:'smm',l:'Cơ xương',en:'Skeletal Muscle Mass',u:'kg',lo:5,hi:120,dir:1,g:'main'},
 {k:'fm',l:'Khối mỡ',en:'Body Fat Mass',u:'kg',lo:1,hi:200,dir:-1,g:'main'},
 {k:'vf',l:'Mỡ nội tạng',en:'Visceral Fat Level',u:'mức',lo:1,hi:30,dir:-1,g:'main'},
 {k:'tbw',l:'Nước',en:'Total Body Water',u:'L',lo:5,hi:150,dir:0,g:'main'},
 {k:'bmr',l:'BMR',en:'Basal Metabolic Rate',u:'kcal',lo:500,hi:5000,dir:1,g:'main'},
 {k:'sc',l:'Điểm InBody',en:'InBody Score',u:'điểm',lo:20,hi:120,dir:1,g:'main'},
 {k:'prot',l:'Protein',en:'Protein',u:'kg',lo:1,hi:50,dir:1,g:'comp',al:['protein','dam','chat dam']},
 {k:'mnr',l:'Khoáng chất',en:'Minerals',u:'kg',lo:.5,hi:15,dir:0,g:'comp',al:['khoang chat','khoang','minerals','mineral']},
 {k:'ffm',l:'FFM',en:'Fat Free Mass',u:'kg',lo:15,hi:200,dir:1,g:'comp',al:['ffm','fat free mass','khoi nac','khoi luong nac','luong nac','khoi luong khong mo','lean body mass','lbm']},
 {k:'bmi',l:'BMI',en:'Body Mass Index',u:'',lo:10,hi:70,dir:0,g:'comp',al:['bmi','chi so bmi','body mass index']},
 {k:'whr',l:'WHR',en:'Waist-Hip Ratio',u:'',lo:.5,hi:1.5,dir:-1,g:'comp',d:2,al:['whr','ti le eo hong','ty le eo hong','ti le vong eo vong hong','ty le vong eo vong hong','waist hip ratio']}];
/* số đo các vòng bằng thước dây (cm) */
BM.push(
 {k:'c_waist',l:'Vòng eo',en:'Waist',u:'cm',lo:40,hi:200,dir:-1,g:'tape',al:['vong eo','eo','waist','waist circumference']},
 {k:'c_hip',l:'Vòng hông / mông',en:'Hip',u:'cm',lo:50,hi:200,dir:0,g:'tape',al:['vong hong','vong mong','hong','mong','vong hong mong','hip','hips','hip circumference','glutes']},
 {k:'c_chest',l:'Vòng ngực',en:'Chest',u:'cm',lo:50,hi:200,dir:1,g:'tape',al:['vong nguc','nguc','chest','chest circumference']},
 {k:'c_shld',l:'Vòng vai',en:'Shoulders',u:'cm',lo:70,hi:220,dir:1,g:'tape',al:['vong vai','vai','shoulder','shoulders']},
 {k:'c_thigh_l',l:'Đùi trái',en:'Left thigh',u:'cm',lo:25,hi:120,dir:0,g:'tape',al:['dui trai','vong dui trai','dui t','vong dui t','left thigh','thigh left']},
 {k:'c_thigh_r',l:'Đùi phải',en:'Right thigh',u:'cm',lo:25,hi:120,dir:0,g:'tape',al:['dui phai','vong dui phai','dui p','vong dui p','right thigh','thigh right']},
 {k:'c_arm_l',l:'Bắp tay trái',en:'Left upper arm',u:'cm',lo:15,hi:70,dir:1,g:'tape',al:['bap tay trai','vong bap tay trai','bap tay t','vong bap tay t','left bicep','left biceps','left upper arm','left arm circumference']},
 {k:'c_arm_r',l:'Bắp tay phải',en:'Right upper arm',u:'cm',lo:15,hi:70,dir:1,g:'tape',al:['bap tay phai','vong bap tay phai','bap tay p','vong bap tay p','right bicep','right biceps','right upper arm','right arm circumference']},
 /* số đo cũ chưa tách bên (bản trước): chỉ hiện khi đã có dữ liệu, không còn ô nhập */
 {k:'c_thigh',l:'Đùi (chưa tách bên)',en:'Thigh',u:'cm',lo:25,hi:120,dir:0,g:'tape',old:1,al:['vong dui','dui','thigh','thighs']},
 {k:'c_arm',l:'Bắp tay (chưa tách bên)',en:'Upper arm',u:'cm',lo:15,hi:70,dir:1,g:'tape',old:1,al:['vong bap tay','bap tay','vong tay','arm','arms','bicep','biceps','upper arm']});
/* phân tích từng vùng: nạc / mỡ của tay, thân, chân — kg và % so với mức chuẩn trên phiếu */
const SEGS=[['la','tay T','Tay trái','left arm',['tay t','tay trai']],['ra','tay P','Tay phải','right arm',['tay p','tay phai']],['tr','thân','Thân','trunk',['than']],['ll','chân T','Chân trái','left leg',['chan t','chan trai']],['rl','chân P','Chân phải','right leg',['chan p','chan phai']]];
for(const [kd,L,vi,ens,dir] of [['ln','Nạc','nac',['lean mass','lean','segmental lean'],1],['ft','Mỡ','mo',['fat mass','fat','segmental fat'],-1]])
 for(const [sg,sl,,en,vf] of SEGS){
  const al=vf.flatMap(f=>[vi+' '+f,'luong '+vi+' '+f,'khoi '+vi+' '+f]).concat(ens.flatMap(e=>[en+' '+e,e+' '+en,e+' of '+en,e+' of the '+en]));
  BM.push({k:kd+'_'+sg,l:L+' '+sl,en:en+' '+ens[0],u:'kg',lo:kd==='ln'?.3:.05,hi:60,dir,g:'seg',d:2,al});
  BM.push({k:kd+'_'+sg+'_p',l:L+' '+sl,en:en+' '+ens[0]+' %',u:'%',lo:kd==='ln'?30:5,hi:kd==='ln'?250:1000,dir,g:'seg',al:al.map(a=>a+' %')})}
const BMK=Object.fromEntries(BM.map(m=>[m.k,m]));
const bmDec=m=>m.d!=null?m.d:1,bmRound=(m,v)=>Math.round(v*10**bmDec(m))/10**bmDec(m);
const bmFmt=(m,v)=>m.k==='bmr'?fmtVol(v):fx(bmRound(m,v));
const isIB=b=>BM.some(m=>m.k!=='kg'&&m.k!=='bf'&&m.g!=='tape'&&b[m.k]);
const hasTape=b=>BM.some(m=>m.g==='tape'&&b[m.k]);
/* chênh lệch có dấu, tô màu theo hướng tốt / xấu của chỉ số (kèm mũi tên nên không chỉ dựa vào màu) */
function bmDelta(m,v){if(v==null)return '<em class="dv mute">—</em>';const r=bmRound(m,v);if(!r)return '<em class="dv mute">= 0</em>';
 const good=m.dir?(r>0)===(m.dir>0):null;return `<em class="dv ${good===null?'':good?'gd':'bd'}">${r>0?'▲':'▼'} ${m.k==='bmr'?fmtVol(Math.abs(r)):fx(Math.abs(r))}</em>`}
/* bảng nạc / mỡ từng vùng của lần đo c, kèm chênh lệch so với lần đo p */
function segTable(c,p){const cell=(kd,sg)=>{const k=kd+'_'+sg,v=c[k],vp=c[k+'_p'];if(!v&&!vp)return '<td><span class="mute">—</span></td>';
  return `<td><b>${v?fx(bmRound(BMK[k],v)):'—'}</b><small>${vp?fx(r1(vp))+'%':''}${p&&p[k]&&v?' '+bmDelta(BMK[k],v-p[k]):''}</small></td>`};
 const imb=(a,b,l)=>{const x=c['ln_'+a],y=c['ln_'+b];if(!x||!y)return '';const d=Math.round(Math.abs(x-y)/Math.max(x,y)*100);return `${l} chênh ${d}%${d>=6?' (lệch rõ)':''}`};
 const note=[imb('la','ra','Tay'),imb('ll','rl','Chân')].filter(Boolean).join(' · ');
 return `<table class="cmp segt"><thead><tr><th></th><th>Nạc (kg)</th><th>Mỡ (kg)</th></tr></thead><tbody>${SEGS.map(([sg,,vi])=>`<tr><td>${vi}</td>${cell('ln',sg)}${cell('ft',sg)}</tr>`).join('')}</tbody></table>${note?`<p class="mute small" style="margin:8px 0 0">Cân đối nạc trái / phải: ${note}</p>`:''}`}
const hasSeg=b=>BM.some(m=>m.g==='seg'&&b[m.k]);
function vBody(){
 const s=D.body.slice().sort((a,b)=>a.d-b.d),last=s[s.length-1];
 const has=k=>s.filter(x=>x[k]);
 if(!BMK[S.bm]||BMK[S.bm].g==='seg'||!has(S.bm).length)S.bm=(BM.find(x=>x.g!=='seg'&&has(x.k).length)||BMK.kg).k;
 const m=BMK[S.bm],ser=has(m.k),cur=ser[ser.length-1],first=ser[0];
 const ago=Date.now()-30*864e5;let base=first;for(const x of ser)if(x.d<=ago)base=x;
 const lastOf=k=>{const l=has(k);return l.length?l[l.length-1][k]:0};
 const inp=x=>`<label><span>${x.l} <small>${x.u}</small></span><input id="b-${x.k}" inputmode="decimal" placeholder="${lastOf(x.k)?bmFmt(x,lastOf(x.k)):x.k==='kg'?'67':'—'}" autocomplete="off"></label>`;
 const form=`<div class="card"><div class="bform">${inp(BM[0])}${inp(BM[1])}<details class="more full" ${S.bmore?'open':''}><summary>Chỉ số InBody (tuỳ chọn)</summary><div class="bform">${BM.filter(x=>x.g!=='seg'&&x.k!=='kg'&&x.k!=='bf').map(inp).join('')}<details class="more full sub" ${S.bseg?'open':''}><summary>Nạc / mỡ từng vùng</summary><div class="bform">${BM.filter(x=>x.g==='seg').map(inp).join('')}</div></details></div></details><details class="more full tape" ${S.btape?'open':''}><summary>Số đo các vòng (cm)</summary><div class="bform">${BM.filter(x=>x.g==='tape'&&!x.old).map(inp).join('')}</div><p class="mute small" style="margin:6px 0 0">Đo bằng thước dây, buổi sáng trước khi ăn. Eo: ngang rốn. Hông / mông: chỗ to nhất. Đùi, bắp tay: chỗ to nhất của từng bên.</p></details><label class="full">Ngày<input id="bd" type="date" value="${ymd(new Date())}"></label><button class="btn red" data-act="body-add">Ghi số đo</button></div></div><div class="row2"><label class="btn">Nhập Excel / CSV<input class="vh" type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-f="imp-body"></label><button class="btn" data-act="bimp-tpl">Tải file mẫu</button></div>`;
 let stats='',tapeH='';
 if(last&&ser.length){
  const avail=BM.filter(x=>x.g!=='seg'&&has(x.k).length);
  stats+=(avail.length>1?`<div class="chips scroll">${avail.map(x=>`<button class="chip ${x.k===m.k?'on':''}" data-act="bm" data-k="${x.k}">${x.l}</button>`).join('')}</div>`:'')+
  `<div class="tiles t3" style="margin-top:12px"><div><b>${bmFmt(m,cur[m.k])}</b><span>${m.u?m.u+' ':''}hiện tại</span></div><div><b>${bmDelta(m,ser.length>1?cur[m.k]-base[m.k]:null)}</b><span>30 ngày qua</span></div><div><b>${bmDelta(m,ser.length>1?cur[m.k]-first[m.k]:null)}</b><span>từ ${dm(first.d)}</span></div></div>`+
  (ser.length>=2?`<div class="fig" id="bodychart" style="margin-top:8px"></div>`:'');
  /* bảng so sánh: mỗi chỉ số so với lần đo trước đó và lần đo đầu tiên có chỉ số đó */
  const row=x=>{const l=has(x.k),c=l[l.length-1],p=l[l.length-2],f=l[0];
   return `<tr><td>${x.l}<small>${[x.u,c===last?'':dm(c.d)].filter(Boolean).join(' · ')}</small></td><td><b>${bmFmt(x,c[x.k])}</b></td><td>${p?bmDelta(x,c[x.k]-p[x.k]):'<span class="mute">—</span>'}</td><td>${l.length>1?bmDelta(x,c[x.k]-f[x.k]):'<span class="mute">—</span>'}</td></tr>`};
  const rows=avail.filter(x=>x.g!=='tape').map(row).join(''),trows=avail.filter(x=>x.g==='tape').map(row).join('');
  const thd='<thead><tr><th></th><th>Hiện tại</th><th>Lần trước</th><th>Lần đầu</th></tr></thead>';
  const prevD=s.length>1?s[s.length-2].d:0;
  stats+=`<h2>So sánh các lần đo</h2><p class="mute small" style="margin:4px 0 0">Lần mới nhất ${fmtDate(last.d)}${prevD?', so với lần trước ('+dm(prevD)+') và lần đầu ('+dm(s[0].d)+')':''}. Xanh là thay đổi theo hướng tốt.</p>${rows?`<div class="card"><table class="cmp">${thd}<tbody>${rows}</tbody></table></div>`:''}`;
  if(trows){const tw=s.filter(x=>x.c_waist&&x.c_hip),t=tw[tw.length-1];
   tapeH=`<h2>Số đo các vòng</h2><div class="card"><table class="cmp">${thd}<tbody>${trows}</tbody></table>${(()=>{const L=s.filter(x=>x.c_thigh_l||x.c_arm_l),c=L[L.length-1];if(!c)return '';const f=(a,b,l)=>c[a]&&c[b]?`${l} ${c[a]>c[b]?'trái':'phải'} to hơn ${fx(Math.round(Math.abs(c[a]-c[b])*10)/10)} cm`:'';const t=[f('c_thigh_l','c_thigh_r','Đùi'),f('c_arm_l','c_arm_r','Bắp tay')].filter(Boolean).join(' · ');return t?`<p class="mute small" style="margin:10px 0 0">Trái / phải ${dm(c.d)}: ${t}</p>`:''})()}${t?`<p class="mute small" style="margin:6px 0 0">Tỉ lệ eo / hông ${fmtDate(t.d)}: <b>${fx(Math.round(t.c_waist/t.c_hip*100)/100)}</b>${tw.length>1?' (lần đầu '+fx(Math.round(tw[0].c_waist/tw[0].c_hip*100)/100)+')':''}</p>`:''}</div>`}
  /* thành phần cơ thể: cơ tăng / mỡ giảm kể từ lần InBody đầu tiên */
  const ib=s.filter(x=>x.smm&&x.fm);
  if(ib.length>=2){const a=ib[0],b=ib[ib.length-1],dm_=r1(b.smm-a.smm),df=r1(b.fm-a.fm),wk=Math.max(1,(b.d-a.d)/(7*864e5));
   stats+=`<div class="card ibs"><p class="lbl" style="margin:0 0 6px">Từ lần InBody ${dm(a.d)} đến ${dm(b.d)} (${Math.round(wk)} tuần)</p><div class="tiles"><div><b>${bmDelta(BMK.smm,dm_)}</b><span>kg cơ xương · ${fx(r1(dm_/wk*4))}/tháng</span></div><div><b>${bmDelta(BMK.fm,df)}</b><span>kg mỡ · ${fx(r1(df/wk*4))}/tháng</span></div></div></div>`}
  const sg=s.filter(hasSeg);
  if(sg.length){const c=sg[sg.length-1],p=sg[sg.length-2];
   stats+=`<h2>Phân tích từng vùng</h2><p class="mute small" style="margin:4px 0 0">Lần đo ${fmtDate(c.d)}${p?', mũi tên so với lần '+dm(p.d):''}. Số % là so với mức chuẩn in trên phiếu InBody.</p><div class="card">${segTable(c,p)}</div>`}
 }
 const list=s.slice().reverse().map(x=>`<div class="brow" data-act="body-open" data-id="${x.id}" role="button" tabindex="0"><span>${fmtDate(x.d)}${isIB(x)?' <em class="ib">InBody</em>':''}${hasTape(x)?' <em class="ib tp">Vòng</em>':''}</span><small>${x.bf?fx(x.bf)+' % mỡ':''}${x.smm?(x.bf?' · ':'')+fx(x.smm)+' kg cơ':''}</small><b>${x.kg?fx(x.kg)+' kg':x.c_waist?'eo '+fx(x.c_waist):''}</b></div>`).join('');
 return hdr('Cơ thể','',`<button class="icon" data-act="settings" aria-label="Cài đặt">${ICON.cog}</button>`)+form+stats+tapeH+
 `<h2>Các lần đo</h2>`+(list||'<p class="empty">Chưa có số đo nào.</p>');
}
/* ---------- views: routine editor ---------- */
/* routine: mỗi bài có plan = danh sách set {w,r,t}; sets (số set) giữ để tương thích dữ liệu cũ */
const rset=()=>({w:'',r:'',t:'n'});
const planOf=it=>it.plan&&it.plan.length?it.plan:Array.from({length:it.sets||3},rset);
/* set đã lưu (số) → mục tiêu trong routine (số); chuỗi đang sửa cũng nhận được (thời gian "1:30") */
const planFromSets=sets=>sets.map(s=>{const o={t:s.t==='w'?'w':'n'};for(const k of FK){const v=emp(s[k])?0:fparse(k,s[k]);o[k]=v>0?v:''}return o});
/* mục tiêu (số) → chuỗi trong ô nhập */
const planEdit=p=>{const o={t:p.t==='w'?'w':'n'};for(const k of FK)o[k]=fv(k,p[k]);return o};
/* tổng của routine: số bài, số set (kể cả khởi động), khối lượng dự kiến = Σ kg × reps của set thường;
   ô để trống thì lấy số của lần tập trước (giống số mờ gợi ý) */
function planTotals(items){let v=0,n=0;
 for(const it of items){const prev=((exHistory(it.exId)[0])||{}).sets||[];
  planOf(it).forEach((p,j)=>{n++;if(p.t==='w')return;const q=prev[j]||{};v+=(emp(p.w)?+q.w||0:num(p.w))*(emp(p.r)?+q.r||0:num(p.r))})}
 return{ex:items.length,n,v}}
const rSumHtml=t=>`<span><b>${t.ex}</b> bài</span><span><b>${t.n}</b> set</span><span><b>${fmtVol(t.v)}</b> kg khối lượng</span>`;
function vRoutine(){const r=S.draft;
 const card=(it,i)=>{const ex=exOf(it.exId),prev=((exHistory(it.exId)[0])||{}).sets||[],F=TYS[tyOf(ex)].f,fc=fCls(F);let n=0;
  const rows=it.plan.map((p,j)=>{const q=prev[j],lab=p.t==='w'?'K':String(++n);
   return `<div class="swr"><button class="swdel" data-act="r-sdel" data-i="${i}" data-j="${j}" tabindex="-1">Xoá</button><div class="row rrow ${fc}" data-sw="1"><button class="setno ${p.t==='w'?'wu':''}" data-act="r-stype" data-i="${i}" data-j="${j}" aria-label="${p.t==='w'?'Đổi thành set thường':'Đánh dấu set khởi động'}">${lab}</button>${F.map(k=>fInp('pv',k,p[k],q,i,j)).join('')}<button class="icon" data-act="r-sdel" data-i="${i}" data-j="${j}" ${it.plan.length>1?'':'disabled'} aria-label="Xoá set">${ICON.x}</button></div></div>`}).join('');
  return `<section class="card ex"><div class="ex-h" data-lp="r"><button class="exth" data-act="exinfo" data-id="${it.exId}" aria-label="Xem cách tập">${thumb(ex)}</button><button class="ex-name" data-act="exinfo" data-id="${it.exId}">${esc(ex.name)}</button><button class="icon danger" data-act="r-del" data-i="${i}" aria-label="Bỏ bài này">${ICON.x}</button></div><div class="ex-sub">${esc(ex.group)} · ${it.plan.length} set</div><div class="row rrow hd ${fc}"><span>Set</span>${F.map(k=>`<span>${FLD[k].h}</span>`).join('')}<span></span></div>${rows}<button class="btn ghost block" data-act="r-sadd" data-i="${i}">+ Thêm set</button></section>`};
 return hdr(r.id?'Sửa routine':'Routine mới',`<button class="link" data-act="r-cancel">Huỷ</button>`,`<button class="link strong" data-act="r-save">Lưu</button>`,true)+
 `<input class="field big" data-f="rname" value="${esc(r.name)}" placeholder="Tên routine, ví dụ: Push" autocomplete="off">
 <div class="wk-stats rsum" id="r-sum">${rSumHtml(planTotals(r.items))}</div>
 <p class="lbl">Ngày tập trong tuần</p><div class="chips">${[1,2,3,4,5,6,0].map(d=>`<button class="chip ${r.days.includes(d)?'on':''}" data-act="r-day" data-d="${d}">${DAY[d]}</button>`).join('')}</div>
 <div class="lblr"><p class="lbl">Bài tập</p>${r.items.length>1?`<button class="link strong" data-act="ro-open" data-k="r">${ICON.grip} Sắp xếp</button>`:''}</div><p class="mute small" style="margin:-4px 0 0">Số nhập ở đây sẽ điền sẵn khi bắt đầu buổi tập. Ô để trống: số mờ là kết quả lần tập trước. Chạm số thứ tự set để đổi thành set khởi động (K). Vuốt set sang trái để xoá; giữ tên bài để kéo đổi thứ tự.</p>${r.items.map(card).join('')||'<p class="empty card">Chưa có bài tập.</p>'}
 <button class="btn red block" data-act="r-add">+ Thêm bài tập</button>${r.id?`<button class="btn block danger" style="background:none" data-act="r-remove">Xoá routine</button>`:''}`}
