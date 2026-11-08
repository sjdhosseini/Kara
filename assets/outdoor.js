function planOutdoors(data,dates,duration,now){
 const h=data.hourly;
 const choices=new Map();
 for(let i=0;i<h.time.length-duration+1;i++){
  const start=h.time[i],key=dayKey(start);
  if(start<now||!dates.has(key))continue;
  let rain=0,wind=0,score=0,total=0,valid=true;
  for(let k=i;k<i+duration;k++){
   const temp=h.temperature_2m?.[k],chance=h.precipitation_probability?.[k],speed=h.wind_speed_10m?.[k],code=h.weather_code?.[k],mm=h.precipitation?.[k];
   if(![temp,chance,speed,code,mm].every(Number.isFinite)||!h.is_day?.[k]||h.time[k]!==start+(k-i)*3600||dayKey(h.time[k])!==key||code>=95||mm>=6||speed>=50){valid=false;break;}
   rain=Math.max(rain,chance);wind=Math.max(wind,speed);total+=temp;score+=Math.abs(temp-21)*1.5+chance*.6+speed*.7+mm*9;
  }
  if(valid&&(!choices.has(key)||choices.get(key).score>score))choices.set(key,{start,end:start+duration*3600,rain,wind,temp:total/duration,score});
 }
 return [...choices.values()].sort((a,b)=>a.score-b.score);
}
function updateOutdoor(rebuild){
 const d=activeForecast,picker=document.getElementById('outDay'),out=document.getElementById('outResult');if(!d||!picker)return;
 if(rebuild){const old=picker.value;picker.replaceChildren(new Option('مقایسهٔ همهٔ روزها','all'));d.daily.time.forEach(t=>picker.add(new Option(date(t,{weekday:'long',day:'numeric',month:'short'}),dayKey(t))));if([...picker.options].some(o=>o.value===old))picker.value=old;}
 const keys=new Set(picker.value==='all'?d.daily.time.map(dayKey):[picker.value]);
 const result=planOutdoors(d,keys,Number(document.getElementById('outLength').value),Date.now()/1000);
 if(!result.length){out.textContent='در این بازه ساعت روشن با دادهٔ کافی و شرایط مناسب پیدا نشد.';return;}
 out.replaceChildren();for(const r of result.slice(0,2)){
 const row=document.createElement('div');row.className='out-row';
 const title=document.createElement('b');title.textContent=date(r.start,{weekday:'long',day:'numeric',month:'short'})+' · '+date(r.start,{hour:'2-digit',minute:'2-digit'})+' تا '+date(r.end,{hour:'2-digit',minute:'2-digit'});
 const detail=document.createElement('small');detail.textContent='دمای میانگین '+num(r.temp)+'° · احتمال بارش تا '+num(r.rain)+'٪ · باد تا '+num(r.wind)+' کیلومتر بر ساعت';row.append(title,detail);out.append(row);}
}
