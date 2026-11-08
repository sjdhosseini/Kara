'use strict';
const picker=el('placePicker');
const presets=[['قائم‌شهر',36.463,52.86],['بابل',36.55,52.68],['ساری',36.563,53.06],['آمل',36.47,52.35],['تهران',35.69,51.39]].map(([name,lat,lon])=>({name,lat,lon}));
let searchToken=0,waitingGps=false;
function favoritesList(){const list=stored('favorites');return Array.isArray(list)?list:[];}
function samePoint(a,b){return Math.abs(a.lat-b.lat)<.0001&&Math.abs(a.lon-b.lon)<.0001;}
function refreshFavorites(){
 const list=favoritesList(),isSaved=list.some(p=>samePoint(p,place)),star=el('starPlace');
 star.textContent=isSaved?'★':'☆';star.setAttribute('aria-pressed',String(isSaved));star.setAttribute('aria-label',isSaved?'حذف از موردعلاقه‌ها':'ذخیره در موردعلاقه‌ها');
 el('savedPlaces').replaceChildren();list.forEach(p=>placeButton(el('savedPlaces'),p,p.name==='موقعیت من'?p.name+' · '+p.lat.toFixed(3)+'، '+p.lon.toFixed(3):p.name));
 if(!list.length)el('savedPlaces').textContent='برای ذخیرهٔ مکان، ستارهٔ کنار نامش را بزن.';
}
function syncSelection(){
 const options=stored('weatherOptions')||{auto:true,alerts:true,rain:10,wind:60};
 window.Native?.configure?.(JSON.stringify({...options,favorites:favoritesList(),place,model:stored('model')||'best_match'}));
}
function selectPlace(p){
 if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180)return;
 place=p;locationVersion++;el('weatherBrief').textContent='دریافت خلاصهٔ ۷۲ ساعت آینده…';el('weatherStats').replaceChildren();el('weatherEvents').textContent='در حال دریافت…';el('tenDayReport').textContent='در حال دریافت…';weatherKey='home72v1:'+place.lat+':'+place.lon;
 localStorage.setItem('place',JSON.stringify(p));syncSelection();el('city').textContent=p.name;
 el('temp').textContent='—';el('symbol').textContent='';el('detail').textContent='';el('status').textContent='دریافت وضعیت هوا…';el('summary').textContent='در حال دریافت پیش‌بینی ساعتی…';
 applyForestWeather(null,false);const cached=stored(weatherKey);if(cached)renderWeather(cached,true);
 refreshFavorites();waitingGps=false;el('useGps').disabled=false;picker.close();fetchHomeWeather();
}
function placeButton(box,p,label=p.name){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>selectPlace(p);box.append(b);
}
el('starPlace').onclick=()=>{
 const list=favoritesList(),exists=list.some(p=>samePoint(p,place));
 localStorage.setItem('favorites',JSON.stringify(exists?list.filter(p=>!samePoint(p,place)):[place,...list].slice(0,50)));syncSelection();refreshFavorites();
};
presets.forEach(p=>placeButton(el('nearby'),p));
el('pickPlace').onclick=()=>{refreshFavorites();el('placeQuery').value='';el('geoResults').replaceChildren();picker.showModal();};
el('closePlace').onclick=()=>picker.close();
picker.addEventListener('close',()=>{searchToken++;waitingGps=false;el('useGps').disabled=false;});
el('useGps').onclick=()=>{waitingGps=true;el('useGps').disabled=true;el('geoResults').textContent='در حال دریافت موقعیت…';Native.locate();};
window.locationReady=(lat,lon)=>{if(!waitingGps||!picker.open)return;selectPlace({name:'موقعیت من',lat:Number(lat.toFixed(4)),lon:Number(lon.toFixed(4))});};
window.locationFailed=window.locationTimedOut=()=>{if(!waitingGps)return;waitingGps=false;el('useGps').disabled=false;el('geoResults').textContent='موقعیت دریافت نشد. اجازهٔ مکان را بررسی کن یا یک شهر انتخاب کن.';};
el('findPlace').onsubmit=e=>{
 e.preventDefault();const q=el('placeQuery').value.trim();++searchToken;if(q.length<2){el('geoResults').textContent='حداقل دو حرف وارد کن.';return;}
 el('geoResults').textContent='جست‌وجو…';
 Native.request('placeSearch:'+searchToken,'https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=10&language=fa&format=json');
};
window.onPlaceSearch=(id,body,error)=>{
 if(!picker.open||id!=='placeSearch:'+searchToken)return;
 const box=el('geoResults');box.replaceChildren();
 try{if(error)throw Error();const rows=JSON.parse(body).results||[];if(!rows.length)box.textContent='شهری پیدا نشد. نام انگلیسی را هم امتحان کن.';
 rows.forEach(r=>placeButton(box,{name:r.name,lat:r.latitude,lon:r.longitude,region:r.admin1},[r.name,r.admin1,r.country].filter(Boolean).join('، ')));
 }catch{box.textContent='جست‌وجوی آنلاین در دسترس نیست.';}
};refreshFavorites();

syncSelection();
