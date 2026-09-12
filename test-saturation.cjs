const assert=require("node:assert/strict"),V=require("./dist/course-vision");
for(const color of [[255,195,20],[30,190,220],[190,30,220]]){
 const im={width:60,height:60,data:new Uint8ClampedArray(60*60*4)};
 for(let i=0;i<im.data.length;i+=4)im.data.set([...color,255],i);
 for(let y=20;y<40;y++)for(let x=20;x<40;x++)im.data.set([245,245,245,255],(y*60+x)*4);
 const out=V.enhance(im,{x:0,y:0,width:60,height:60},1,"channel");
 const at=(x,y)=>out.data[((y+8)*out.width+x+8)*4];
 assert.ok(at(30,30)<35);assert.equal(at(12,12),255);
}
console.log("PASS: yellow/cyan/purple backgrounds become white while light glyphs remain dark.");
