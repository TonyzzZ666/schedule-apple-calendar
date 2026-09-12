const assert=require("node:assert/strict"),fs=require("fs"),V=require("./dist/course-vision"),M=require("./dist/course-model");
const h=V.completeHeaders([{day:7,x:192},{day:1,x:492},{day:2,x:791},{day:4,x:1390},{day:5,x:1690}],2151);
assert.deepEqual(h.map(x=>x.day),[7,1,2,3,4,5,6]);
const blocks=JSON.parse(fs.readFileSync("work/v02-tests/real-blocks.json","utf8"));
const result=V.assemble(blocks,h);
assert.deepEqual(result.drafts.map(c=>c.name).sort(),["离散数学A","概率论与数理统计A","计算机组成与体系结构A","毛泽东思想和中国特色社会主义理论体系概论","算法设计与分析"].sort());
const byName=Object.fromEntries(result.drafts.map(c=>[c.name,c]));
assert.deepEqual(byName["离散数学A"].sessions.map(s=>s.day),[2,4]);
assert.deepEqual(byName["计算机组成与体系结构A"].sessions.map(s=>s.day),[1,5]);
assert.deepEqual(byName["算法设计与分析"].sessions.map(s=>s.day),[3,5]);
assert.deepEqual(byName["概率论与数理统计A"].sessions.map(s=>s.day),[3]);
assert.deepEqual(byName["毛泽东思想和中国特色社会主义理论体系概论"].sessions.map(s=>s.day),[2]);
assert.ok(result.drafts.every(c=>c.sessions.every(s=>!s.start&&!s.end)));
const merged=M.mergeDrafts([],result.drafts);assert.equal(merged.length,5);assert.equal(merged.flatMap(c=>c.sessions).length,8);
assert.equal(M.mergeDrafts(merged,result.drafts).flatMap(c=>c.sessions).length,8);
const separated=V.assemble([{box:{x:400,y:100,width:200,height:60},text:"课程名称\n@201"},{box:{x:400,y:400,width:200,height:60},text:"课程名称\n@201"}],[{day:1,x:500}]);
assert.equal(M.mergeDrafts([],separated.drafts)[0].sessions.length,2);
console.log("PASS: real screenshot yields 5 distinct Chinese courses, 8 day arrangements; multiline names, repeated blocks, room labels, same-day separate slots, repeat-import dedup and blank time preservation.");

const mobileSource=JSON.parse(fs.readFileSync("work/v02-tests/mobile-timetable-size.json","utf8"));
const mobilePixels=fs.existsSync("work/v02-tests/mobile-timetable.rgba")?fs.readFileSync("work/v02-tests/mobile-timetable.rgba"):null;
const mobileBoxes=mobilePixels?V.detect({...mobileSource,data:mobilePixels}):null;
if(mobileBoxes)assert.equal(mobileBoxes.length,9,"exclude mobile banners and footer");
const mobile=JSON.parse(fs.readFileSync("work/v02-tests/mobile-pipeline-result.json","utf8"));
const mobileExpected={"离散数学A":[2,4],"概率论与数理统计A":[3],"计算机组成与体系结构A":[1,5],"腰旗橄榄球1":[1],"毛泽东思想和中国特色社会主义理论体系概论":[2],"算法设计与分析":[3,5]};
assert.equal(mobile.drafts.length,6);
for(const c of mobile.drafts)assert.deepEqual(c.sessions.map(s=>s.day),mobileExpected[c.name],c.name);
assert.equal(M.mergeDrafts([],mobile.drafts).flatMap(c=>c.sessions).length,9);
console.log("PASS: mobile automatic region detection has 9 blocks; recorded production OCR has 6 names and 9 correct weekday arrangements.");

const rooms={"离散数学A":"3区1-506","概率论与数理统计A":"3区2-108","腰旗橄榄球1":"九一二体育场","算法设计与分析":"3区1-212","计算机组成与体系结构A":"","毛泽东思想和中国特色社会主义理论体系概论":""};
for(const c of mobile.drafts){if(c.name!=="腰旗橄榄球1")assert.equal(c.location,rooms[c.name]);else assert.ok(c.location.endsWith("体育场"));assert.ok(c.sessions.every(s=>s.start&&!s.end));}
assert.deepEqual(mobile.drafts.find(c=>c.name==="离散数学A").sessions.map(s=>s.start),["08:00","09:50"]);
console.log("PASS: mobile room text, clipped room omission and start-only clock candidates.");

const split=V.assemble([{box:{x:400,y:100,width:200,height:200},text:"算法设计\n与分析\n📍九一二体育场",location:"九一二体育场",titleLines:["算法设计","与分析"]}],[{day:1,x:500}]).drafts[0];
assert.equal(split.name,"算法设计与分析");
assert.equal(split.location,"九一二体育场");
assert.equal(M.mergeDrafts([],[split])[0].sessions[0].location,"九一二体育场");
console.log("PASS: structured title boundary stays separate from room through registration.");

const line=(text,y,h)=>({text,bbox:{x0:20,x1:180,y0:y,y1:y+h}});
assert.equal(V.detailBoundary([line("算法设计",0,40),line("与分析",50,40),line("南湖校区",110,30),line("西楼201",150,30)]),2);
assert.equal(V.detailBoundary([line("离散数学",0,40),line("A",50,30)]),-1);
assert.equal(V.detailBoundary([line("毛泽东思想",0,40),line("理论体系",50,39),line("概论",100,38)]),-1);
assert.equal(V.detailBoundary([line("数据结构",0,40),line("@3区1-506",50,40)]),1);
console.log("PASS: smaller address lines separate from title; wrapped course names and A suffix remain titles.");

// Text-only campus suffix splitting removed: see test-size-first.cjs.
const scene={width:800,height:600,data:new Uint8ClampedArray(800*600*4)};
for(let y=0;y<600;y++)for(let x=0;x<800;x++){const i=(y*800+x)*4;scene.data.set((x+y)%17<5?[245,225,240,255]:[255,255,255,255],i);}
function rect(x,y,w,h,rgb){for(let r=y;r<y+h;r++)for(let c=x;c<x+w;c++)scene.data.set([...rgb,255],(r*800+c)*4);}
rect(100,100,90,100,[100,190,240]);rect(100,200,90,100,[240,150,110]);rect(200,100,90,100,[160,110,230]);rect(400,300,90,100,[100,190,240]);
const found=V.detect(scene);
assert.equal(found.length,4,"touching different colors remain separate despite patterned background");
assert.equal(found.filter(b=>b.x===100).length,2);
assert.deepEqual(found.map(b=>b.x),[100,100,200,400],"column-first order");
console.log("PASS: touching color boundaries, patterned noise rejection and column-first order.");

