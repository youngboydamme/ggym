// GGym — sao lưu / khôi phục JSON, nhập số đo từ Excel / CSV, Cài đặt
/* ---------- import / export ---------- */
/* nhắc sao lưu: chưa đồng bộ Supabase thì dữ liệu chỉ nằm trên máy, nên nhắc xuất file mỗi 14 ngày
   (mốc lưu theo từng máy, không đồng bộ) */
const BKK='ggym.backupAt',BKD=14*864e5;
const backupAt=()=>{try{return +localStorage.getItem(BKK)||0}catch(e){return 0}};
const markBackup=(t=Date.now())=>{try{localStorage.setItem(BKK,String(t))}catch(e){}};
const needBackup=()=>!(getAuth()&&cloudCfg())&&D.workouts.length>=3&&Date.now()-backupAt()>BKD;
async function exportData(){const done=m=>{markBackup();toast(m);if(!S.view)render()};
 const a=getAuth(),who=a&&a.email?norm(a.email.split('@')[0]).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):'',name='ggym-'+(who||'backup')+'-'+ymd(new Date())+'.json',txt=JSON.stringify(stripD(D));
 let file=null;try{file=new File([txt],name,{type:'application/json'})}catch(e){}
 try{if(file&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});done('Đã xuất bản sao lưu');return}}catch(e){if(e&&e.name==='AbortError')return}
 try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();done('Đã tải file sao lưu');return}catch(e){}
 try{await navigator.clipboard.writeText(txt);done('Đã chép dữ liệu vào clipboard')}catch(e){toast('Thiết bị không cho xuất file')}}
function importJSON(txt){let x;try{x=JSON.parse(txt)}catch(e){return toast('File không phải JSON hợp lệ')}
 if(!x||!Array.isArray(x.workouts)||!Array.isArray(x.exercises))return toast('Không phải bản sao lưu của GGym');
 confirmSheet(`Thay toàn bộ dữ liệu hiện tại bằng bản sao lưu này (${x.workouts.length} buổi tập, ${(x.body||[]).length} lần đo)? Dữ liệu đang có trên máy sẽ bị ghi đè.`,'Khôi phục',()=>{const K=['workouts','body','routines','exercises'],t=Date.now(),keep=new Set(K.flatMap(k=>(x[k]||[]).map(i=>i.id))),del=Object.assign({},D.del,x.del||{}),sy=D.sync;K.forEach(k=>D[k].forEach(i=>{if(!keep.has(i.id))del[i.id]=t}));D=fix(x);K.forEach(k=>D[k].forEach(i=>{i.u=Math.max(i.u||0,t);delete del[i.id]}));D.del=del;D.sync=sy;EXM=null;save();S.view=null;S.tab='home';render();toast('Đã khôi phục')})}
function parseCSV(t,dl=','){const rows=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];
 if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
 else if(c==='"')q=true;else if(c===dl){row.push(f);f=''}
 else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=c}
 if(f!==''||row.length){row.push(f);rows.push(row)}return rows}
function parseDate(s){s=String(s||'').trim();const m=s.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
 if(m){const mo='janfebmaraprmayjunjulaugsepoctnovdec'.indexOf(m[2].toLowerCase())/3;if(mo>=0)return new Date(+m[3],mo,+m[1],+m[4],+m[5]).getTime()}
 const t=Date.parse(s);return isNaN(t)?null:t}
/* ---------- nhập số đo cơ thể / InBody từ Excel hoặc CSV ---------- */
/* tên cột được so khớp sau khi bỏ dấu, bỏ phần trong ngoặc (đơn vị, viết tắt) và ký tự lạ */
const BCOL={d:['ngay','ngay do','ngay kiem tra','thoi gian','date','test date','test date time','date time','datetime','measured on','measurement date','time'],
 kg:['can nang','trong luong','khoi luong','weight','body weight'],
 bf:['% mo','%mo','phan tram mo','ti le mo','ty le mo','% mo co the','pbf','percent body fat','body fat percentage','body fat percent','body fat %','% body fat','bf %','bf%','%bf'],
 smm:['co xuong','khoi co xuong','luong co xuong','co xuong kg','smm','skeletal muscle mass','skeletal muscle'],
 fm:['khoi mo','luong mo','khoi luong mo','mo','body fat mass','bfm','fat mass'],
 vf:['mo noi tang','muc mo noi tang','visceral fat level','visceral fat','vfl'],
 tbw:['nuoc','tong luong nuoc','luong nuoc','nuoc trong co the','total body water','tbw'],
 bmr:['bmr','basal metabolic rate','ti le trao doi chat co ban','trao doi chat co ban'],
 sc:['diem inbody','diem','inbody score','score']};
