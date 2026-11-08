'use strict';
const $=id=>document.getElementById(id), fmt=n=>new Intl.NumberFormat('fa-IR').format(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=s=>String(s).trim().replace(/[۰-۹]/g,c=>c.charCodeAt(0)-1776).replace(/[٠-٩]/g,c=>c.charCodeAt(0)-1632);
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const db=JSON.parse(localStorage.getItem('sjd-desk')||'{"trips":[],"car":{"name":"ساندرو","km":0,"insurance":""},"services":[],"bills":[]}');
const persian=new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric'});
function parts(date){const obj={};for(const p of persian.formatToParts(date))obj[p.type]=Number(p.value);return [obj.year,obj.month,obj.day];}
const stamp=arr=>arr.map((v,i)=>i?String(v).padStart(2,'0'):v).join('/');
const today=()=>stamp(parts(new Date()));
function localDate(s){
 const [y,m,d]=s.split('/').map(Number);if(!y||m<1||m>12||d<1||d>31||y<1300||y>1550)return null;
 let time=new Date(y+621,2,20,9);time.setDate(time.getDate()+(m<=7?(m-1)*31:186+(m-7)*30)+d-1);
 for(let delta=-3;delta<=3;delta++){const v=new Date(time);v.setDate(v.getDate()+delta);if(stamp(parts(v))===s)return v;}
 return null;
}
function dateField(name,optional=false){
 const raw=digits($(name).value).replace(/-/g,'/');if(optional&&!raw)return '';
 const s=stamp(raw.split('/').map(Number));if(!localDate(s))throw Error('تاریخ شمسی معتبر وارد کن، مثل '+today());return s;
}
function integer(id,min=0){const raw=digits($(id).value).replace(/[,٬]/g,'');const n=Number(raw);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(n)||n<min||n>1e12)throw Error('عدد صحیح معتبر وارد کن');return n;}
function req(id){const v=$(id).value.trim();if(!v)throw Error('فیلدهای لازم را تکمیل کن');return v;}
const fld=(id,label,v='',mode='text')=>'<label>'+label+'<input id="'+id+'" inputmode="'+mode+'" maxlength="180" value="'+esc(v)+'"></label>';
const opt=(id,label,items)=>'<label>'+label+'<select id="'+id+'">'+items.map((v,i)=>'<option value="'+i+'">'+esc(v)+'</option>').join('')+'</select></label>';
const entry=(title,detail,tools='')=>'<article class="entry"><b>'+esc(title)+'</b><p>'+esc(detail)+'</p>'+(tools?'<div class="tools">'+tools+'</div>':'')+'</article>';
const empty=t=>'<p class="empty">'+t+'</p>';
const btn=(action,id,label)=>'<button data-action="'+action+'" data-id="'+esc(id)+'">'+label+'</button>';
function receipt(id){return btn('scan',id,'اسکن رسید')+(window.Native?.hasReceipt?.(id)?btn('view',id,'مشاهدهٔ رسید'):'');}
let tripId=localStorage.getItem('desk-trip'),tab='trip',mode='',month=parts(new Date()).slice(0,2),day='';
function current(){return db.trips.find(t=>t.id===tripId)||db.trips[0];}
function amounts(sum,weights){
 const total=weights.reduce((a,b)=>a+b,0), items=weights.map((w,i)=>({i,n:Math.floor(sum*w/total),r:(sum*w)%total}));
 let left=sum-items.reduce((a,x)=>a+x.n,0);
 for(const item of items.slice().sort((a,b)=>b.r-a.r).slice(0,left))item.n++;
 return items.map(x=>x.n);
}
function balance(t){
 const bal=t.members.map(()=>0);for(const e of t.costs){bal[e.payer]+=e.sum;amounts(e.sum,e.weights).forEach((n,i)=>bal[i]-=n);}
 const lines=[];for(let i=0;i<bal.length;i++)for(let j=0;j<bal.length&&bal[i]<0;j++)if(bal[j]>0){
 const n=Math.min(-bal[i],bal[j]);lines.push(t.members[i]+' به '+t.members[j]+' · '+fmt(n)+' تومان');bal[i]+=n;bal[j]-=n;}
 return lines;
}
function trips(){
 const t=current();$('tripBody').hidden=!t;$('tripList').hidden=!t;
 $('tripList').innerHTML=db.trips.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join('');
 if(!t){$('tripTotal').textContent='اولین سفر یا دورهمی را بساز';return;}
 $('tripList').value=t.id;$('tripTotal').textContent='جمع هزینه‌ها · '+fmt(t.costs.reduce((a,e)=>a+e.sum,0))+' تومان';
 $('expenses').innerHTML=t.costs.slice().reverse().map(e=>entry(e.name+' · '+fmt(e.sum)+' تومان','پرداخت از '+t.members[e.payer]+' · '+e.weights.map((w,i)=>w?t.members[i]+' × '+fmt(w):'').filter(Boolean).join('، '),receipt(e.id)+btn('removeCost',e.id,'حذف'))).join('')||empty('هنوز هزینه‌ای ثبت نشده.');
 $('settle').innerHTML=balance(t).map(s=>entry(s,'')).join('')||empty(t.costs.length?'حساب‌ها تسویه است.':'بعد از ثبت هزینه، سهم هر نفر اینجا می‌آید.');
}
function car(){
 const c=db.car;$('carName').textContent=c.name;
 const last=db.services.filter(s=>s.next>0).sort((a,b)=>b.km-a.km)[0];
 $('carSummary').textContent='کارکرد '+fmt(c.km)+' کیلومتر'+(last?' · '+last.title+'؛ '+(last.next>c.km?fmt(last.next-c.km)+' کیلومتر تا سرویس':'موعد سرویس رسیده'):'')+(c.insurance?' · بیمه تا '+c.insurance:'');
 $('services').innerHTML=db.services.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.km-a.km).map(s=>entry(s.title+' · '+fmt(s.cost)+' تومان',s.date+' · '+fmt(s.km)+' کیلومتر'+(s.next?' · سرویس بعدی '+fmt(s.next):'')+(s.note?' · '+s.note:''),btn('removeService',s.id,'حذف'))).join('')||empty('روغن، تعمیرات و هزینه‌های خودرو را از «ثبت سرویس» اضافه کن.');
}
function shiftMonth(n){let [y,m]=month;m+=n;if(m===13){m=1;y++;}if(m===0){m=12;y--;}month=[y,m];day='';bills();}
function bills(){
 const prefix=stamp(month)+'/';const first=localDate(prefix+'01');const rows=db.bills.filter(b=>b.date.startsWith(prefix));
 $('month').textContent=new Intl.DateTimeFormat('fa-IR',{month:'long',year:'numeric'}).format(first);
 let html=['ش','ی','د','س','چ','پ','ج'].map(x=>'<small>'+x+'</small>').join('')+'<i></i>'.repeat((first.getDay()+1)%7);
 for(let d=1;d<=31;d++){const v=prefix+String(d).padStart(2,'0');if(!localDate(v))break;
 html+='<button data-day="'+v+'" class="'+(day===v?'active':'')+'" data-has="'+rows.some(b=>b.date===v)+'">'+fmt(d)+'</button>';}
 $('calendar').innerHTML=html;$('billTitle').textContent=day?'پرداخت‌های '+day:'پرداخت‌های ماه';
 $('billRows').innerHTML=rows.filter(b=>!day||b.date===day).sort((a,b)=>a.date.localeCompare(b.date)).map(b=>entry(b.title+' · '+fmt(b.sum)+' تومان',b.date+' · '+(b.paid?'پرداخت شده':'در انتظار پرداخت'),btn('toggle',b.id,b.paid?'بازگشت به پرداخت‌نشده':'ثبت پرداخت')+receipt(b.id)+btn('removeBill',b.id,'حذف'))).join('')||empty('پرداختی برای این بازه ثبت نشده.');
}
function reminders(){
 const list={};function add(id,title,s,date,lead,tab){let at=localDate(date);if(!at)return;at.setDate(at.getDate()-lead);list[id]={title,text:s+' · سررسید '+date,at:+at,tab};}
 for(const b of db.bills)if(!b.paid)add(b.id,b.title,fmt(b.sum)+' تومان',b.date,b.lead,'bills');
 if(db.car.insurance)add('car-insurance','تمدید بیمهٔ '+db.car.name,'یادآوری بیمه',db.car.insurance,7,'car');
 window.Native?.dueList?.(JSON.stringify(list));
}
function save(){localStorage.setItem('sjd-desk',JSON.stringify(db));reminders();render();}
function render(){({trip:trips,car,bills})[tab]();}
function select(t){tab=['car','bills'].includes(t)?t:'trip';document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);$(b.dataset.tab).hidden=b.dataset.tab!==tab;});render();}
function editor(type){
 mode=type;const t=current();let html='',title='';
 if(type==='newTrip'){title='سفر یا دورهمی جدید';html=fld('name','نام سفر')+fld('members','نام افراد یا خانواده‌ها، با ویرگول جدا کن');}
 if(type==='expense'){title='ثبت هزینه';html=fld('name','برای چه چیزی؟')+fld('sum','مبلغ به تومان','','numeric')+opt('payer','چه کسی پرداخت کرد؟',t.members)+'<p class="minor">سهم هر نفر از این هزینه؛ صفر برای کسی که شریک نیست.</p>'+t.members.map((m,i)=>'<label class="weight">'+esc(m)+'<input id="w'+i+'" inputmode="numeric" value="۱"></label>').join('');}
 if(type==='carInfo'){title='مشخصات خودرو';html=fld('name','نام خودرو',db.car.name)+fld('km','کیلومتر فعلی',db.car.km,'numeric')+fld('insurance','پایان بیمه (شمسی) · اختیاری',db.car.insurance);}
 if(type==='service'){title='ثبت سرویس';html=fld('name','نوع سرویس یا تعمیر')+fld('date','تاریخ شمسی',today())+fld('km','کیلومتر سرویس',db.car.km,'numeric')+fld('cost','هزینه به تومان','','numeric')+fld('nextKm','کیلومتر سرویس بعدی · اختیاری','','numeric')+fld('note','توضیح، مثلاً نوع روغن');}
 if(type==='bill'){title='پرداخت جدید';html=fld('name','عنوان قسط، چک یا قبض')+fld('sum','مبلغ به تومان','','numeric')+fld('date','سررسید شمسی',day||today())+opt('lead','زمان یادآوری',['روز سررسید','یک روز قبل','سه روز قبل','هفت روز قبل']);}
 $('editorTitle').textContent=title;$('fields').innerHTML=html;$('err').textContent='';$('editor').showModal();
}
$('form').onsubmit=e=>{e.preventDefault();try{
 if(mode==='newTrip'){const name=req('name'),members=req('members').split(/[,،\n]/).map(s=>s.trim()).filter(Boolean);if(members.length<2||members.length>30||new Set(members).size!==members.length)throw Error('۲ تا ۳۰ نام متفاوت وارد کن');const id=uid();db.trips.push({id,name,members,costs:[]});tripId=id;localStorage.setItem('desk-trip',id);}
 if(mode==='expense'){const t=current(),weights=t.members.map((_,i)=>integer('w'+i));if(!weights.some(Boolean)||weights.some(w=>w>100))throw Error('سهم‌ها بین صفر و ۱۰۰ و دست‌کم یک سهم مثبت باشد');t.costs.push({id:uid(),name:req('name'),sum:integer('sum',1),payer:Number($('payer').value),weights});}
 if(mode==='carInfo'){db.car={name:req('name'),km:integer('km'),insurance:dateField('insurance',true)};if(db.car.insurance)window.Native?.duePermission?.();}
 if(mode==='service'){const km=integer('km'),next=$('nextKm').value.trim()?integer('nextKm'):0;if(next&&next<=km)throw Error('کیلومتر بعدی باید بیشتر باشد');db.services.push({id:uid(),title:req('name'),date:dateField('date'),cost:integer('cost'),km,next,note:$('note').value.trim()});db.car.km=Math.max(db.car.km,km);}
 if(mode==='bill'){const date=dateField('date');db.bills.push({id:uid(),title:req('name'),sum:integer('sum',1),date,lead:[0,1,3,7][+$('lead').value],paid:false});month=date.split('/').slice(0,2).map(Number);day=date;window.Native?.duePermission?.();}
 save();$('editor').close();}catch(ex){$('err').textContent=ex.message;}};
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;const {action,id,open,tab:t,day:d}=b.dataset;
 if(t){location.replace('#'+t);select(t);}if(open)editor(open);if(d){day=day===d?'':d;bills();}
 if(action==='scan')Native.scan(id);if(action==='view')Native.viewReceipt(id);
 if(action==='toggle'){const row=db.bills.find(b=>b.id===id);row.paid=!row.paid;save();}
 if(action?.startsWith('remove')&&confirm('این مورد حذف شود؟')){if(action==='removeCost')current().costs=current().costs.filter(x=>x.id!==id);if(action==='removeService')db.services=db.services.filter(x=>x.id!==id);if(action==='removeBill')db.bills=db.bills.filter(x=>x.id!==id);save();}
});
$('tripList').onchange=e=>{tripId=e.target.value;localStorage.setItem('desk-trip',tripId);trips();};
$('share').onclick=()=>{const t=current();Native.shareDesk([t.name,$('tripTotal').textContent,...balance(t)].join('\n'));};
$('prev').onclick=()=>shiftMonth(-1);$('next').onclick=()=>shiftMonth(1);$('close').onclick=()=>$('editor').close();
window.refreshDesk=render;select(location.hash.slice(1));reminders();

window.addEventListener('hashchange',()=>select(location.hash.slice(1)));
