'use strict';
(function(root){
 const valid=n=>typeof n==='number'&&Number.isFinite(n);
 const at=(h,k,i)=>valid(h[k]?.[i])?h[k][i]:null;
 function rain(h,i){const r=at(h,'rain',i),s=at(h,'showers',i);return r===null||s===null?null:r+s;}
 function max(h,k,indices){const values=indices.map(i=>at(h,k,i)).filter(valid);return values.length?Math.max(...values):null;}
 function periods(h,indices,kind){const out=[];let group=null;
  for(const i of indices){const amount=kind==='rain'?rain(h,i):at(h,'snowfall',i);if(amount!==null&&amount>0){if(!group||h.time[i]-group.end!==3600){group={start:h.time[i]-3600,end:h.time[i],sum:0,peak:0,peakTime:h.time[i]};out.push(group);}group.sum+=amount;group.end=h.time[i];if(amount>group.peak){group.peak=amount;group.peakTime=h.time[i];}}else group=null;}
  return out;
 }
 root.DayReport={at,rain,max,periods};
})(typeof window==='undefined'?globalThis:window);