for(const m of BM)if(m.al)BCOL[m.k]=m.al;
/* khoá so khớp: bỏ dấu, bỏ phần trong ngoặc nhưng giữ dấu % của đơn vị, để "Nạc tay T (kg)" và "Nạc tay T (%)" là 2 cột khác nhau */
const hKey=h=>{const raw=String(h||''),pct=/[([]\s*%\s*[)\]]/.test(raw);return(norm(raw.replace(/\(.*?\)|\[.*?\]/g,' ')).replace(/[^a-z0-9%]+/g,' ').trim()+(pct?' %':'')).trim()};
const BAD_COL=/\b(limit|lower|upper|normal|range|min|max|target|control|chuan|muc tieu|dieu chinh|change|thay doi)\b/;
function bodyCols(head){const keys=head.map(hKey),out={},used=new Set(),E=Object.entries(BCOL);
 const take=(k,i)=>{if(i>=0&&out[k]==null&&!used.has(i)){out[k]=i;used.add(i)}};
 for(const [k,al] of E)take(k,keys.findIndex((x,i)=>!used.has(i)&&al.includes(x)));
 for(const [k,al] of E)if(out[k]==null&&(BMK[k]||{}).u==='%')take(k,keys.findIndex((x,i)=>!used.has(i)&&x.endsWith(' %')&&al.includes(x.slice(0,-2))));
 for(const [k,al] of E)if(out[k]==null)take(k,keys.findIndex((x,i)=>!used.has(i)&&x&&!BAD_COL.test(x)&&al.some(a=>a.length>=10&&x.includes(a))));
 return out}
/* ngày: ô ngày của Excel, số serial của Excel, yyyy-mm-dd, dd/mm/yyyy (kiểu Việt Nam), yyyyMMdd[HHmmss] */
function cellDate(v){if(v instanceof Date&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate(),12).getTime();
 if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*864e5));return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),12).getTime()}
 const s=String(v==null?'':v).trim();if(!s)return null;let m,y,mo,d;
 if((m=s.match(/^(\d{4})(\d{2})(\d{2})(\d{4,6})?$/)))[y,mo,d]=[+m[1],+m[2],+m[3]];
 else if((m=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)))[y,mo,d]=[+m[1],+m[2],+m[3]];
 else if((m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))){y=+m[3];if(y<100)y+=2000;[d,mo]=+m[2]>12?[+m[2],+m[1]]:[+m[1],+m[2]]}
 else{const t=parseDate(s);if(t==null)return null;const x=new Date(t);[y,mo,d]=[x.getFullYear(),x.getMonth()+1,x.getDate()]}
 if(!(mo>=1&&mo<=12&&d>=1&&d<=31&&y>1990&&y<2100))return null;return new Date(y,mo-1,d,12).getTime()}
function cellNum(v,k){if(typeof v==='number')return v;let s=String(v==null?'':v).trim().replace(/[^\d.,-]/g,'');
 if(k==='bmr'&&/^\d{1,2}[.,]\d{3}$/.test(s))s=s.replace(/[.,]/,''); // 1.685 kcal kiểu Việt Nam
 return num(s)}
