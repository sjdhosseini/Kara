'use strict';
const newsTopics=[{id:'iran',name:'ایران'},{id:'world',name:'بین‌المللی'},{id:'sport_ir',name:'ورزشی ایران'},{id:'sport_world',name:'ورزشی بین‌المللی'}];
const sources=[
{id:'isna',name:'ایسنا',lang:'fa',domain:'isna.ir',groups:['iran','sport_ir'],url:'https://www.isna.ir/rss'},
{id:'irna',name:'ایرنا',lang:'fa',domain:'irna.ir',groups:['iran','sport_ir'],url:'https://www.irna.ir/rss'},
{id:'mehr',name:'مهر',lang:'fa',domain:'mehrnews.com',groups:['iran','sport_ir'],url:'https://www.mehrnews.com/rss'},
{id:'varzesh3',name:'ورزش۳',lang:'fa',domain:'varzesh3.com',groups:['sport_ir','sport_world']},
{id:'football360',name:'فوتبال۳۶۰',lang:'fa',domain:'football360.ir',groups:['sport_ir','sport_world']},
{id:'reuters',name:'رویترز',lang:'en',domain:'reuters.com',groups:['world','sport_world']},
{id:'ap',name:'Associated Press',lang:'en',domain:'apnews.com',groups:['world','sport_world']},
{id:'bbc',name:'BBC',lang:'en',domain:'bbc.com',groups:['world','sport_world'],url:'https://feeds.bbci.co.uk/news/world/rss.xml',sport:'https://feeds.bbci.co.uk/sport/rss.xml'},
{id:'cnn',name:'CNN',lang:'en',domain:'cnn.com',groups:['world','sport_world']},
{id:'fox',name:'Fox News',lang:'en',domain:'foxnews.com',groups:['world','sport_world'],url:'https://moxie.foxnews.com/google-publisher/world.xml'},
{id:'guardian',name:'گاردین',lang:'en',domain:'theguardian.com',groups:['world','sport_world'],url:'https://www.theguardian.com/world/rss',sport:'https://www.theguardian.com/uk/sport/rss'},
{id:'aljazeera',name:'الجزیره',lang:'en',domain:'aljazeera.com',groups:['world','sport_world']},
{id:'dw',name:'DW',lang:'en',domain:'dw.com',groups:['world']},
{id:'france24',name:'France 24',lang:'en',domain:'france24.com',groups:['world']}
];
function categorySources(topic){return sources.filter(s=>s.groups.includes(topic)).sort((a,b)=>topic.startsWith('sport_')?Number(['varzesh3','football360'].includes(b.id))-Number(['varzesh3','football360'].includes(a.id)):0);}
function topicFeed(s,topic){let words='';if(topic==='sport_ir')words='(ورزش OR فوتبال OR والیبال OR کشتی) (ایران OR استقلال OR پرسپولیس OR سپاهان OR تراکتور OR تیم ملی)';if(topic==='sport_world')words=s.lang==='fa'?'(فوتبال OR ورزش) (اروپا OR خارجی OR رئال OR بارسلونا OR انگلیس OR ایتالیا OR اسپانیا)':'(sports OR football OR soccer OR tennis OR basketball)';if(topic==='iran')words='(ایران OR تهران OR دولت OR مجلس OR استان)';const q='site:'+s.domain+' '+words+' when:7d';return 'https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl='+(s.lang==='fa'?'fa':'en-US')+'&gl=US&ceid=US:'+(s.lang==='fa'?'fa':'en');}
function directFeed(s,topic){if(s.id==='football360')return 'https://football360.ir/';if(s.id==='varzesh3')return 'https://www.varzesh3.com/rss/'+(topic==='sport_ir'?'domesticFootball':'foreignFootball');if(topic==='iran'||topic==='world')return s.url||null;if(topic==='sport_world')return s.sport||null;return null;}
function parseFootball360(html){const match=/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);if(!match)throw Error('ساختار فوتبال۳۶۰ تغییر کرده است');const blocks=JSON.parse(match[1]).props?.pageProps?.explorer?.data;if(!Array.isArray(blocks))throw Error('فهرست خبر پیدا نشد');const items=[];for(const block of blocks){const title=String(block.title||'');const category=title.includes('داخلی')?'sport_ir':title.includes('خارجی')?'sport_world':null;if(!category)continue;for(const p of block.posts||[]){if(p.post_type!=='N'||!/^\d+$/.test(String(p.code))||!p.title)continue;items.push({title:p.title,summary:p.sub_title||'',link:'https://football360.ir/post/'+p.code+'/',pubDate:Number.isFinite(p.published_at)?new Date(p.published_at*1000).toUTCString():'',category});}}if(!items.length)throw Error('خبر قابل خواندن نیست');return {items};}
