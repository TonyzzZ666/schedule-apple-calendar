(function(root){
let rows=[];
function minutes(t){if(!/^\d{2}:\d{2}$/.test(t))throw Error("请填写有效时间");const [h,m]=t.split(":").map(Number);if(h>23||m>59)throw Error("时间超出范围");return h*60+m;}
function clock(n){if(n<0||n>=1440)throw Error("作息不能跨越午夜");return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");}
function validate(r){if(!r.length)throw Error("请至少设置一节课");let end=-1;for(const s of r){const a=minutes(s.start),b=minutes(s.end);if(b<=a||a<end)throw Error("各节起止时间须递增且不能重叠");end=b;}return r;}
function generate(groups,duration,gap){
 if(!Number.isInteger(duration)||duration<10||duration>180||!Number.isInteger(gap)||gap<0||gap>120)throw Error("每节10–180分钟，课间0–120分钟");
 const result=[];for(const g of groups){if(!Number.isInteger(g.count)||g.count<0||g.count>16)throw Error("每段节数须为0–16");if(!g.count)continue;const start=minutes(g.start);
 for(let i=0;i<g.count;i++)result.push({section:result.length+1,start:clock(start+i*(duration+gap)),end:clock(start+i*(duration+gap)+duration)});
 }validate(result);return result;
}
function resolve(a,b){const x=rows[a-1],y=rows[b-1];return a>=1&&b>=a&&x&&y?{start:x.start,end:y.end}:null;}
function mapSections(box,labels){
 if(labels.length<3)return null;
 const sorted=[...labels].sort((a,b)=>a.y-b.y),gaps=sorted.slice(1).map((l,i)=>(l.y-sorted[i].y)/(l.section-sorted[i].section)).filter(g=>g>0).sort((a,b)=>a-b),pitch=gaps[Math.floor(gaps.length/2)];
 if(!pitch||sorted.some((l,i)=>i&&l.section<=sorted[i-1].section))return null;
 const anchor=sorted[0];if(sorted.some(l=>Math.abs(l.y-anchor.y-(l.section-anchor.section)*pitch)>pitch*.15))return null;
 const fitted=Array.from({length:sorted.at(-1).section},(_,i)=>({section:i+1,y:anchor.y+(i+1-anchor.section)*pitch}));
 const inside=fitted.filter(l=>l.y>=box.y-pitch*.15&&l.y<box.y+box.height-pitch*.15);
 if(!inside.length)return null;
 return {startSection:inside[0].section,endSection:inside.at(-1).section};
}
root.SchoolSchedule={generate,validate,resolve,mapSections,getRows:()=>rows.map(r=>({...r})),setRows:r=>{rows=validate(r).map(x=>({...x}));}};
if(typeof module!=="undefined")module.exports=root.SchoolSchedule;
})(globalThis);

