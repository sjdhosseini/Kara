'use strict';
const VoiceTaskParser=(()=>{
 const weekdays=[['شنبه','6'],['یکشنبه','7'],['دوشنبه','1'],['سهشنبه','2'],['چهارشنبه','3'],['پنجشنبه','4'],['جمعه','5']];
 const words={'صفر':0,'یک':1,'یه':1,'دو':2,'سه':3,'چهار':4,'پنج':5,'شش':6,'شیش':6,'هفت':7,'هشت':8,'نه':9,'نُه':9,'ده':10,'یازده':11,'دوازده':12,'سیزده':13,'چهارده':14,'پانزده':15,'شانزده':16,'هفده':17,'هجده':18,'نوزده':19,'بیست':20,'سی':30,'چهل':40,'پنجاه':50,'شصت':60};
 const digits=s=>s.replace(/[۰-۹]/g,c=>c.charCodeAt(0)-1776).replace(/[٠-٩]/g,c=>c.charCodeAt(0)-1632);
 const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const clock=(h,m)=>String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
 function normalize(s){s=digits(String(s)).replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200f\u200e]/g,' ').replace(/[،,؟!]/g,' ').replace(/\s+/g,' ').trim();s=s.replace(/پس\s*فردا/g,'پسفردا').replace(/یک\s*شنبه/g,'یکشنبه').replace(/دو\s*شنبه/g,'دوشنبه').replace(/سه\s*شنبه/g,'سهشنبه').replace(/چهار\s*شنبه/g,'چهارشنبه').replace(/پنج\s*شنبه/g,'پنجشنبه');
 s=s.replace(new RegExp('(^|\\s)('+Object.keys(words).sort((a,b)=>b.length-a.length).join('|')+')(?=\\s|$)','g'),(_,space,w)=>space+words[w]);
 s=s.replace(/\b(20|30|40|50) و ([1-9])\b/g,(_,a,b)=>Number(a)+Number(b));s=s.replace(/(\d+) ساعت و (نیم|ربع) (?=دیگه|دیگر|بعد)/g,'$1 و $2 ساعت ');return s;}
 function parse(raw,now=new Date(),chosenTime=''){
  let s=normalize(raw);if(!/ساعت/.test(s))s=s.replace(/(\d{1,2}(?: و (?:نیم|ربع))?) (صبح|بامداد|عصر|شب|ظهر)/,'ساعت $1 $2');let title=s,issues=[],time='',mode='dates',choices=[],type='quick',ambiguous=[],hasDay=false;const original=s;let body='';if(/پیامک|پیام |اس ام اس/.test(title)){const m=title.match(/\s+که\s+(.+)$/);if(m){body=m[1];title=title.slice(0,m.index);s=title;}}
  const remove=x=>{title=title.replace(x,' ').replace(/\s+/g,' ').trim();};
  const relative=s.match(/(?:تا\s+)?(\d+|نیم|ربع)(?:\s+و\s+(نیم|ربع|\d+))?\s*(دقیقه|ساعت)\s*(?:دیگه|دیگر|بعد)/);
  if(relative){let n=relative[1]==='نیم'?.5:relative[1]==='ربع'?.25:Number(relative[1]);if(relative[2])n+=relative[2]==='نیم'?.5:relative[2]==='ربع'?.25:Number(relative[2])/60;const delta=n*(relative[3]==='ساعت'?60:1);if(delta>0&&delta<=525600){const d=new Date(now.getTime()+Math.ceil(delta)*60000);d.setSeconds(0,0);time=clock(d.getHours(),d.getMinutes());choices=[iso(d)];hasDay=true;}else issues.push('فاصلهٔ زمانی معتبر نیست.');remove(relative[0]);}
  const daily=/(?:هر روز|روزانه)/.test(title),weekly=/(?:هر\s|هفته|ها(?:\s|$))/.test(title);
  const found=weekdays.filter(([day])=>new RegExp('(?:^|\\s)'+day+'(?:\\s*ها)?(?=\\s|$)').test(title));
  if(daily){mode='daily';type='daily';remove(/هر روز|روزانه/g);hasDay=true;}
  else if(found.length){hasDay=true;mode=weekly?'week':'dates';type=weekly?'daily':'quick';if(weekly)choices=found.map(x=>x[1]);else{for(const [,k] of found){const d=new Date(now);const dow=d.getDay()===0?7:d.getDay();let offset=(Number(k)-dow+7)%7;if(/هفته (?:بعد|آینده)/.test(title))offset+=7;d.setDate(d.getDate()+offset);choices.push(iso(d));}}
   found.forEach(([day])=>remove(new RegExp('(?:^|\\s)'+day+'(?:\\s*ها)?(?=\\s|$)','g')));remove(/(?:^|\s)(?:روزهای|روز|هر|هفته بعد|هفته آینده|هفته ای|هفتگی)(?=\s|$)/g);remove(/^(?:و\s+)+|(?:\s+و)+$/g);
  }else{const relDay=title.match(/پسفردا|فردا|امروز|امشب/),ndays=title.match(/(\d+) روز (?:دیگه|دیگر|بعد)/);if(relDay||ndays){const d=new Date(now);d.setDate(d.getDate()+(ndays?Number(ndays[1]):relDay[0]==='پسفردا'?2:relDay[0]==='فردا'?1:0));choices=[iso(d)];hasDay=true;remove(ndays?ndays[0]:relDay[0]);}}
  if(!relative){const m=title.match(/ساعت\s*(\d{1,2})(?:(?::|\s+و\s+)(\d{1,2}|نیم|ربع)(?:\s*دقیقه)?)?(?:\s*(صبح|بامداد|ظهر|بعد از ظهر|بعدازظهر|عصر|شب))?/);
   if(m){let hour=Number(m[1]),minute=m[2]==='نیم'?30:m[2]==='ربع'?15:Number(m[2]||0),period=m[3]||(title.match(/صبح|بامداد|بعد از ظهر|بعدازظهر|عصر|شب/)||[])[0]||(/امشب/.test(original)?'شب':'');remove(m[0]);if(period)remove(period);
    if(hour>23||minute>59)issues.push('ساعت یا دقیقه معتبر نیست.');
    else if(!period&&hour>=1&&hour<=12){ambiguous=[clock(hour===12?0:hour,minute),clock(hour===12?12:hour+12,minute)];if(chosenTime&&ambiguous.includes(chosenTime))time=chosenTime;else issues.push('صبح یا عصر بودن ساعت را مشخص کن.');}
    else {if(/عصر|ظهر|شب/.test(period)&&hour<12)hour+=12;if(/صبح|بامداد/.test(period)&&hour===12)hour=0;time=clock(hour,minute);}
   }else if(/نیمه شب/.test(title)){time='00:00';remove(/نیمه شب/);}else if(/ظهر/.test(title)){time='12:00';remove(/ظهر/);}else issues.push('ساعت را بگو یا از قسمت زمان انتخاب کن.');
  }
  if(/(?:^|\s)(?:فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)(?=\s|$)|هفته (?:بعد|آینده)|ماه (?:بعد|آینده)|آخر هفته|\d+[\/-]\d+[\/-]\d+|هر \d+/.test(title)){issues.push('این تاریخ یا الگوی تکرار را از تقویم تنظیم کن.');hasDay=true;choices=[];mode='dates';}
  if(/ساعت/.test(title)){issues.push('چند زمان یا زمان نامشخص گفته شد؛ زمان را دستی بررسی کن.');time='';}
  if(!hasDay&&time){const d=new Date(now);const [h,m]=time.split(':').map(Number);d.setHours(h,m,0,0);if(d<=now)d.setDate(d.getDate()+1);choices=[iso(d)];}
  if(hasDay&&mode==='dates'&&time&&choices.length&&choices.every(d=>new Date(d+'T'+time)<=now))issues.push('زمان گفته‌شده گذشته است؛ تاریخ یا ساعت آینده انتخاب کن.');
  remove(/یادم (?:بنداز|بینداز|باشه|بماند)|یادآوری (?:کن|بکن)|(?:را |رو )?یادآوری کن|ثبت کن|لطفا|لطفاً/g);remove(/^(?:که|و)\s+|\s+(?:را|رو|و)$/g);
  if((relative&&(daily||found.length))||(daily&&/فردا|پسفردا|امروز/.test(original))){time='';issues.push('شروع تکرار یا چند زمان هم‌زمان را از فرم مشخص کن.');}
  title=title.replace(/سهشنبه/g,'سه‌شنبه').trim();if(!title)issues.push('عنوان کار را بگو.');
  return {raw,title,time,mode,choices:[...new Set(choices)],type,body,issues,ambiguous};
 }
 return {parse,normalize};
})();
