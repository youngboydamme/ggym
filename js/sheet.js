// GGym — sheet, toast, chọn bài, kết thúc buổi
/* ---------- sheet / toast ---------- */
function sheet(html,cls=''){const s=$('#sheet');s.innerHTML=`<div class="bd" data-act="close"></div><div class="panel ${cls}" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;s.classList.add('open')}
function closeSheet(){const s=$('#sheet');s.classList.remove('open');s.innerHTML=''}
function confirmSheet(msg,ok,fn){S.cf=fn;sheet(`<p class="cf">${msg}</p><button class="btn red block" data-act="cf-ok">${ok}</button><button class="btn block" data-act="close">Không</button>`)}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2600)}

/* ---------- picker ---------- */
function pickList(){const q=norm(S.pq),u=usage();const ok=e=>!q||norm(e.name).includes(q)||norm(e.group).includes(q);
 const item=e=>`<button data-act="pick" data-id="${e.id}"><span class="pi">${thumb(e)}<span>${esc(e.name)}</span></span><small>${esc(e.group)}</small></button>`;
 let h='';if(!q){const rec=D.exercises.filter(e=>u[e.id]).sort((a,b)=>u[b.id].last-u[a.id].last).slice(0,6);if(rec.length)h+=`<p class="pg">Gần đây</p>`+rec.map(item).join('')}
 for(const g of GROUPS){const l=D.exercises.filter(e=>e.group===g&&ok(e)).sort((a,b)=>a.name.localeCompare(b.name));if(l.length)h+=`<p class="pg">${g}</p>`+l.map(item).join('')}
 return h||'<p class="empty">Không thấy — tạo bài tập mới bên dưới.</p>'}
function openPicker(cb,title='Thêm bài tập'){S.pick=cb;S.pq='';sheet(`<h3>${title}</h3><input class="search" type="search" data-f="pickq" placeholder="Tìm bài tập…" autocomplete="off"><div id="picklist" class="plist">${pickList()}</div><button class="btn ghost block" data-act="newex" data-p="1">+ Tạo bài tập mới</button>`,'tall')}
function exSheet(e,fromPick){S.nxg=e?e.group:'Khác';S.nxt=e?tyOf(e):'wr';const used=e&&usage()[e.id];
 sheet(`<h3>${e?'Sửa bài tập':'Bài tập mới'}</h3><input id="nx-name" class="field" value="${e?esc(e.name):''}" placeholder="Tên, ví dụ: Cable Lateral Raise" autocomplete="off"><p class="lbl">Nhóm cơ</p><div class="chips" id="nx-g">${GROUPS.map(g=>`<button class="chip ${g===S.nxg?'on':''}" data-act="nxg" data-g="${g}">${g}</button>`).join('')}</div>
 <p class="lbl">Cách ghi set</p><div class="chips" id="nx-t">${Object.keys(TYS).map(k=>`<button class="chip ${k===S.nxt?'on':''}" data-act="nxt" data-t="${k}">${TYS[k].l}</button>`).join('')}</div><p class="mute small" id="nx-tx" style="margin:8px 2px 4px"><span>Ví dụ: ${TYS[S.nxt].x}</span>${used?' Đổi cách ghi không chuyển đổi các set đã lưu.':''}</p><button class="btn red block" data-act="nx-save" data-id="${e?e.id:''}" data-p="${fromPick?1:''}">Lưu</button>${e?`<button class="btn block" data-act="ref-pick" data-id="${e.id}">${e.ref||e.wg||LOCAL.has(e.id)?'Đổi':'Chọn'} hình / video minh hoạ</button>`:''}${e?`<button class="btn block danger" style="background:none" data-act="ex-remove" data-id="${e.id}">Xoá bài tập</button>`:''}`)}

/* ---------- workout actions ---------- */
function begin(o){const go=()=>{D.active=Object.assign({id:uid(),start:Date.now(),restEnd:0,restDur:0,name:'Buổi tập',exercises:[]},o);save();S.view='workout';closeSheet();render();scrollTo(0,0)};
 if(D.active)confirmSheet('Đang có một buổi tập dở. Bỏ buổi đó và bắt đầu buổi mới?','Bỏ và bắt đầu mới',go);else go()}
function partOfDay(){const h=new Date().getHours();return h<11?'sáng':h<14?'trưa':h<18?'chiều':'tối'}
function startRest(sec){if(!sec)return;const a=D.active;a.restDur=sec;a.restEnd=Date.now()+sec*1000;restTick()}
/* set đang tập (chuỗi) → set lưu (số), chỉ giữ các trường của cách ghi; bài chỉ reps lưu w = 0 */
function packSet(s,ty){const o={t:s.t==='w'?'w':'n'};for(const k of TYS[ty].f)o[k]=emp(s[k])?0:fparse(k,s[k]);if(ty==='r')o.w=0;return o}
function doFinish(){
 const a=D.active;
 const w={id:a.editId||uid(),u:Date.now(),name:(a.name||'').trim()||'Buổi tập',start:a.start,end:a.editId?a.end:Date.now(),routineId:a.routineId||null,
  exercises:a.exercises.map(e=>({exId:e.exId,sets:e.sets.filter(s=>s.done).map(s=>packSet(s,tyId(e.exId)))})).filter(e=>e.sets.length)};
 w.prs=computePRs(w);
 D.workouts=D.workouts.filter(x=>x.id!==w.id);D.workouts.push(w);D.workouts.sort((x,y)=>y.start-x.start);
 D.active=null;save();S.view=null;S.tab='history';S.hv='log';S.hm=mKey(w.start);render();scrollTo(0,0);summary(w);
}
function summary(w){const prs=w.prs||[];
 sheet(`<p class="lbl" style="margin-top:4px">Đã lưu buổi tập</p><h3>${esc(w.name)}</h3><div class="tiles t3"><div><b>${durS(w.end-w.start)||'1p'}</b><span>thời gian</span></div><div><b>${fmtVol(wVol(w))}</b><span>kg volume</span></div><div><b>${wSets(w)}</b><span>set</span></div></div>
 ${prs.length?`<p class="lbl">Kỷ lục mới · ${prs.length}</p><ul class="prs">${prs.map(p=>`<li><i class="medal"></i><span>${esc(exOf(p.exId).name)}</span><small>${p.k}</small><b>${p.v}</b></li>`).join('')}</ul>`:`<p class="mute">Không có kỷ lục mới lần này — đều tay là được.</p>`}
 ${w.routineId&&D.routines.some(r=>r.id===w.routineId)?`<button class="btn block" data-act="w2rupd" data-id="${w.id}">Cập nhật routine theo buổi này</button><p class="mute small" style="margin:6px 2px 0">Lấy số set và kg / reps vừa tập làm mục tiêu lần sau. Bài không tập hôm nay giữ nguyên, bài mới thêm vào cuối routine.</p>`:w.routineId?'':`<button class="btn block" data-act="w2r" data-id="${w.id}">Lưu thành routine</button>`}<button class="btn red block" data-act="close">Xong</button>`)}
function wDetail(w){
 sheet(`<h3>${esc(w.name)}</h3><p class="mute" style="margin-top:-6px">${DAYF[new Date(w.start).getDay()]}, ${dm(w.start)}/${new Date(w.start).getFullYear()} · ${hm(w.start)} · ${fmtMin(w.end-w.start)} · ${fmtVol(wVol(w))} kg</p>
 ${(w.prs||[]).length?`<ul class="prs">${w.prs.map(p=>`<li><i class="medal"></i><span>${esc(exOf(p.exId).name)}</span><small>${p.k}</small><b>${p.v}</b></li>`).join('')}</ul>`:''}
 ${(()=>{const g=groupSets([w]);return Object.keys(g).length>1?`<p class="lbl">Set theo nhóm cơ</p><div style="margin-bottom:14px">${mgBars(g,null,0)}</div>`:''})()}
 ${w.exercises.map(e=>{let n=0;return `<div class="dx"><b>${esc(exOf(e.exId).name)}</b><ol>${e.sets.map(s=>`<li><span class="sn ${s.t==='w'?'wu':''}">${s.t==='w'?'K':++n}</span>${setTxt(s)}</li>`).join('')}</ol></div>`}).join('')}
 <div class="row3"><button class="btn" data-act="wedit" data-id="${w.id}">Sửa</button><button class="btn" data-act="wrepeat" data-id="${w.id}">Tập lại</button><button class="btn danger" data-act="wdel" data-id="${w.id}">Xoá</button></div>`,'tall')}
const findW=id=>D.workouts.find(w=>w.id===id);

