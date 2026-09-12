const assert=require("node:assert/strict"),V=require("./dist/course-vision");
const l=(text,y,h)=>({text,bbox:{x0:10,x1:200,y0:y,y1:y+h}});
assert.equal(V.detailBoundary([l("电路分析",0,40),l("主南",50,29),l("106",90,28)]),1);
assert.equal(V.detailBoundary([l("电路分析",0,40),l("主南",50,40),l("106",100,40)]),-1);
assert.equal(V.detailBoundary([l("电路分析",0,40),l("@主南106",50,40)]),1);
assert.equal(V.detailBoundary([l("离散数学",0,40),l("A",50,30)]),-1);
assert.equal(V.splitLocationSuffix("电路分析主南106").location,"");
assert.equal(V.splitLocationSuffix("机械制造工程实训东院310").location,"");
console.log("PASS: size-first boundary includes small Chinese location and digits together; equal-size text stays unsplit; symbols supported.");
