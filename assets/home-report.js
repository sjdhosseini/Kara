'use strict';
const HomeReport=(()=>{
 const finite=Number.isFinite, n=(v,d=1)=>finite(v)?new Intl.NumberFormat('fa-IR',{maximumFractionDigits:d}).format(v):'نامشخص';
 const at=(o,k,i)=>finite(o?.[k]?.[i])?o[k][i]:null;
 const sum=a=>a.length&&a.every(finite)?a.reduce((a,b)=>a+b,0):null;
 const max=a=>a.some(finite)?Math.max(...a.filter(finite)):null;
 const rain=(h,i)=>{const a=at(h,'rain',i),b=at(h,'showers',i);return a===null||b===null?null:a+b;};
 const fmt=(t,zone,clock=true)=>new Intl.DateTimeFormat('fa-IR',{timeZone:zone,weekday:'short',day:'numeric',month:'short',...(clock?{hour:'2-digit',minute:'2-digit'}:{})}).format(t*1000);
 function generate(d,now){
  const h=d.hourly||{},times=h.time||[],zone=d.timezone||'Asia/Tehran',start=times.find(t=>t>=now),blocks=[];
  for(const offset of [0,24,48]){
   const ids=times.map((t,i)=>t>=start+offset*3600&&t<start+(offset+24)*3600?i:-1).filter(i=>i>=0);
   const temps=ids.map(i=>at(h,'temperature_2m',i)).filter(finite), rains=ids.map(i=>rain(h,i)),snows=ids.map(i=>at(h,'snowfall',i));
   const complete=ids.length===24&&ids.every((i,j)=>times[i]===start+(offset+j)*3600);
   blocks.push({label:offset===0?'۲۴ ساعت اول':offset===24?'۲۴ تا ۴۸ ساعت آینده':'۴۸ تا ۷۲ ساعت آینده',text:!complete?'دادهٔ ساعتی کامل این بازه موجود نیست.':'دما '+n(temps.length?Math.min(...temps):null)+' تا '+n(max(temps))+' درجه؛ باران و رگبار '+n(sum(rains))+' میلی‌متر، برف تازه '+n(sum(snows))+' سانتی‌متر؛ بیشینهٔ باد '+n(max(ids.map(i=>at(h,'wind_speed_10m',i))))+' کیلومتر بر ساعت. بیشترین احتمال بارش '+n(max(ids.map(i=>at(h,'precipitation_probability',i))))+'٪.'});
  }
  const ids=times.map((t,i)=>t>=now&&t<now+72*3600?i:-1).filter(i=>i>=0),events=[];
  for(const kind of ['rain','snow','thunder','wind']){let group=null;
   for(const i of ids){const t=times[i],value=kind==='rain'?rain(h,i):kind==='snow'?at(h,'snowfall',i):kind==='thunder'?([95,96,99].includes(at(h,'weather_code',i))?1:0):at(h,'wind_gusts_10m',i),active=finite(value)&&value>(kind==='wind'?59.99:0);
    if(!active){group=null;continue;}if(!group||t-group.end!==3600){group={kind,start:kind==='rain'||kind==='snow'?t-3600:t,end:t,amount:0,peak:0,peakTime:t};events.push(group);}group.end=t;group.amount+=value;if(value>group.peak){group.peak=value;group.peakTime=t;}}
  }
  events.sort((a,b)=>a.start-b.start);
  const names={rain:'باران و رگبار',snow:'برف',thunder:'احتمال رعدوبرق',wind:'تندباد'};
  const eventText=events.map(e=>names[e.kind]+' · '+fmt(e.start,zone)+' تا '+fmt(e.end,zone)+(e.kind==='rain'||e.kind==='snow'?'؛ مجموع '+n(e.amount)+(e.kind==='snow'?' سانتی‌متر':' میلی‌متر')+'، اوج در ساعت منتهی به '+fmt(e.peakTime,zone)+' با '+n(e.peak)+(e.kind==='snow'?' سانتی‌متر.':' میلی‌متر.'):e.kind==='wind'?'؛ اوج '+n(e.peak)+' کیلومتر بر ساعت.':'.'));
  const a=d.daily,days=[];
  if(a?.time?.length)for(let i=0;i<Math.min(10,a.time.length);i++){
   const r=at(a,'rain_sum',i),sh=at(a,'showers_sum',i),rr=r!==null&&sh!==null?r+sh:null,sn=at(a,'snowfall_sum',i),gust=at(a,'wind_gusts_10m_max',i),low=at(a,'temperature_2m_min',i),high=at(a,'temperature_2m_max',i),code=at(a,'weather_code',i),facts=[];
   if(rr>0)facts.push('باران '+n(rr)+' میلی‌متر'+(rr>=20?' (مجموع روزانه قابل‌توجه)':''));if(sn>0)facts.push('برف تازه '+n(sn)+' سانتی‌متر');if([95,96,99].includes(code))facts.push('احتمال رعدوبرق');if(gust>=60)facts.push('تندباد تا '+n(gust)+' کیلومتر بر ساعت');if(low<=0&&low!==null)facts.push('کمینهٔ دما '+n(low)+' درجه؛ احتمال یخ‌زدگی');if(high>=35)facts.push('گرمای '+n(high)+' درجه');
   const prev=at(a,'temperature_2m_max',i-1);if(i&&prev!==null&&high!==null&&Math.abs(high-prev)>=5)facts.push((high<prev?'افت':'افزایش')+' '+n(Math.abs(high-prev))+' درجه‌ای بیشینه نسبت به روز قبل');
   const complete=[rr,sn,gust,low,high,code].every(finite);
   days.push({date:fmt(a.time[i],zone,false),text:facts.length?facts.join('؛ ')+'.':complete?'بارش، تندباد یا تغییر شدید دما پیش‌بینی نشده است.':'دادهٔ کافی برای ارزیابی پدیده‌های مهم این روز موجود نیست.',range:'دما '+n(low)+' تا '+n(high)+' درجه',important:facts.length>0});
  }
  const coverage=ids.length>=71&&ids.every((i,j)=>!j||times[i]-times[ids[j-1]]===3600)&&ids.every(i=>[rain(h,i),at(h,'snowfall',i),at(h,'weather_code',i),at(h,'wind_gusts_10m',i)].every(finite));
  return {blocks,events:eventText,empty:coverage?'در ۷۲ ساعت آینده باران، برف، رعدوبرق یا تندباد قابل‌توجهی پیش‌بینی نشده است.':'برای مشخص‌کردن تمام پدیده‌های ۷۲ ساعت، دادهٔ کافی موجود نیست.',days};
 }
 return {generate};
})();