function importBody(rows){
 rows=rows.filter(r=>r&&r.some(c=>String(c==null?'':c).trim()!==''));
 let hi=-1,cols=null;for(let i=0;i<Math.min(rows.length,15);i++){const c=bodyCols(rows[i]);if(c.d!=null&&Object.keys(c).length>=2){hi=i;cols=c;break}}
 if(!cols)return sheet(`<h3>Không nhận ra file</h3><p>Không tìm thấy dòng tiêu đề có cột <b>Ngày</b> và ít nhất một chỉ số (Cân nặng, % mỡ, Cơ xương…).</p><p class="mute small">Mẹo: tải <b>File mẫu</b> ở tab Cơ thể, dán số liệu vào đúng cột rồi lưu lại dạng .xlsx hoặc CSV UTF-8.</p><button class="btn red block" data-act="close">Đóng</button>`);
 const head=rows[hi],got=BM.filter(m=>cols[m.k]!=null),used=new Set(Object.values(cols));
 const skipCols=head.map((h,i)=>used.has(i)?'':String(h||'').trim()).filter(Boolean);
 const byDay=new Map();let bad=0,badVal=0;
 for(const r of rows.slice(hi+1)){const t=cellDate(r[cols.d]);if(!t){bad++;continue}const val={};
  for(const m of got){const x=cellNum(r[cols[m.k]],m.k);if(!x)continue;if(x>=m.lo&&x<=m.hi)val[m.k]=Math.round(x*100)/100;else badVal++}
  if(!Object.keys(val).length){bad++;continue}
  const k=dayKey(t);byDay.set(k,Object.assign(byDay.get(k)||{d:t},val))}
 const items=[...byDay.values()].sort((a,b)=>a.d-b.d);
 const have=new Map(D.body.map(b=>[dayKey(b.d),b]));
 const upd=items.filter(x=>have.has(dayKey(x.d))),noKg=[];
 const ok=items;
 if(!ok.length)return sheet(`<h3>Không có lần đo hợp lệ</h3><p>Đọc được cột ${got.map(m=>m.l).join(', ')} nhưng không có dòng nào đủ ngày và số đo${noKg.length?' (lần đo mới cần có cân nặng)':''}.</p><button class="btn red block" data-act="close">Đóng</button>`);
 S.bimp=ok;const L=ok[ok.length-1];
 sheet(`<h3>Nhập số đo cơ thể</h3><p class="cf" style="margin-bottom:6px">Đọc được <b>${ok.length}</b> lần đo, từ ${fmtDate(ok[0].d)} đến ${fmtDate(L.d)}.</p>
 <ul class="imp">${upd.length?`<li>${upd.length} ngày đã có số đo: sẽ cập nhật các chỉ số có trong file, giữ nguyên chỉ số khác</li>`:''}${bad?`<li>Bỏ qua ${bad} dòng không đọc được ngày hoặc số liệu</li>`:''}${badVal?`<li>Bỏ qua ${badVal} ô có số nằm ngoài khoảng hợp lý</li>`:''}${noKg.length?`<li>Bỏ qua ${noKg.length} lần đo mới không có cân nặng</li>`:''}${skipCols.length?`<li class="mute">Cột không dùng: ${esc(skipCols.slice(0,8).join(', '))}${skipCols.length>8?'…':''}</li>`:''}</ul>
 <p class="lbl">Lần đo mới nhất trong file · ${dm(L.d)}</p><table class="cmp"><tbody>${got.filter(m=>m.g!=='seg').map(m=>`<tr><td>${m.l}<small>cột “${esc(String(head[cols[m.k]]).trim())}”</small></td><td><b>${L[m.k]!=null?bmFmt(m,L[m.k]):'—'}</b> <span class="mute small">${m.u}</span></td></tr>`).join('')}</tbody></table>${got.some(m=>m.g==='seg')?`<p class="lbl">Từng vùng · nhận ${got.filter(m=>m.g==='seg').length}/20 cột</p>${segTable(L,null)}`:''}
 <button class="btn red block" data-act="bimp-ok">Nhập ${ok.length} lần đo</button><button class="btn block" data-act="close">Huỷ</button>`,'tall')}
