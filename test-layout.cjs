const assert=require("node:assert/strict"),V=require("./dist/course-vision");
const im={width:300,height:400,data:new Uint8ClampedArray(300*400*4).fill(255)};
const l=(text,y,h)=>({text,bbox:{x0:40,x1:260,y0:y,y1:y+h}});
for(let x=35;x<265;x++)im.data[(190*300+x)*4]=100;
assert.equal(V.visualBoundary([l("电路分析",80,35),l("主南",220,35),l("106",270,35)],im).index,1);
assert.equal(V.visualBoundary([l("工程力学B",40,35),l("南院博学楼",270,30),l("304",315,30)],{...im,data:new Uint8ClampedArray(im.data.length).fill(255)}).reason,"whitespace");
console.log("PASS: separator and whitespace distinguish same-size title/location.");
