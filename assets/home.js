'use strict';
const el=id=>document.getElementById(id);
const num=(v,d=0)=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:d}).format(v);
function stored(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
let place=stored('place')||{name:'قائم‌شهر',lat:36.463,lon:52.86};
let locationVersion=0;
let weatherKey='home72v1:'+place.lat+':'+place.lon;
el('today').textContent=new Date().toLocaleDateString('fa-IR',{weekday:'long',month:'long',day:'numeric'});
el('city').textContent=place.name;
function page(){
 const id=['fun','tools'].includes(location.hash.slice(1))?location.hash.slice(1):'home';
 for(const x of ['home','fun','tools'])el(x).hidden=x!==id;
 document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.body.dataset.tab=id;
 scrollTo(0,0);
}
window.addEventListener('hashchange',page);page();
for(const [id,title,icon] of [['pant','پانتومیم','🎭'],['music','حدس آهنگ','🎵'],['mafia','مافیا','🌙'],['spy','جاسوس','🕵️'],['lip','لب‌خوانی','🎧'],['names','اسم‌وفامیل','✍️']]){
 const b=document.createElement('button'),i=document.createElement('i');i.textContent=icon;b.append(i,title);b.dataset.game=id;el('games').append(b);
}
document.addEventListener('click',event=>{const game=event.target.closest('[data-game]');if(game)Native.openGames(game.dataset.game);});
function renderWeather(data,cached=false){
 if(!Number.isFinite(data?.current?.temperature_2m))throw Error();
 const c=data.current;applyForestWeather(c.weather_code,c.is_day===0);
 const [icon,label]=weatherText(c.weather_code,c.is_day===0);el('temp').textContent=num(c.temperature_2m)+'°';el('symbol').textContent=icon;el('detail').textContent=label;
 el('status').textContent=(cached?'ذخیره‌شده · ':'')+(data.provider||'Open-Meteo')+' · '+new Date(c.time*1000).toLocaleString('fa-IR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:data.timezone});
 const report=HomeReport.generate(data,Date.now()/1000);
 window.homeWeatherSummary?.(data,report,cached);
 const paragraph=(label,text)=>{const p=document.createElement('p'),b=document.createElement('b');b.textContent=label+' · ';p.append(b,text);return p;};
 el('summary').replaceChildren(...report.blocks.map(x=>paragraph(x.label,x.text)));
 el('weatherEvents').replaceChildren(...(report.events.length?report.events:[report.empty]).map(x=>paragraph('',x)));
 el('tenDayReport').replaceChildren(...(report.days.length?report.days.map(x=>paragraph(x.date,x.text+' '+x.range)):[paragraph('ده روز آینده','گزارش روزانهٔ این منبع در دسترس نیست.')]));

}
const instruments=[
 ['USD','دلار آمریکا','تومان'],['AED','درهم امارات','تومان'],['EUR','یورو','تومان'],
 ['ons','اونس جهانی طلا','دلار'],['geram18','هر گرم طلای ۱۸ عیار','تومان'],['sekee','سکهٔ امامی','تومان']
];
const cards=new Map(),pending=new Set();let last=0;
const panel=document.createElement('div');panel.className='panel';el('quotes').append(panel);
for(const [key,label,unit] of instruments){
 const row=document.createElement('div'),info=document.createElement('div'),b=document.createElement('b'),meta=document.createElement('small'),price=document.createElement('strong');
 row.className='quote';b.textContent=label;meta.textContent='در حال دریافت…';price.textContent='—';info.append(b,meta);row.append(info,price);
 if(['ons','geram18','sekee'].includes(key)){
  const link=document.createElement('a');link.textContent='مشاهده در الان چند؟';link.href='https://alanchand.com/gold-price/'+({ons:'usd_xau',geram18:'18ayar',sekee:'sekkeh'})[key];link.className='metal-source';info.append(link);
 }
 panel.append(row);cards.set(key,{meta,price,unit});
 const old=stored('dashboard:'+key);if(old)paint(key,old,true);
}
function paint(key,q,cached){
 const {price,meta,unit}=cards.get(key);price.textContent=num(q.value,key==='ons'?2:0)+' '+unit;
 meta.textContent=q.source+' · '+q.date+(cached?' · ذخیره‌شده':'');
 window.updateTicker?.(key,q,cached);
}
function request(id,url){if(pending.has(id))return;pending.add(id);Native.request(id,url);}
function fetchHomeWeather(){
 request('home72v1:'+locationVersion,'https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(place.lat)+'&longitude='+encodeURIComponent(place.lon)+'&current=temperature_2m,is_day,weather_code&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,rain,showers,snowfall,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,rain_sum,showers_sum,snowfall_sum,wind_gusts_10m_max&wind_speed_unit=kmh&forecast_days=10&timeformat=unixtime&timezone=auto');
}
function refresh(){
 last=Date.now();fetchHomeWeather();
 request('alanMetals','https://alanchand.com/gold-price');
 for(const code of ['USD','EUR','AED'])request('tg:'+code,'https://www.tgju.org/profile/'+({USD:'price_dollar_rl',EUR:'price_eur',AED:'price_aed'})[code]);
}
function parseMetal(key,body){
 const quote=/data-col="info\.last_trade\.PDrCotVal"[^>]*>([^<]+)/.exec(body),date=/زمان ثبت آخرین نرخ<\/td>\s*<td[^>]*>([^<]+)/.exec(body);
 if(!quote||!date||!body.includes(key==='ons'?'دلار':'ریال'))throw Error();
 return {value:quoteNumber(quote[1])/(key==='ons'?1:10),date:date[1].trim(),source:'شبکهٔ طلا و ارز'};
}
function alanMetal(key,html){
 const patterns={ons:/^(?:اونس|انس) طلا$/,geram18:/^گرم طلای (?:18|۱۸) عیار$/,sekee:/^سکه امامی(?:\s*\(طرح جدید\))?$/};
 const date=/آخرین بروز رسانی\s*:\s*([^<]+)/.exec(html);
 if(!date)throw Error('زمان نرخ پیدا نشد');
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const fields=Array.from(row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi),m=>m[1].split('<span')[0].replace(/<[^>]*>/g,'').trim());
  if(!patterns[key].test(fields[0]))continue;
  const match=/^([\d۰-۹٠-٩,٬.٫]+)\s*(تومان|\$)$/.exec(fields[1]);
  if(!match||match[2]!== (key==='ons'?'$':'تومان'))throw Error('واحد ناشناخته');
  return {value:quoteNumber(match[1]),date:date[1].trim(),source:'الان چند؟'};
 }
 throw Error('ردیف نرخ پیدا نشد');
}

function parseGold(body){
 const q=JSON.parse(body),time=Date.parse(q.updatedAt);
 if(q.symbol!=='XAU'||(q.currency&&q.currency!=='USD')||!Number.isFinite(q.price)||q.price<=0||!Number.isFinite(time))throw Error('Invalid XAU quote');
 return {value:q.price,source:'Gold API',date:new Date(time).toLocaleString('fa-IR',{timeZone:'Asia/Tehran',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})};
}
function fromMet(raw){
 const rows=raw.properties.timeseries,h={time:[],temperature_2m:[],weather_code:[],precipitation:[],wind_speed_10m:[]};
 for(const row of rows){
  const next=row.data.next_1_hours,symbol=next?.summary?.symbol_code;
  const code=!symbol?null:symbol.includes('thunder')?95:symbol.includes('snow')||symbol.includes('sleet')?73:symbol.includes('rain')?63:symbol.includes('fog')?45:symbol.includes('partlycloudy')?2:symbol.includes('fair')?1:symbol.includes('cloudy')?3:0;
  h.time.push(Date.parse(row.time)/1000);h.temperature_2m.push(row.data.instant.details.air_temperature);h.weather_code.push(code);h.precipitation.push(next?.details?.precipitation_amount);const wind=row.data.instant.details.wind_speed;h.wind_speed_10m.push(Number.isFinite(wind)?wind*3.6:null);
 }
 const now=Date.now()/1000;let i=h.time.findIndex(t=>t>now)-1;
 if(i<0||now-h.time[i]>3600||h.weather_code[i]==null)throw Error('Expired forecast');
 const symbol=rows[i].data.next_1_hours.summary.symbol_code;
 const zone=stored(weatherKey)?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(new Date()));
 return {provider:'MET Norway',timezone:zone,hourly:h,current:{time:h.time[i],temperature_2m:h.temperature_2m[i],weather_code:h.weather_code[i],is_day:symbol.endsWith('_night')?0:symbol.endsWith('_day')?1:Number(hour>=6&&hour<18)}};
}
window.nativeReply=(id,body,error)=>{
 if(id.startsWith('placeSearch:')){window.onPlaceSearch?.(id,body,error);return;}
 if(!pending.delete(id))return;
 if(id==='alanMetals'){
  for(const key of ['ons','geram18','sekee']){
   try{
    if(error)throw Error(error);
    const quote=alanMetal(key,body);paint(key,quote,false);localStorage.setItem('dashboard:'+key,JSON.stringify(quote));
   }catch{request('dash:'+key,key==='ons'?'https://api.gold-api.com/price/XAU':'https://www.tgju.org/profile/'+key);}
  }
  return;
 }
 const [kind,version]=id.split(':');
 if(kind==='home72v1'||kind==='met48'){
  if(Number(version)!==locationVersion)return;
  try{
   if(error)throw Error();const raw=JSON.parse(body);
   const data=kind==='met48'?fromMet(raw):raw;
   renderWeather(data);localStorage.setItem(weatherKey,JSON.stringify(data));
  }catch{
   if(kind==='home72v1'){request('met48:'+locationVersion,'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat='+encodeURIComponent(place.lat)+'&lon='+encodeURIComponent(place.lon));return;}
   const old=stored(weatherKey);
   if(old)renderWeather(old,true);
   else{el('weatherBrief').textContent='پیش‌بینی در دسترس نیست؛ دوباره تلاش کن.';el('weatherStats').replaceChildren();el('status').textContent='دریافت هوا ناموفق بود';el('summary').textContent='پیش‌بینی ساعتی در دسترس نیست.';el('weatherEvents').textContent='داده‌ای موجود نیست.';el('tenDayReport').textContent='داده‌ای موجود نیست.';}
  }
  return;
 }
 const key=id.split(':')[1];if(!cards.has(key))return;
 try{
  if(error)throw Error();const q=/^[A-Z]+$/.test(key)?(id.startsWith('tg:')?parseMetal(key,body):{...parseMarket('alan',key,body),source:'الان چند؟ · فروش'}):key==='ons'&&id==='dash:ons'?parseGold(body):parseMetal(key,body);
  paint(key,q,false);localStorage.setItem('dashboard:'+key,JSON.stringify(q));
 }catch{if(id.startsWith('tg:')){request('dash:'+key,'https://alanchand.com/currencies-price/'+key.toLowerCase());return;}if(id==='dash:ons'){request('backup:ons','https://www.tgju.org/profile/ons');return;}const old=stored('dashboard:'+key);if(old)paint(key,old,true);else {cards.get(key).meta.textContent='نرخ در دسترس نیست؛ دوباره به‌روزرسانی کن.';window.updateTicker?.(key,null,false);}}
};
el('refresh').onclick=refresh;
const old=stored(weatherKey);if(old)renderWeather(old,true);
requestAnimationFrame(()=>setTimeout(refresh,0));setInterval(()=>{if(!document.hidden&&!el('home').hidden)refresh()},900000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-last>900000)refresh();});
function weatherText(code,night=false){if(code==null)return ['—','نامشخص'];if(code===0)return [night?'🌙':'☀️',night?'صاف':'آفتابی'];if(code<=2)return [night?'☁️':'🌤️','کمی ابری'];if(code===3)return ['☁️','ابری'];if(code<=48)return ['🌫️','مه‌آلود'];if(code<=57)return ['🌦️','نم‌نم باران'];if(code<=67)return ['🌧️','بارانی'];if(code<=77)return ['❄️','برفی'];if(code<=82)return ['🌧️','رگبار باران'];if(code<=86)return ['🌨️','رگبار برف'];return ['⛈️','رعدوبرق'];}
