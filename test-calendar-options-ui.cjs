const fs=require("node:fs"),assert=require("node:assert/strict"),{JSDOM}=require("./work/v02-tests/node_modules/jsdom");
const dom=new JSDOM(fs.readFileSync("dist/index.html","utf8"),{runScripts:"outside-only",url:"http://localhost/"}),w=dom.window,d=w.document;
w.TextEncoder=TextEncoder;w.Blob=Blob;w.HTMLElement.prototype.scrollIntoView=()=>{};
let downloaded;w.URL.createObjectURL=b=>{downloaded=b;return "blob:test";};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
for(const file of ["school-schedule","calendar","course-model","course-import","course-vision","ocr","calendar-adjustments","app","calendar-options-ui","schedule-ui","entry-flow"])w.eval(fs.readFileSync("dist/"+file+".js","utf8"));
const el=id=>d.getElementById(id),click=id=>el(id).click(),fill=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new w.Event("input",{bubbles:true}));};
(async()=>{
try{
 click("chooseManual");click("nationalHolidays");
 assert.equal(d.querySelector('[aria-label="2026-09-25 停课，点击恢复"]').getAttribute("aria-pressed"),"true");
 fill("extraName","电路实验");fill("extraWeeks","3,5");fill("extraDay","5");fill("extraStart","14:00");fill("extraEnd","16:00");
 el("extraForm").dispatchEvent(new w.Event("submit",{cancelable:true}));
 assert.match(el("courses").textContent,/加课/);assert.equal(el("download").disabled,true);
 click("confirmCourse");assert.equal(el("count").textContent,"1 次已确认课程");
 assert.ok(!el("events").textContent.includes("2026-09-25"));assert.ok(el("events").textContent.includes("2026-10-09"));
 d.querySelector('[aria-label="2026-09-25 停课，点击恢复"]').click();
 assert.equal(el("count").textContent,"2 次已确认课程");
 click("manualHolidays");click("nationalHolidays");assert.equal(el("count").textContent,"2 次已确认课程");
 click("download");const ics=await downloaded.text();assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,2);assert.ok(ics.includes("额外加课"));
 fill("registerName","正课");el("registerForm").dispatchEvent(new w.Event("submit",{cancelable:true}));
 d.querySelector('[aria-label="周四有课"]').click();
 for(const [label,value] of [["周四时段1开始时间","08:00"],["周四时段1结束时间","09:40"],["周四时段1周数","4"]]){
  const field=d.querySelector('[aria-label="'+label+'"]');field.value=value;field.dispatchEvent(new w.Event("input"));
 }
 click("confirmCourse");assert.equal(el("count").textContent,"2 次已确认课程");
 fill("makeupTarget","2026-10-10");fill("makeupSource","2026-10-01");el("makeupForm").dispatchEvent(new w.Event("submit",{cancelable:true}));
 assert.equal(el("count").textContent,"3 次已确认课程");assert.match(el("events").textContent,/2026-10-10.*补 2026-10-01/);
 fill("holidayMonth","2026-10");el("holidayMonth").dispatchEvent(new w.Event("change"));
 d.querySelector('[aria-label="2026-10-10 上课，点击停课"]').click();assert.equal(el("count").textContent,"2 次已确认课程");
 assert.match(el("makeupList").textContent,/暂不生效/);
 console.log("PASS: calendar toggle, national overrides, extra review, preview/download consistency and makeup UI.");
}finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
