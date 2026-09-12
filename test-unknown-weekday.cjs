const assert=require("node:assert/strict"),V=require("./dist/course-vision"),M=require("./dist/course-model");
const result=V.assemble([{text:"电路分析\n@主南106",box:{x:100,y:200,width:100,height:300},startSection:8,endSection:10,start:"16:00",end:"18:30"}],[]);
assert.equal(result.drafts[0].sessions.length,1);
const c=M.mergeDrafts([],result.drafts)[0],s=c.sessions[0];
assert.equal(s.day,0);assert.equal(s.startSection,8);assert.equal(s.endSection,10);assert.equal(s.end,"18:30");
assert.throws(()=>M.validate(c,"2026-09-07"),/未知星期/);
s.day=1;assert.ok(M.validate(c,"2026-09-07").length);
console.log("PASS: unknown weekday preserves OCR sections/times through registration; export requires explicit weekday.");
