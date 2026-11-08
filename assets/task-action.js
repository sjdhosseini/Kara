'use strict';
const taskAction=(()=>{
 const by=id=>document.getElementById(id);
 const norm=s=>s.replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\s]+/g,' ').trim();
 const labels={call:'تماس با ',sms:'پیامک به '};
 const msg='(?:پیامک|پیام|اس ام اس|اسمس|مسیج|SMS)';
 const patterns=[
  ['call',/^(?:یادم باشه )?(?:به |با )?(.+?) (?:زنگ بزن(?:م)?|تماس بگیر(?:م)?)$/],
  ['call',/^(?:تماس (?:بگیر(?:م)? )?(?:با|به)|زنگ (?:بزن(?:م)? )?به) (.+)$/],
  ['sms',new RegExp('^(?:یادم باشه )?(?:به )?(.+?) '+msg+' (?:بده(?:م)?|بدم|بفرست(?:م)?|بزن(?:م)?|ارسال کن(?:م)?)$','i')],
  ['sms',new RegExp('^(?:ارسال )?'+msg+' (?:بده |بفرست )?به (.+)$','i')]
 ];
 function detect(title){
  for(const [kind,re] of patterns){const m=norm(title).replace(/[.!؟،]+$/,'').match(re);
   if(m)return {kind,name:m[1].replace(/ (?:بفرست|بده|بزن|ارسال کن|زنگ بزن|تماس بگیر)$/,'').trim()};
  }
  return {kind:'',name:''};
 }
 function phone(s){return s.replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[\s()\-\u200e\u200f]/g,'');}
 const valid=s=>/^\+?\d{3,15}$/.test(s);
 let inferred='',token=0;
 function state(){
  const detected=detect(by('title').value),mode=by('actionMode').value;
  return {kind:mode==='auto'?detected.kind:mode==='plain'?'':mode,name:detected.name};
 }
 function paint(){
  const {kind}=state();by('recipientFields').hidden=!kind;by('draftLabel').hidden=kind!=='sms';
  by('recognized').textContent=kind?labels[kind]+(by('who').value.trim()||'…'):'';
 }
 function fromTitle(){
  const {name}=state();
  if(name!==inferred){by('who').value=name;by('phone').value='';inferred=name;token++;
   const known=JSON.parse(localStorage.getItem('sjd-tasks-v1')||'[]').map(t=>t.action).filter(a=>a&&name&&norm(a.name)===norm(name));
   const numbers=[...new Set(known.map(a=>a.number).filter(valid))];if(numbers.length===1)by('phone').value=numbers[0];
  }
  paint();
 }
 function load(row){
  const a=row?.action;token++;by('actionMode').value=a?.kind||(row?'plain':'auto');inferred=detect(row?.title||'').name;
  by('who').value=a?.name||'';by('phone').value=a?.number||'';by('draft').value=a?.body||'';paint();
 }
 by('title').addEventListener('input',fromTitle);by('actionMode').onchange=fromTitle;
 by('who').oninput=()=>{by('phone').value='';token++;paint();};
 by('pickContact').onclick=()=>window.Native?.pickTaskContact?.(++token);
 window.taskContactResult=(request,name,number)=>{if(request!==token||!state().kind)return;by('who').value=name||by('who').value;by('phone').value=phone(number);if(!by('title').value.trim())by('title').value=labels[state().kind]+by('who').value;paint();};
 function collect(){
  const {kind}=state();if(!kind)return null;const name=by('who').value.trim(),number=phone(by('phone').value);
  if(!name||!valid(number))throw Error('نام و شمارهٔ مخاطب را وارد کن یا از مخاطبین گوشی انتخاب کن.');
  return {kind,name,number,body:kind==='sms'?by('draft').value.trim():''};
 }
 return {load,collect,detect,label:a=>labels[a.kind]+a.name};
})();
