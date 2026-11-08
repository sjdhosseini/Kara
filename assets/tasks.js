'use strict';
const el=id=>document.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const tasks=read('sjd-tasks-v1',[]);
const native=window.Native;
let tab='daily',editId=null;
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const done=row=>row.type==='daily'||(row.time&&(row.mode!=='dates'||row.choices?.length>1))?row.done===today():Boolean(row.done);
function sync(){
 const alarms={};
 for(const t of tasks)if(t.time&&!(t.type==='quick'&&done(t)&&t.mode==='dates'&&t.choices?.length===1))alarms[t.id]={title:t.title,time:t.time,done:t.done||'',type:t.type,mode:t.mode||'daily',choices:t.choices||[],action:t.action||null};
 return native?.taskAlarms?.(JSON.stringify(alarms));
}
function persist(){localStorage.setItem('sjd-tasks-v1',JSON.stringify(tasks));if(sync()===false)alert('تنظیم زنگ انجام نشد. دوباره تلاش کن.');draw();}
function button(label,fn,aria){const b=document.createElement('button');b.type='button';b.textContent=label;if(aria)b.setAttribute('aria-label',aria);b.onclick=fn;return b;}
function reset(){editId=null;el('title').value='';el('withAlarm').checked=true;el('clock').disabled=false;el('clock').value='09:00';el('submitTask').textContent='افزودن';scheduler.load(null,tab);taskAction.load(null);}
function access(){
 const box=el('access');box.replaceChildren();if(!tasks.some(t=>t.time)||!native)return;
 if(!native.notificationsOn())box.append(button('فعال‌کردن اعلان‌ها',()=>native.enableNotifications()));
 if(!native.exactTasks())box.append('تا فعال‌کردن دسترسی زنگ دقیق، زمان یادآوری تقریبی است. ',button('اجازهٔ زنگ دقیق',()=>native.exactSettings()));
}
function draw(){
 const entries=tasks.filter(t=>t.type===tab).sort((a,b)=>Number(done(a))-Number(done(b))||(a.time||'99').localeCompare(b.time||'99')||b.created-a.created);
 const list=el('taskList');list.replaceChildren();
 el('leftCount').textContent=new Intl.NumberFormat('fa-IR').format(entries.filter(t=>!done(t)).length)+' باقی‌مانده';
 if(!entries.length)list.textContent=tab==='daily'?'هنوز کار روزانه‌ای ثبت نکردی.':'هر کاری که همین حالا به ذهنت رسید اینجا اضافه کن.';
 for(const t of entries){
  const row=document.createElement('article');row.className='entry'+(done(t)?' checked':'');
  const check=button(done(t)?'✓':'○',()=>{t.done=done(t)?'':today();persist();},'تغییر وضعیت '+t.title);check.className='check';check.setAttribute('aria-pressed',String(done(t)));
  const info=document.createElement('div'),title=document.createElement('b'),meta=document.createElement('p');title.textContent=t.title;meta.textContent=t.time?scheduler.label(t):done(t)?'انجام شد':'';info.append(title,meta);
  if(t.action)info.append(button(taskAction.label(t.action),()=>native?.launchTaskAction?.(JSON.stringify(t.action))));
  row.append(check,info,button('ویرایش',()=>{editId=t.id;el('title').value=t.title;el('withAlarm').checked=!!t.time;el('clock').disabled=!t.time;el('clock').value=t.time||'09:00';scheduler.load(t,tab);taskAction.load(t);el('submitTask').textContent='ذخیرهٔ تغییر';el('title').focus();}),button('حذف',()=>{const controls=document.createElement('div');controls.append(button('تأیید حذف',()=>{tasks.splice(tasks.indexOf(t),1);if(editId===t.id)reset();persist();}),button('لغو',draw));row.replaceChildren(info,controls);}));list.append(row);
 }
 setTimeout(access,0);
}
function options(){return read('weatherOptions',{auto:true,alerts:true,rain:10,wind:60});}
function weather(save=false){
 const o=options();
 if(save){o.alerts=el('weatherOn').checked;o.lead=Number(el('lead').value);if(o.alerts)o.auto=true;localStorage.setItem('weatherOptions',JSON.stringify(o));}
 el('weatherOn').checked=!!(o.auto&&o.alerts);el('lead').value=String(o.lead||6);
 const config={...o,place:read('place',{name:'قائم‌شهر',lat:36.463,lon:52.86}),favorites:read('favorites',[]),model:read('model','best_match')};
 native?.configure?.(JSON.stringify(config));
 const status=JSON.parse(native?.backgroundStatus?.()||'{}');
 el('wxStatus').textContent=(!status.permission?'برای هشدار، اجازهٔ اعلان لازم است. ':'')+(status.checked?'آخرین بررسی: '+new Date(status.checked).toLocaleString('fa-IR'):'در انتظار اولین بررسی')+(status.error?' · '+status.error:'');
}
function select(name){
 window.cancelTaskVoiceDraft?.();
 tab=['weather','quick'].includes(name)?name:'daily';reset();
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 el('taskPanel').hidden=tab==='weather';el('weatherPanel').hidden=tab!=='weather';el('pageTitle').textContent=tab==='weather'?'هشدارهای هواشناسی':'کارهای من';
 if(tab==='weather'){weather();return;}
 el('taskLabel').textContent=tab==='daily'?'کار تکرارشوندهٔ روزانه':'کار لحظه‌ای';el('clockBox').hidden=false;el('listTitle').textContent=tab==='daily'?'کارهای امروز':'فهرست لحظه‌ای';draw();
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{location.replace('#'+b.dataset.tab);select(b.dataset.tab);});
el('withAlarm').onchange=scheduler.paint;
el('add').onsubmit=e=>{
 e.preventDefault();const title=el('title').value.trim();if(!title)return;
 const time=el('withAlarm').checked?el('clock').value:'';if(el('withAlarm').checked&&!/^\d\d:\d\d$/.test(time)){el('clock').focus();return;}
 let schedule,action;try{schedule=scheduler.collect(time);action=taskAction.collect();}catch(error){el('scheduleError').textContent=error.message;return;}
 const row=tasks.find(t=>t.id===editId)||{id:crypto.randomUUID?.()||('t'+Date.now().toString(36)+Math.random().toString(36).slice(2)),type:tab,created:Date.now(),done:''};row.title=title;row.time=time;row.action=action;Object.assign(row,schedule);
 if(!editId)tasks.push(row);reset();persist();window.cancelTaskVoiceDraft?.();if(el('voiceStatus'))el('voiceStatus').textContent='کار ثبت شد.';if(time&&!native?.notificationsOn?.())native?.duePermission?.();if(new URLSearchParams(location.search).has('entry'))location.href='home.html';
};
el('weatherOn').onchange=()=>{weather(true);if(el('weatherOn').checked&&!native?.notificationsOn?.())native?.duePermission?.();};el('lead').onchange=()=>weather(true);
el('allowWx').onclick=()=>native?.enableNotifications?.();el('checkWx').onclick=()=>{native?.checkWeather?.();el('wxStatus').textContent='درخواست بررسی ثبت شد.';};
window.refreshTasks=()=>{if(tab==='weather')weather();else draw();};
setInterval(()=>{if(!document.hidden)window.refreshTasks();},60000);
window.addEventListener('hashchange',()=>select(location.hash.slice(1)));select(location.hash.slice(1));

window.applyVoiceTaskDraft=d=>{
 editId=null;tab=d.type;
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 el('taskLabel').textContent=tab==='daily'?'کار تکرارشونده':'کار لحظه‌ای';el('listTitle').textContent=tab==='daily'?'کارهای امروز':'فهرست لحظه‌ای';
 el('title').value=d.title;el('withAlarm').checked=true;scheduler.load(d,tab);el('clock').value=d.time;el('clock').disabled=false;
 taskAction.load(null);el('title').dispatchEvent(new Event('input'));if(d.body)el('draft').value=d.body;
 el('submitTask').textContent='ثبت کار و زنگ';draw();
};