let xlsxP=null;
const loadXLSX=()=>xlsxP||(xlsxP=new Promise((ok,no)=>{if(window.XLSX)return ok(window.XLSX);const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=()=>window.XLSX?ok(window.XLSX):no();s.onerror=()=>{xlsxP=null;no()};document.head.appendChild(s)}));
async function readBodyFile(file){
 if(/\.xlsx?$|\.xlsm$/i.test(file.name)||/spreadsheet|excel/.test(file.type)){
  let X;try{toast('Đang đọc file Excel…');X=await loadXLSX()}catch(e){return toast('Cần có mạng ở lần đầu đọc file Excel')}
  try{const wb=X.read(await file.arrayBuffer(),{type:'array',cellDates:true});
   /* chọn sheet đầu tiên có dòng tiêu đề nhận ra được */
   let best=null;for(const n of wb.SheetNames){const rows=X.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''});if(rows.slice(0,15).some(r=>{const c=bodyCols(r);return c.d!=null&&Object.keys(c).length>=2})){best=rows;break}if(!best)best=rows}
   return importBody(best||[])}catch(e){return toast('Không đọc được file Excel')}}
 const buf=await file.arrayBuffer();let txt=new TextDecoder('utf-8').decode(buf);
 if(txt.includes('�'))try{txt=new TextDecoder('windows-1258').decode(buf)}catch(e){} // CSV lưu từ Excel tiếng Việt kiểu cũ
 txt=txt.replace(/^﻿/,'');const l1=txt.split(/\r?\n/,1)[0],dl=[',',';','\t'].sort((a,b)=>l1.split(b).length-l1.split(a).length)[0];
 importBody(parseCSV(txt,dl))}
function bodyTemplate(){const head=['Ngày','Cân nặng (kg)','% mỡ','Cơ xương (kg)','Khối mỡ (kg)','Mỡ nội tạng','Nước (L)','BMR (kcal)','Điểm InBody','Protein (kg)','Khoáng chất (kg)','FFM (kg)','BMI','WHR'].concat(['Nạc','Mỡ'].flatMap(k=>['tay T','tay P','thân','chân T','chân P'].flatMap(v=>[`${k} ${v} (kg)`,`${k} ${v} (%)`])));
 saveFile('ggym-mau-so-do.csv','﻿'+head.join(',')+'\r\n','text/csv')}
async function saveFile(name,txt,type){let file=null;try{file=new File([txt],name,{type})}catch(e){}
 try{if(file&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e&&e.name==='AbortError')return}
 try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();toast('Đã tải '+name)}catch(e){toast('Thiết bị không cho tải file')}}
function settingsSheet(){const st=D.settings;
 sheet(`<h3>Cài đặt</h3><p class="lbl">Thời gian nghỉ mặc định</p><div class="chips">${[60,90,120,150,180].map(s=>`<button class="chip ${st.rest===s?'on':''}" data-act="defrest" data-s="${s}">${fmtClock(s)}</button>`).join('')}</div>
 <div class="tg" style="margin-top:12px"><span>Âm báo khi hết giờ nghỉ</span><button class="sw ${st.sound?'on':''}" data-act="tgl" data-k="sound" aria-pressed="${!!st.sound}" aria-label="Âm báo"></button></div>
 <div class="tg"><span>Giữ màn hình sáng khi đang tập</span><button class="sw ${st.wake?'on':''}" data-act="tgl" data-k="wake" aria-pressed="${!!st.wake}" aria-label="Giữ màn hình sáng"></button></div>
 ${cloudHtml()}
 <p class="lbl">Sao lưu</p><p class="mute small" style="margin:0">${getAuth()&&cloudCfg()?'Dữ liệu được đồng bộ lên Supabase; vẫn nên thỉnh thoảng xuất một bản sao lưu.':'Dữ liệu chỉ nằm trên máy này. Thỉnh thoảng xuất một bản sao lưu vào Tệp / iCloud Drive cho chắc.'}</p>
 <button class="btn block" data-act="export">Xuất dữ liệu (.json)</button>
 <label class="btn block">Khôi phục từ bản sao lưu<input class="vh" type="file" accept=".json,application/json" data-f="imp-json"></label>
 <p class="mute small">${D.workouts.length} buổi tập · ${D.exercises.length} bài tập · ${D.routines.length} routine · ${D.body.length} lần đo${canStore?'':' · ⚠ không ghi được bộ nhớ'}</p>
 <p class="mute small" style="margin-top:-4px">Lưu trên máy: ${idbOk===false?'localStorage (IndexedDB không dùng được)':'IndexedDB'+(lsOk?' + bản dự phòng':'')}${persisted?' · đã bật lưu lâu dài':''}${backupAt()?' · sao lưu gần nhất '+fmtDate(backupAt()):''}</p>
 <button class="btn block" data-act="share-app">Gửi link cài app cho bạn bè</button>
 <button class="btn block danger" style="background:none" data-act="wipe">Xoá toàn bộ dữ liệu</button>`,'tall')}



