const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');vm.runInThisContext(fs.readFileSync(require('path').join(__dirname,'../assets/voice-parser.js'),'utf8')+';globalThis.p=VoiceTaskParser');const now=new Date('2026-11-08T10:00:00');
const cases=[
 ['فردا ساعت نه صبح به علی زنگ بزن','09:00','dates',['2026-11-09'],'به علی زنگ بزن'],
 ['هر دوشنبه و سه شنبه ساعت نه و نیم شب دارو بخورم','21:30','week',['1','2'],'دارو بخورم'],
 ['نیم ساعت دیگه یادم بنداز دارو بخورم','10:30','dates',['2026-11-08'],'دارو بخورم'],
 ['یک ساعت و نیم دیگه یادم بنداز ورزش کنم','11:30','dates',['2026-11-08'],'ورزش کنم'],
 ['پس فردا ساعت ۱۵:۳۰ خرید کنم','15:30','dates',['2026-11-10'],'خرید کنم'],
 ['فردا صبح ساعت نه نان بخرم','09:00','dates',['2026-11-09'],'نان بخرم'],
 ['هر روز ساعت هشت صبح پیاده روی','08:00','daily',[],'پیاده روی'],
 ['سه روز دیگه ساعت شانزده و ربع خرید کنم','16:15','dates',['2026-11-11'],'خرید کنم'],
 ['ساعت بیست و یک و سی دقیقه خرید کنم','21:30','dates',['2026-11-08'],'خرید کنم'],
 ['فردا ساعت نه صبح به علی پیامک بده که دیر می رسم','09:00','dates',['2026-11-09'],'به علی پیامک بده'],
 ['هر دوشنبه ساعت ۹ صبح به شهر کتاب بروم','09:00','week',['1'],'به شهر کتاب بروم']
];for(const [raw,time,mode,choices,title] of cases){const d=p.parse(raw,now);assert.equal(d.time,time,raw);assert.equal(d.mode,mode,raw);assert.deepEqual(d.choices,choices,raw);assert.equal(d.title,title,raw);assert.equal(d.issues.length,0,raw);}
assert.equal(p.parse('فردا ساعت نه صبح به علی پیامک بده که دیر می رسم',now).body,'دیر می رسم');
assert.deepEqual(p.parse('ساعت نه نان بخر',now).ambiguous,['09:00','21:00']);assert.equal(p.parse('ساعت نه نان بخر',now,'21:00').time,'21:00');assert.deepEqual(p.parse('ساعت نه نان بخر',now,'09:00').choices,['2026-11-09']);
assert.equal(p.parse('خرید',now).time,'');assert(p.parse('امروز ساعت نه صبح خرید',now).issues.some(s=>s.includes('گذشته')));assert(p.parse('بیستم آبان ساعت ده صبح خرید',now).issues.length);assert.equal(p.parse('فردا ساعت ۲۵ خرید',now).time,'');assert(p.parse('فردا ساعت نه صبح و ساعت ده شب خرید',now).issues.length);
assert.equal(p.parse('نیم ساعت دیگه دارو بخور',new Date('2026-11-08T23:45:00')).choices[0],'2026-11-09');console.log('PASS 20 Persian voice parsing cases');
