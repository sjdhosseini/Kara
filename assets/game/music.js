'use strict';
// Online-only catalogue. Only the reviewed domestic audio hostname is accepted.
const MUSIC_ARTISTS=['ابی','داریوش','معین','سیاوش قمیشی','شهرام شب پره','فرهاد','فریدون فروغی','ویگن','عارف','ناصر عبداللهی','شادمهر عقیلی','بهنام بانی','عرفان طهماسبی','محسن یگانه','محسن چاوشی','علیرضا قربانی','همایون شجریان','محمدرضا شجریان','محمد اصفهانی','محمد نوری','رضا صادقی','رضا یزدانی','رضا بهرام','بابک جهانبخش','فرزاد فرزین','حمید هیراد','حمید عسکری','گرشا رضایی','مهدی احمدوند','میثم ابراهیمی','آرون افشار','حجت اشرف زاده','ماکان بند','پازل بند','مسیح و آرش','راغب','اشوان','ناصر زینلی','حامیم','فریدون آسرایی','محسن ابراهیم زاده'];
let music=null,musicEpoch=0,musicClock=null,musicLoadTimer=null,musicRequestId=0;
const musicPending=new Map(),musicSeen=new Set(),musicAudio=$('musicAudio');
function musicNorm(s){return String(s).replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200f]/g,' ').replace(/\s+/g,' ').trim()}
function musicText(s){const d=new DOMParser().parseFromString(String(s),'text/html');return musicNorm(d.body.textContent)}
function musicUrl(u){try{const v=new URL(u);return v.protocol==='https:'&&v.hostname==='dl.musicetii.com'&&!v.username&&!v.password&&/\.mp3$/i.test(v.pathname)&&!v.port?v.href:null}catch(e){return null}}
function parseMusicPosts(posts,artist){
 const out=[];if(!Array.isArray(posts))return out;
 for(const p of posts){if(!p||typeof p.content?.rendered!=='string')continue;
  const title=musicText(p.title?.rendered||''),name=musicNorm(artist);
  if(!((' '+title+' ').includes(' '+name+' '))||/ریمیکس|میکس|مداحی|نوحه|پادکست|آلبوم|گلچین|مجموعه|بی کلام/.test(title))continue;
  const doc=new DOMParser().parseFromString(p.content.rendered,'text/html');
  const urls=[...new Set([...doc.querySelectorAll('audio[src],audio source[src],a[href]')].map(e=>musicUrl(e.getAttribute('src')||e.getAttribute('href'))).filter(Boolean))];
  if(!urls.length||urls.length>2||urls.some(u=>/bi[ _-]*kalam|instrumental/i.test(decodeURIComponent(u))))continue;
  let answer='';for(const tr of doc.querySelectorAll('tr')){const cells=tr.querySelectorAll('th,td');if(cells.length>=2&&musicNorm(cells[0].textContent)==='نام آهنگ')answer=musicNorm(cells[1].textContent)}
  if(!answer){const match=doc.body.textContent.match(/نام آهنگ\s*[:：]\s*([^\n]+)/);if(match)answer=musicNorm(match[1]).split(/[🎼📅⏱💿📝📦]/)[0].trim()}
  if(!answer){let head=title.replace(/^(دانلود\s+)?(آهنگ|اهنگ)\s+(جدید\s+)?/,'');if(head.startsWith(name+' '))answer=head.slice(name.length).trim();else if(head.endsWith(' '+name))answer=head.slice(0,-name.length).trim()}
  answer=answer.split(/[|《]/)[0].replace(/\s*(با کیفیت|کیفیت عالی|پخش آنلاین).*$/,'').trim();
  if(!answer||answer.length>110||/ریمیکس|میکس|گلچین|بی.?کلام/.test(answer))continue;
  const url=urls.find(u=>/128/.test(u))||urls[0];
  out.push({id:String(p.id),artist:name,title:answer,url,key:musicNorm(name+' '+answer)});
 }return out;
}
window.onMusicCatalog=(id,ok,body)=>{const p=musicPending.get(id);if(!p)return;musicPending.delete(id);clearTimeout(p.timer);if(!ok)return p.reject(Error('catalog'));try{p.resolve(JSON.parse(body))}catch(e){p.reject(e)}};
function fetchMusic(artist){
 if(window.AndroidBridge&&typeof AndroidBridge.musicCatalog==='function')return new Promise((resolve,reject)=>{const id=++musicRequestId;const timer=setTimeout(()=>{musicPending.delete(id);reject(Error('timeout'))},25000);musicPending.set(id,{resolve,reject,timer});AndroidBridge.musicCatalog(id,artist)});
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),22000);
 return fetch('https://musicetu.com/wp-json/wp/v2/posts?per_page=50&search='+encodeURIComponent('"'+artist+'"')+'&search_columns%5B%5D=post_title&_fields=id,title,content,link',{signal:abort.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw Error('network');return r.json()}).finally(()=>clearTimeout(timer));
}
function clearMusicTimers(){clearInterval(musicClock);clearTimeout(musicLoadTimer);musicClock=null;musicLoadTimer=null}
function stopMusic(){++musicEpoch;clearMusicTimers();musicAudio.pause();musicAudio.removeAttribute('src');musicAudio.load();music=null;for(const p of musicPending.values()){clearTimeout(p.timer);p.reject(Error('cancelled'))}musicPending.clear()}
function showMusicSetup(){$('musicArtist').innerHTML='<option value="classics">معروف و خاطره‌انگیز · '+MUSIC_CLASSICS.length+' آهنگ منتخب</option><option value="">ترکیبی از همهٔ خوانندگان</option>'+MUSIC_ARTISTS.map(n=>'<option>'+esc(n)+'</option>').join('');$('musicLoadStatus').textContent='گزیدهٔ خاطره‌انگیز آماده است؛ برای پخش صدا اینترنت لازم است. انتخاب خواننده، بانک تازه دریافت می‌کند.';$('musicStart').disabled=false;show('musicSetup')}
$('musicStart').onclick=async()=>{
 const epoch=++musicEpoch;$('musicStart').disabled=true;$('musicLoadStatus').textContent='در حال دریافت بانک آنلاین…';
 const choice=$('musicArtist').value,artists=choice==='classics'?[]:choice?[choice]:shuffle([...MUSIC_ARTISTS]).slice(0,4);
 const results=await Promise.allSettled(artists.map(async a=>parseMusicPosts(await fetchMusic(a),a)));
 if(epoch!==musicEpoch)return;
 const map=new Map();MUSIC_CLASSICS.filter(t=>!choice||choice==='classics'||t.artist===choice).forEach(t=>map.set(t.key,t));results.forEach(r=>{if(r.status==='fulfilled')r.value.forEach(t=>map.set(t.key,t))});
 const tracks=[...map.values()];if(tracks.length<2){$('musicStart').disabled=false;$('musicLoadStatus').textContent='بانک قابل پخش کافی دریافت نشد. اتصال اینترنت را بررسی کنید، دوباره تلاش کنید یا خوانندهٔ دیگری انتخاب کنید.';return}
 music={teams:[0,1].map(i=>({name:$('musicTeam'+i).value.trim()||'تیم '+(i+1),score:0})),current:0,round:1,maxRounds:Number($('musicRounds').value),tracks,done:false,phase:'ready',track:null};
 if(screen==='help'&&helpState?.origin==='musicSetup')helpState.origin='musicPlay';else show('musicPlay');nextMusicTurn();
};
function musicScores(){$('musicScores').innerHTML=music.teams.map((t,i)=>'<div class="score '+(i===music.current?'active':'')+'">'+esc(t.name)+'<b>'+t.score+'</b></div>').join('');$('musicTurn').textContent='نوبت '+music.teams[music.current].name;$('musicRound').textContent='دور '+music.round+' از '+music.maxRounds}
function nextMusicTurn(){
 clearMusicTimers();musicAudio.pause();let pool=music.tracks.filter(t=>!musicSeen.has(t.key));if(!pool.length){music.tracks.forEach(t=>musicSeen.delete(t.key));pool=music.tracks.filter(t=>t.key!==music.track?.key);toast('چرخهٔ تازهٔ آهنگ‌های دریافت‌شده شروع شد.')}
 if(!pool.length){$('musicStatus').textContent='آهنگ دیگری باقی نمانده؛ بازی را پایان دهید و بانک تازه بگیرید.';music.phase='error';$('musicListen').disabled=true;$('musicReplace').disabled=true;return}
 music.track=pool[Math.floor(Math.random()*pool.length)];musicSeen.add(music.track.key);music.remaining=30000;music.deadline=null;music.phase='ready';music.played=false;musicScores();
 $('musicListen').hidden=false;$('musicReveal').hidden=false;musicAudio.src=music.track.url;musicAudio.load();$('musicAnswer').textContent='🎧 آمادهٔ شنیدن';$('musicJudge').hidden=true;$('musicReveal').disabled=true;$('musicListen').disabled=false;$('musicListen').textContent='▶ پخش ۲۰ ثانیه';$('musicReplace').disabled=false;$('musicTimer').textContent='00:30';$('musicStatus').textContent='نام آهنگ یا عبارتی از آن و خواننده را حدس بزنید. زمان با شروع صدا آغاز می‌شود.';
}
function musicTick(){if(!music||!music.deadline)return;music.remaining=Math.max(0,music.deadline-Date.now());$('musicTimer').textContent=format(Math.ceil(music.remaining/1000));if(!music.remaining)revealMusic()}
function pauseMusic(){if(!music||music.done)return;if(music.deadline)music.remaining=Math.max(0,music.deadline-Date.now());music.deadline=null;clearMusicTimers();musicAudio.pause();if(['playing','buffering','guessing'].includes(music.phase)){music.phase='paused';$('musicListen').disabled=false;$('musicListen').textContent='▶ ادامه / شنیدن دوباره';$('musicStatus').textContent='بازی متوقف است؛ برای ادامه، پخش را بزنید.'}}
function musicFailure(){if(!music||music.done||!['buffering','playing'].includes(music.phase))return;pauseMusic();music.phase='error';$('musicStatus').textContent='این آهنگ پخش نشد. دوباره پخش را بزنید یا آهنگ جایگزین انتخاب کنید؛ امتیاز و نوبت تغییری نمی‌کند.'}
$('musicListen').onclick=()=>{if(!music||music.done||music.phase==='answer'||screen!=='musicPlay')return;if(music.remaining<=0)return revealMusic();pauseMusic();clearTimeout(musicLoadTimer);musicAudio.pause();try{musicAudio.currentTime=0}catch(e){}music.phase='buffering';$('musicListen').disabled=true;$('musicStatus').textContent='در حال آماده‌کردن صدا…';const epoch=musicEpoch,key=music.track.key;musicLoadTimer=setTimeout(musicFailure,25000);musicAudio.play().catch(()=>{if(epoch===musicEpoch&&music?.track.key===key)musicFailure()})};
musicAudio.addEventListener('playing',()=>{if(!music||music.done||screen!=='musicPlay'||music.phase!=='buffering'){musicAudio.pause();return}clearTimeout(musicLoadTimer);music.phase='playing';music.played=true;if(!music.deadline)music.deadline=Date.now()+music.remaining;clearInterval(musicClock);musicClock=setInterval(musicTick,100);$('musicReveal').disabled=false;$('musicStatus').textContent='گوش کنید و حدس بزنید…'});
function musicClipEnd(){if(!music||music.phase!=='playing')return;musicAudio.pause();music.phase='guessing';$('musicListen').disabled=false;$('musicListen').textContent='↻ شنیدن دوباره';$('musicStatus').textContent='پاسخ گروه را بگویید، سپس نمایش پاسخ را بزنید.'}
musicAudio.addEventListener('timeupdate',()=>{if(musicAudio.currentTime>=20)musicClipEnd()});musicAudio.addEventListener('ended',musicClipEnd);musicAudio.addEventListener('error',musicFailure);
musicAudio.addEventListener('waiting',()=>{if(music?.phase==='playing'){if(music.deadline)music.remaining=Math.max(0,music.deadline-Date.now());music.deadline=null;clearMusicTimers();music.phase='buffering';$('musicListen').disabled=true;musicLoadTimer=setTimeout(musicFailure,25000)}});
function revealMusic(){if(!music||!music.played||music.done)return;pauseMusic();music.phase='answer';$('musicListen').hidden=true;$('musicReveal').hidden=true;$('musicAnswer').textContent=music.track.title+' — '+music.track.artist;$('musicStatus').textContent='نام ثبت‌شده در منبع است؛ نام شناخته‌شده یا عبارت درست از آهنگ را هم با توافق گروه بپذیرید.';$('musicJudge').hidden=false;$('musicReveal').disabled=true;$('musicListen').disabled=true}
function scoreMusic(points){if(!music||music.done||screen!=='musicPlay'||(points!==0&&music.phase!=='answer'))return;clearMusicTimers();musicAudio.pause();music.teams[music.current].score+=points;music.current++;if(music.current===2){music.current=0;music.round++}if(music.round>music.maxRounds)return finishMusic();nextMusicTurn()}
function finishMusic(){if(!music)return;pauseMusic();music.done=true;music.phase='done';const [a,b]=music.teams;$('musicWinner').textContent=a.score===b.score?'بازی مساوی شد!':'برنده: '+(a.score>b.score?a.name:b.name);$('musicResultScores').innerHTML=music.teams.map(t=>'<div class="result-row"><b>'+esc(t.name)+'</b><span>'+t.score+' امتیاز</span></div>').join('');show('musicResult')}
$('musicReveal').onclick=revealMusic;$('musicSkip').onclick=()=>scoreMusic(0);$('musicReplace').onclick=()=>{if(music&&!music.done)nextMusicTurn()};document.querySelectorAll('[data-music-score]').forEach(b=>b.onclick=()=>scoreMusic(Number(b.dataset.musicScore)));$('musicFinish').onclick=()=>{if(confirm('بازی تمام شود و نتیجه نمایش داده شود؟'))finishMusic()};$('musicAgain').onclick=()=>setup('music');document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMusic()});
