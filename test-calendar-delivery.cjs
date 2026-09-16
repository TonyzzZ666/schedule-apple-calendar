const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('./work/v02-tests/node_modules/jsdom');
const KEY='course-calendar.draft.v1';
function page(saved){
 const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{runScripts:'outside-only',url:'http://localhost/'}),w=dom.window;
 w.TextEncoder=TextEncoder;w.Blob=Blob;w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.downloads=[];w.URL.createObjectURL=b=>{w.lastBlob=b;return 'blob:test';};w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){w.downloads.push({download:this.download,target:this.target});};
 if(saved)w.localStorage.setItem(KEY,saved);
 for(const s of w.document.querySelectorAll('script[src]'))w.eval(fs.readFileSync('dist/'+s.getAttribute('src'),'utf8'));
 return dom;
}
(async()=>{
 const pages=[];try{
 const a=page();pages.push(a);const w=a.window,el=id=>w.document.getElementById(id);
 el('chooseSchool').click();el('saveSchedule').click();el('nationalHolidays').click();
 el('extraName').value='额外实验';el('extraWeeks').value='3,5';el('extraDay').value='5';el('extraStart').value='14:00';el('extraEnd').value='16:00';
 el('extraForm').dispatchEvent(new w.Event('submit',{cancelable:true}));el('confirmCourse').click();
 el('rawText').value='未完成的识别文字';
 assert.equal(w.DraftStore.flush(),true);
 const before=JSON.stringify(w.CourseWorkspace.events()),raw=w.localStorage.getItem(KEY);
 w.DraftStore.validate(JSON.parse(raw));
 const b=page(raw);pages.push(b);const v=b.window;
 assert.equal(JSON.stringify(v.CourseWorkspace.events()),before);assert.equal(v.AppFlow.mode,'school');
 assert.equal(v.document.getElementById('rawText').value,'未完成的识别文字');
 assert.equal(v.SchoolSchedule.resolve(1,2).end,'09:40');
 assert.equal(JSON.stringify(v.CalendarOptions.get()),JSON.stringify(w.CalendarOptions.get()));
 el('download').click();assert.equal(w.downloads.length,1);assert.match(await w.lastBlob.text(),/BEGIN:VEVENT/);
 assert.equal(el('importPanel').hidden,false);assert.match(el('message').textContent,/无法检测/);
 const p=w.CalendarDelivery.platform;
 assert.equal(p({userAgent:'Macintosh',maxTouchPoints:5}),'ios');assert.equal(p({userAgent:'Macintosh'}),'mac');
 assert.equal(p({userAgent:'iPhone MicroMessenger'}),'embedded');
 Object.defineProperty(w.navigator,'userAgent',{value:'iPhone',configurable:true});
 el('download').click();assert.equal(w.downloads.at(-1).target,'_blank');
 el('downloadOnly').click();assert.match(w.downloads.at(-1).download,/课表\.ics$/);
 Object.defineProperty(w.navigator,'userAgent',{value:'iPhone MicroMessenger',configurable:true});
 const count=w.downloads.length;el('download').click();assert.equal(w.downloads.length,count);
 const state=JSON.parse(raw);state.workspace.courses[0].needsReview=true;v.DraftStore.restore(state);
 assert.equal(v.document.getElementById('download').disabled,true);assert.throws(()=>v.CourseWorkspace.events(),/待核对/);
 const c=page('{broken');pages.push(c);assert.equal(c.window.DraftStore.flush(),false);assert.equal(c.window.localStorage.getItem(KEY),'{broken');
 w.localStorage.setItem(KEY,'different-tab');assert.equal(w.DraftStore.flush(),false);assert.equal(w.localStorage.getItem(KEY),'different-tab');
 const d=page();pages.push(d);d.window.Storage.prototype.setItem=()=>{throw Error('quota');};
 assert.equal(d.window.DraftStore.flush(),false);assert.match(d.window.document.getElementById('draftStatus').textContent,/无法保存/);
 console.log('PASS: draft roundtrip, school/holiday/extra persistence, review gate, delivery branches, corrupt storage, cross-tab and quota protection.');
 }finally{for(const p of pages)p.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
