'use strict';
(()=>{
 const by=id=>document.getElementById(id);let token=0,last=null;
 function status(text){by('voiceStatus').textContent=text;}
 function apply(chosen=''){
  const raw=by('voiceText').value.trim();if(!raw){status('ابتدا جمله را بگو یا بنویس.');return;}
  last=VoiceTaskParser.parse(raw,new Date(),chosen);
  window.applyVoiceTaskDraft(last);
  by('voiceResult').hidden=false;by('voicePreview').textContent='کار: '+(last.title||'نامشخص')+' · '+(last.time?scheduler.label(last):'ساعت نیاز به انتخاب دارد');
  const contact=taskAction.detect(last.title);const needsContact=contact.kind&&!by('phone').value.trim();status(last.issues.length?last.issues.join(' '):needsContact?'برای '+contact.name+'، شماره را از مخاطبین انتخاب کن و سپس ثبت را بزن.':'پیش‌نویس آماده است. بررسی کن و «ثبت کار و زنگ» را بزن.');
  by('voiceChoices').replaceChildren();
  if(last.ambiguous.length&&!chosen){for(const time of last.ambiguous){const b=document.createElement('button');b.type='button';const h=Number(time.slice(0,2));b.textContent=new Intl.NumberFormat('fa').format(h%12||12)+':'+time.slice(3)+(h<12?' صبح':' عصر / شب');b.onclick=()=>apply(time);by('voiceChoices').append(b);}}
 }
 by('voiceStart').onclick=()=>{
  if(!window.Native?.startTaskVoice){status('تشخیص گفتار در این محیط فعال نیست؛ جمله را در کادر بنویس.');return;}
  by('voiceStart').disabled=true;status('منتظر گفتار فارسی…');Native.startTaskVoice(++token);
 };
 by('voiceParse').onclick=()=>apply();
 window.taskVoiceResult=(request,text,error)=>{if(request!==token)return;by('voiceStart').disabled=false;if(error){status(error);return;}by('voiceText').value=text||'';apply();};
 window.cancelTaskVoiceDraft=()=>{token++;by('voiceStart').disabled=false;by('voiceResult').hidden=true;by('voiceChoices').replaceChildren();status('مثلاً: فردا ساعت نه صبح به علی زنگ بزن.');};
 by('voiceText').addEventListener('input',()=>{by('voiceResult').hidden=true;});
})();

// Entry points from the home capture buttons. Speech remains a user-initiated action.
(()=>{const q=new URLSearchParams(location.search);if(q.get('entry')==='voice')setTimeout(()=>document.getElementById('voiceStart').click(),150);if(q.get('entry')==='text'){const title=document.getElementById('title');title.value=(q.get('title')||'').slice(0,150);title.dispatchEvent(new Event('input'));title.focus();title.scrollIntoView({block:'center'});}})();
