// GGym — helpers: định dạng số, ngày giờ, 1RM, icon
/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const num=v=>{const n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0};
const r1=n=>Math.round(n*10)/10;
const fx=n=>String(Math.round(n*100)/100).replace('.',',');
const fmtNum=(n,d=1)=>Math.abs(n)>=1000?Math.round(n).toLocaleString('vi-VN'):fx(Math.round(n*10**d)/10**d);
const fmtVol=n=>Math.round(n).toLocaleString('vi-VN');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'d').toLowerCase().trim();
const DAY=['CN','T2','T3','T4','T5','T6','T7'];
const DAYF=['Chủ nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
const pad=n=>String(n).padStart(2,'0');
const dm=ts=>{const d=new Date(ts);return d.getDate()+'/'+(d.getMonth()+1)};
const hm=ts=>{const d=new Date(ts);return pad(d.getHours())+':'+pad(d.getMinutes())};
const fmtDate=ts=>{const d=new Date(ts);return DAY[d.getDay()]+', '+dm(ts)+(d.getFullYear()!==new Date().getFullYear()?'/'+d.getFullYear():'')};
const fmtClock=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?h+':'+pad(m)+':'+pad(x):m+':'+pad(x)};
const fmtMin=ms=>{const m=Math.max(1,Math.round(ms/60000));return m>=60?Math.floor(m/60)+' giờ '+(m%60?m%60+' phút':''):m+' phút'};
const durS=ms=>{if(ms<30000)return '0';const m=Math.round(ms/60000);return m>=60?Math.floor(m/60)+'g'+(m%60?pad(m%60):''):m+'p'};
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const dayKey=ts=>{const d=new Date(ts);return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
const mKey=ts=>{const d=new Date(ts);return d.getFullYear()*12+d.getMonth()};
const startOfWeek=now=>{const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d};
const epley=(w,r)=>r<=0?0:r===1?w:w*(1+r/30);
const ICON={
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 dots:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
 down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 cog:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 grip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 8h14M5 12h14M5 16h14"/></svg>',
 edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>'
};

