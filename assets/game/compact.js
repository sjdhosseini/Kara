'use strict';
// Keep real controls in the DOM: pagination never clones forms or loses handlers.
const unpagedShow=show;show=function(s){if(screen!=='help')pageMemory.delete(s);unpagedShow(s);$('help').classList.toggle('mafia-help',selected==='mafia');document.querySelector('nav').hidden=false;scheduleLayout()};
let layoutPages=[],layoutPage=0,layoutScreen='',layoutScheduled=false,layoutBusy=false;
const pageMemory=new Map();
const footer=document.querySelector('nav');
$('navHome').textContent='⌂ بازی‌ها';
footer.insertAdjacentHTML('beforeend','<button id="layoutHelp" aria-label="راهنمای بازی">؟ راهنما</button><div class="page-controls"><button id="layoutPrev" aria-label="صفحهٔ قبل">قبل</button><span id="layoutCount" aria-live="polite"></span><button id="layoutNext" aria-label="صفحهٔ بعد">بعد</button></div>');
$('layoutHelp').onclick=()=>screen==='help'?closeHelp():openHelp();
$('layoutPrev').onclick=()=>layoutGo(layoutPage-1);$('layoutNext').onclick=()=>layoutGo(layoutPage+1);
function numericText(s){return String(s).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[^0-9]/g,'').slice(0,5)}
document.addEventListener('input',e=>{if(e.target.matches('[data-numeric]')){const el=e.target,v=numericText(el.value);if(el.value!==v)el.value=v}});
document.addEventListener('focusin',e=>{if(e.target.matches('input,textarea,select')){if(e.target.matches('[data-numeric]'))e.target.select();scheduleLayout()}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-numeric]')){e.preventDefault();e.target.blur()}});
function layoutGo(i){if(i<0||i>=layoutPages.length)return;document.activeElement?.blur();layoutPage=i;applyLayoutPage();}
function scheduleLayout(){if(layoutScheduled||layoutBusy)return;layoutScheduled=true;requestAnimationFrame(()=>{layoutScheduled=false;paginateScreen()})}
function layoutContainer(el){return (el.matches('details')&&el.open)||el.matches('.game-grid,.scores,.panel,.play-panel,#extraBody,#extraActions,#helpBody,.help-steps,#bankStats,#voteList,#resultScores,#nooshScores,#nooshRules,#nooshResultScores,#musicResultScores,#musicJudge,#extraDayField')}
function visibleForLayout(el){return !el.hidden&&getComputedStyle(el).display!=='none'}
function paginateScreen(){if(layoutBusy)return;layoutBusy=true;try{
 footer.hidden=false;const section=$(screen);if(!section)return;
 const changed=layoutScreen!==screen;layoutScreen=screen;
 section.querySelectorAll('.layout-off,.layout-empty').forEach(el=>el.classList.remove('layout-off','layout-empty'));
 section.querySelectorAll('[data-layout-zoom]').forEach(el=>{el.style.zoom='';el.removeAttribute('data-layout-zoom')});
 const atoms=[],containers=[];
 function walk(el){if(!visibleForLayout(el))return;if(layoutContainer(el)&&el.children.length){containers.push(el);for(const child of el.children)walk(child)}else atoms.push(el)}
 for(const el of section.children)walk(el);
 const main=document.querySelector('main'),available=main.clientHeight-12;
 const active=document.activeElement,previous=layoutPages[layoutPage]?.[0];
 atoms.forEach(el=>el.classList.add('layout-off'));
 const updateParents=()=>{for(let i=containers.length-1;i>=0;i--){const el=containers[i];el.classList.toggle('layout-empty',![...el.children].some(c=>!c.hidden&&!c.classList.contains('layout-off')&&!c.classList.contains('layout-empty')&&getComputedStyle(c).display!=='none'))}};
 updateParents();const pages=[];let group=[];
 for(const atom of atoms){atom.classList.remove('layout-off');updateParents();if(section.getBoundingClientRect().height>available+1&&group.length){atom.classList.add('layout-off');pages.push(group);group.forEach(el=>el.classList.add('layout-off'));group=[];atom.classList.remove('layout-off');updateParents()}
  if(!group.length&&section.getBoundingClientRect().height>available+1){const h=section.getBoundingClientRect().height;atom.style.zoom=String(Math.min(1,available/h));atom.dataset.layoutZoom='true'}
  group.push(atom);
 }
 if(group.length)pages.push(group);layoutPages=pages.length?pages:[[]];
 let target=changed?(pageMemory.get(screen)||0):layoutPage;
 if(!changed&&active&&active!==document.body){const idx=layoutPages.findIndex(g=>g.some(el=>el===active||el.contains(active)));if(idx>=0)target=idx}
 else if(!changed&&previous?.isConnected){const idx=layoutPages.findIndex(g=>g.includes(previous));if(idx>=0)target=idx}
 layoutPage=Math.max(0,Math.min(target,layoutPages.length-1));
 if(!changed&&previous&&!previous.isConnected)layoutPage=0;
 applyLayoutPage(atoms,containers);
 }finally{layoutBusy=false}}
function applyLayoutPage(atoms,containers){const section=$(screen);if(!section)return;const selectedNodes=new Set(layoutPages[layoutPage]||[]);const all=atoms||layoutPages.flat();for(const el of all)el.classList.toggle('layout-off',!selectedNodes.has(el));
 const parents=containers||[...section.querySelectorAll('.game-grid,.scores,details,.panel,.play-panel,#extraBody,#extraActions,#helpBody,.help-steps,#bankStats,#voteList,#resultScores,#nooshScores,#nooshRules,#nooshResultScores,#musicResultScores,#musicJudge,#extraDayField')];
 for(let i=parents.length-1;i>=0;i--){const el=parents[i];if(!el.children.length)continue;el.classList.toggle('layout-empty',![...el.children].some(c=>!c.hidden&&!c.classList.contains('layout-off')&&!c.classList.contains('layout-empty')&&getComputedStyle(c).display!=='none'))}
 footer.hidden=false;$('navHome').hidden=screen==='home';$('layoutHelp').hidden=['home','settings','manage'].includes(screen);$('layoutHelp').textContent=screen==='help'?'برگشت به بازی':'؟ راهنما';$('layoutPrev').disabled=layoutPage===0;$('layoutNext').disabled=layoutPage===layoutPages.length-1;$('layoutCount').textContent=(layoutPage+1)+' / '+layoutPages.length;footer.querySelector('.page-controls').hidden=layoutPages.length<=1;footer.classList.toggle('empty-footer',screen==='home'&&layoutPages.length<=1);pageMemory.set(screen,layoutPage);window.scrollTo(0,0);
}
const layoutObserver=new MutationObserver(records=>{if(records.some(r=>{const t=r.target.nodeType===1?r.target:r.target.parentElement;return t?.closest('main')&&!t.closest('.timer')&&!(r.type==='attributes'&&r.attributeName==='class')}))scheduleLayout()});
layoutObserver.observe(document.querySelector('main'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open']});
function viewportLayout(){document.documentElement.style.setProperty('--app-height',(window.visualViewport?.height||window.innerHeight)+'px');scheduleLayout()}
window.addEventListener('resize',viewportLayout);window.visualViewport?.addEventListener('resize',viewportLayout);viewportLayout();
