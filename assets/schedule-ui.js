const scheduler=(()=>{
 const by=id=>document.getElementById(id);
 const weekdays={'6':'شنبه','7':'یکشنبه','1':'دوشنبه','2':'سه‌شنبه','3':'چهارشنبه','4':'پنجشنبه','5':'جمعه'};
 const order=['6','7','1','2','3','4','5'];
 const dayFormat=new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn',{day:'numeric'});
 const fullFormat=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{day:'numeric',month:'short',year:'numeric'});
 const number=new Intl.NumberFormat('fa-IR');
 const parse=s=>new Date(s+'T12:00:00');
 const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 function shift(d,n){const v=new Date(d);v.setDate(v.getDate()+n);return v;}
 const first=d=>shift(d,1-Number(dayFormat.format(d)));
 let cursor=first(new Date()),days=new Set(),dates=new Set();
 function chip(text,key,set){
  const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.key=key;
  b.setAttribute('aria-pressed',String(set.has(key)));b.onclick=()=>{if(set.has(key))set.delete(key);else set.add(key);paint();};return b;
 }
 function paint(){
  const mode=by('repeat').value;
  by('scheduleFields').hidden=!by('withAlarm').checked;by('clock').disabled=!by('withAlarm').checked;
  by('weekChoices').hidden=mode!=='week';by('dateChoices').hidden=mode!=='dates';by('scheduleError').textContent='';
  if(mode==='week')by('weekChoices').replaceChildren(...order.map(k=>chip(weekdays[k],k,days)));
  if(mode!=='dates')return;
  const monthEnd=first(shift(cursor,32)),grid=by('monthGrid');grid.replaceChildren();
  by('calTitle').textContent=cursor.toLocaleDateString('fa-IR',{month:'long',year:'numeric'});
  for(const c of ['ش','ی','د','س','چ','پ','ج']){const small=document.createElement('small');small.textContent=c;grid.append(small);}
  for(let i=0;i<(cursor.getDay()+1)%7;i++)grid.append(document.createElement('i'));
  const now=iso(new Date());
  for(let date=cursor;iso(date)<iso(monthEnd);date=shift(date,1)){
   const key=iso(date),b=chip(number.format(Number(dayFormat.format(date))),key,dates);b.disabled=key<now&&!dates.has(key);grid.append(b);
  }
  by('chosen').textContent=dates.size?[...dates].sort().map(d=>fullFormat.format(parse(d))).join('، '):'یک یا چند تاریخ را لمس کن.';
 }
 function load(row,type){
  const minute=new Date(Date.now()+5*60000);
  by('repeat').value=row?.mode||(type==='quick'?'dates':'daily');
  days=new Set(row?.mode==='week'?row.choices:[]);
  dates=new Set(row?.mode==='dates'?row.choices:type==='quick'&&!row?[iso(minute)]:[]);
  cursor=first(dates.size?parse([...dates].sort().find(d=>d>=iso(new Date()))||iso(new Date())):new Date());
  if(!row&&type==='quick')by('clock').value=String(minute.getHours()).padStart(2,'0')+':'+String(minute.getMinutes()).padStart(2,'0');
  paint();
 }
 function collect(time){
  if(!time)return {mode:'daily',choices:[]};
  const mode=by('repeat').value,choices=mode==='week'?[...days].sort():mode==='dates'?[...dates].sort():[];
  if(mode!=='daily'&&!choices.length)throw Error(mode==='week'?'حداقل یک روز هفته انتخاب کن.':'حداقل یک تاریخ انتخاب کن.');
  if(mode==='dates'&&!choices.some(d=>new Date(d+'T'+time+':00').getTime()>Date.now()))throw Error('حداقل یک تاریخ و ساعت آینده انتخاب کن.');
  return {mode,choices};
 }
 function label(r){
  if(!r.time)return '';
  let when='هر روز';
  if(r.mode==='week')when=order.filter(d=>r.choices.includes(d)).map(d=>weekdays[d]).join('، ');
  if(r.mode==='dates')when=r.choices.map(d=>fullFormat.format(parse(d))).join('، ');
  return when+' · '+r.time;
 }
 by('repeat').onchange=paint;by('prevMonth').onclick=()=>{cursor=first(shift(cursor,-1));paint();};by('nextMonth').onclick=()=>{cursor=first(shift(cursor,32));paint();};
 return {load,collect,label,paint};
})();
