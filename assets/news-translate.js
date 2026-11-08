'use strict';
// Public translation endpoint: may be rate limited. No credentials embedded.
const NewsTranslation=(()=>{
 const key='sjd-news-fa-v1';let records={};try{records=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
 const jobs=new Map(),failed=new Set();let workers=0,changed=()=>{};
 const valid=t=>typeof t==='string'&&t.trim().length>0&&/[\u0600-\u06ff]/.test(t);
 function get(text){const r=records[text];return r&&valid(r.text)?r.text:null;}
 function persist(){try{const entries=Object.entries(records).sort((a,b)=>b[1].at-a[1].at).slice(0,1000);records=Object.fromEntries(entries);localStorage.setItem(key,JSON.stringify(records));}catch{}}
 function queue(text,priority=1){if(!text||get(text)||failed.has(text)||jobs.has(text))return;jobs.set(text,{priority,running:false});pump();}
 async function pump(){if(workers>=2)return;const entry=[...jobs].filter(([,j])=>!j.running).sort((a,b)=>a[1].priority-b[1].priority)[0];if(!entry)return;const [text,job]=entry;job.running=true;workers++;
  try{const d=await request('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q='+encodeURIComponent(text));if(!Array.isArray(d[0]))throw Error('Invalid translation');const result=d[0].map(x=>typeof x?.[0]==='string'?x[0]:'').join('').trim();if(!valid(result))throw Error('No Persian translation');records[text]={text:result,at:Date.now()};persist();}
  catch{failed.add(text);}finally{jobs.delete(text);workers--;changed();setTimeout(pump,300);}
 }
 return {get,queue,status:t=>get(t)?'done':failed.has(t)?'error':'pending',retry(){failed.clear();changed();},onChange(fn){changed=fn;}};
})();
