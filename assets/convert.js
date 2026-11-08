'use strict';
const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat('fa-IR',{maximumSignificantDigits:10});
function number(raw){
  const text=raw.trim().replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[٬,]/g,'').replace('٫','.').replace('−','-');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)?Number(text):NaN;
}
function options(id,list){$(id).replaceChildren(...Object.entries(list).map(([value,label])=>new Option(label,value)));}
function show(tab){
  for(const button of document.querySelectorAll('[data-tab]')){
    const selected=button.dataset.tab===tab;
    $(button.dataset.tab).hidden=!selected;
    button.setAttribute('aria-pressed',String(selected));
  }
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>show(b.dataset.tab));
show('files');
$('pick').onclick=()=>Native.convertFile($('format').value);
const groups={
  'طول':{'متر':1,'کیلومتر':1000,'سانتی‌متر':.01,'میلی‌متر':.001,'اینچ':.0254,'فوت':.3048,'مایل':1609.344},
  'وزن':{'کیلوگرم':1,'گرم':.001,'میلی‌گرم':.000001,'تن':1000,'پوند':.45359237,'اونس':.028349523125},
  'دما':{'سلسیوس':1,'فارنهایت':1,'کلوین':1},
  'مساحت':{'متر مربع':1,'هکتار':10000,'کیلومتر مربع':1000000,'فوت مربع':.09290304},
  'حجم':{'لیتر':1,'میلی‌لیتر':.001,'متر مکعب':1000,'گالن آمریکا':3.785411784},
  'سرعت':{'متر بر ثانیه':1,'کیلومتر بر ساعت':1/3.6,'مایل بر ساعت':.44704,'گره دریایی':1852/3600},
  'زمان':{'ثانیه':1,'دقیقه':60,'ساعت':3600,'روز':86400,'هفته':604800},
  'حجم داده':{'بایت':1,'بیت':.125,'کیلوبایت (KB)':1000,'مگابایت (MB)':1e6,'گیگابایت (GB)':1e9,'مبی‌بایت (MiB)':1048576,'گیبی‌بایت (GiB)':1073741824}
};
function names(data){return Object.fromEntries(Object.keys(data).map(k=>[k,k]));}
function units(){
  const group=$('group').value, a=$('unitFrom').value,b=$('unitTo').value, val=number($('quantity').value);
  let result=val*groups[group][a]/groups[group][b];
  if(group==='دما'){
    const c=a==='فارنهایت'?(val-32)*5/9:a==='کلوین'?val-273.15:val;
    result=b==='فارنهایت'?c*9/5+32:b==='کلوین'?c+273.15:c;
  }
  $('unitResult').textContent=Number.isFinite(result)?fmt.format(result)+' '+b:'یک عدد وارد کن';
}
function changeGroup(){
  const list=names(groups[$('group').value]);options('unitFrom',list);options('unitTo',list);$('unitTo').selectedIndex=1;units();
}
options('group',names(groups));changeGroup();
$('group').onchange=changeGroup;
$('unitFrom').onchange=$('unitTo').onchange=$('quantity').oninput=units;
function swap(a,b){const old=$(a).value;$(a).value=$(b).value;$(b).value=old;}
$('unitSwap').onclick=()=>{swap('unitFrom','unitTo');units();};
const currencies={USD:'دلار آمریکا',IRT:'تومان',IRR:'ریال',EUR:'یورو',GBP:'پوند',TRY:'لیر ترکیه',AED:'درهم امارات',CAD:'دلار کانادا',CHF:'فرانک سوئیس',JPY:'ین ژاپن',CNY:'یوان چین',AUD:'دلار استرالیا',SEK:'کرون سوئد'};
options('source',currencies);options('target',currencies);$('target').value='IRT';
function saved(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
let rates=saved('converter-ref'), state='';
const providers={alan:'الان چند؟',tg:'شبکهٔ طلا و ارز',bon:'آرشیو بن‌بست'};
const domestic=c=>c==='IRT'||c==='IRR';
const pendingMarket=new Set();
const failures=new Set();
function marketCode(){
  const a=$('source').value,b=$('target').value;
  return domestic(a)!==domestic(b)?(domestic(a)?b:a):null;
}
function marketKey(p,c){return 'market:'+p+':'+c;}
function loadMarket(force=false){
  const code=marketCode();if(!code)return;
  for(const p of Object.keys(providers)){
    if(p==='tg'&&code!=='USD')continue;
    const key=marketKey(p,code),old=saved(key);
    if(pendingMarket.has(key)||(!force&&old&&Date.now()-old.at<900000))continue;
    pendingMarket.add(key);failures.delete(key);
    const url=p==='alan'?'https://alanchand.com/currencies-price/'+code.toLowerCase():p==='tg'?'https://www.tgju.org/profile/price_dollar_rl':'https://www.bonbast.com/archive';
    Native.request(key,url);
  }
}
function marketQuote(){
  const code=marketCode(), box=$('marketBox'),list=$('quotes');
  box.hidden=!code;list.replaceChildren();if(!code)return null;
  const preference=saved('market-pref')||'auto';
  let selected=null;
  for(const [p,label] of Object.entries(providers)){
    if(p==='tg'&&code!=='USD')continue;
    const key=marketKey(p,code),q=saved(key),row=document.createElement('div');
    const stale=q&&(failures.has(key)||Date.now()-q.at>900000);
    row.textContent=label+' · '+(q?fmt.format(q.value)+' تومان · '+q.kind+' · '+q.date+(stale?' · ذخیره‌شده':''):pendingMarket.has(key)?'دریافت…':'در دسترس نیست');
    list.append(row);
    if(q && (preference===p || (preference==='auto' && (!selected || (selected.stale&&!stale))))) selected={...q,label,stale};
  }
  return selected;
}
$('marketSource').value=saved('market-pref')||'auto';
$('marketSource').onchange=()=>{localStorage.setItem('market-pref',JSON.stringify($('marketSource').value));currency();};

function pairKey(){return 'fx:'+ $('source').value+':'+$('target').value;}
function currency(){
  const a=$('source').value,b=$('target').value, val=number($('amount').value);
  const market=marketQuote();
  const fixed=a===b||(domestic(a)&&domestic(b));
  const ref=rates?.rates||{};
  let rate=a===b?1:fixed?(a==='IRT'?10:.1):ref[b]/ref[a];
  if(market){const unit=(a==='IRR'||b==='IRR')?market.value*10:market.value;rate=domestic(a)?1/unit:unit;}
  const manual=number($('manual').value);
  const hasManual=!fixed && $('manual').value.trim()!=='';
  if(hasManual)rate=manual;
  $('manualBox').hidden=fixed;
  $('rateLabel').textContent='نرخ دستی · هر '+currencies[a]+' چند '+currencies[b]+'؟';
  const valid=Number.isFinite(rate)&&rate>0;
  $('moneyResult').textContent=valid&&Number.isFinite(val*rate)?fmt.format(val*rate)+' '+currencies[b]:'—';
  $('rateNote').textContent=fixed?'نسبت ثابت':hasManual?(valid?'محاسبه با نرخ دستی':'نرخ مثبت وارد کن'):market?'مبنای تبدیل: '+market.label+(market.stale?' · ذخیره‌شده':''):valid?'نرخ مرجع Frankfurter · '+rates.date:'برای این جفت ارز، نرخ دستی وارد کن.';
  if(state&&!fixed)$('rateNote').textContent+=' '+state;
}
function pairChanged(){$('manual').value=saved(pairKey())||'';loadMarket();currency();}
$('source').onchange=$('target').onchange=pairChanged;$('amount').oninput=currency;
$('manual').oninput=()=>{localStorage.setItem(pairKey(),JSON.stringify($('manual').value));currency();};
$('swap').onclick=()=>{swap('source','target');pairChanged();};
window.nativeReply=(id,body,error)=>{
  if(id.startsWith('market:')){
    const [,provider,code]=id.split(':');pendingMarket.delete(id);
    try{if(error)throw Error();const q=parseMarket(provider,code,body);localStorage.setItem(id,JSON.stringify({...q,at:Date.now()}));failures.delete(id);}
    catch{failures.add(id);}
    currency();return;
  }
  if(id!=='rates')return;
  $('update').disabled=false;
  try{
    if(error)throw Error();
    const data=JSON.parse(body);if(data.base!=='USD'||!data.date||!(data.rates.EUR>0))throw Error();
    data.rates.USD=1;rates=data;localStorage.setItem('converter-ref',JSON.stringify(data));state='';
  }catch{state='دریافت نرخ تازه ممکن نشد.';}
  currency();
};
$('update').onclick=()=>{loadMarket(true);state='در حال دریافت…';$('update').disabled=true;currency();Native.request('rates','https://api.frankfurter.dev/v1/latest?base=USD');};
pairChanged();if(!rates)$('update').click();
