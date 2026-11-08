(() => {
 const root=document.documentElement;
 try{
   const theme=JSON.parse(localStorage.getItem('forest-appearance')||'null');
   if(theme&&!window.AndroidBridge){root.dataset.sky=theme.sky;root.dataset.night=theme.night;}
 }catch{}
 window.applyForestWeather=(code,night)=>{
   const sky=code==null?'forest':code>=95?'storm':(code>=71&&code<=77||code===85||code===86)?'snow':code>=51?'rain':code>=45?'fog':code>=2?'cloud':'sun';
   root.dataset.sky=sky;root.dataset.night=!!night;
   try{localStorage.setItem('forest-appearance',JSON.stringify({sky,night:!!night}));}catch{}
   window.Native?.setForestTheme?.(sky,!!night);
 };
 function attach(){
   const hero=document.querySelector('.hero');
   if(!hero)return;
   const fx=document.createElement('div');fx.className='weather-motion';fx.setAttribute('aria-hidden','true');
   for(let i=0;i<30;i++){
     const particle=document.createElement('i');
     particle.style.setProperty('--x',((i*37)%103)+'%');
     particle.style.setProperty('--delay',-((i*0.71)%5)+'s');
     particle.style.setProperty('--speed',(0.85+(i%5)*.11)+'s');
     fx.append(particle);
   }
   hero.prepend(fx);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();
