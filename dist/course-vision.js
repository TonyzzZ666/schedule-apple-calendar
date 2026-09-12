(function(root){
"use strict";
function detect(source){
 const {data,width,height}=source,step=2,w=Math.ceil(width/step),h=Math.ceil(height/step),mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h),boxes=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(Math.min(y*2,height-1)*width+Math.min(x*2,width-1))*4,r=data[i],g=data[i+1],b=data[i+2];mask[y*w+x]=Math.max(r,g,b)-Math.min(r,g,b)>12&&Math.max(r,g,b)>130&&Math.min(r,g,b)<248?1:0;}
 for(let n=0;n<mask.length;n++){
 if(!mask[n]||seen[n])continue;
 const seed=(Math.floor(n/w)*step*width+(n%w)*step)*4;
 let head=0,tail=1,count=0,minX=w,maxX=0,minY=h,maxY=0;queue[0]=n;seen[n]=1;
 while(head<tail){const k=queue[head++],x=k%w,y=Math.floor(k/w);count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 for(const j of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(j>=0&&mask[j]&&!seen[j]){const pixel=(Math.floor(j/w)*step*width+(j%w)*step)*4;if(Math.max(...[0,1,2].map(c=>Math.abs(data[pixel+c]-data[seed+c])))<=36){seen[j]=1;queue[tail++]=j;}}
 }
 const bw=(maxX-minX+1)*2,bh=(maxY-minY+1)*2;
 if(bw>width*.055&&bw<width*.4&&bh>Math.max(22,height*.02)&&count>bw*bh*.12)boxes.push({x:minX*2,y:minY*2,width:Math.min(bw,width-minX*2),height:Math.min(bh,height-minY*2)});
 }
 if(boxes.length<2)return [];
 const groups=boxes.map(b=>boxes.filter(x=>Math.abs(x.width-b.width)<b.width*.22));
 const main=groups.sort((a,b)=>b.length-a.length)[0];
 if(main.length<2)return [];
 const grid=columns(main,width);
 const aligned=grid.length>=5?main.filter(b=>grid.some(c=>Math.abs(c.x-(b.x+b.width/2))<c.width*.18)):main;
 return aligned.sort((a,b)=>Math.abs(a.x-b.x)<Math.min(a.width,b.width)*.3?a.y-b.y:a.x-b.x).slice(0,80);
}
function resize(source,scale=3){
 const width=source.width*scale,height=source.height*scale,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const fx=Math.max(0,(x+.5)/scale-.5),fy=Math.max(0,(y+.5)/scale-.5),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(source.width-1,x0+1),y1=Math.min(source.height-1,y0+1),dx=fx-x0,dy=fy-y0;
 for(let c=0;c<4;c++)data[(y*width+x)*4+c]=(1-dy)*((1-dx)*source.data[(y0*source.width+x0)*4+c]+dx*source.data[(y0*source.width+x1)*4+c])+dy*((1-dx)*source.data[(y1*source.width+x0)*4+c]+dx*source.data[(y1*source.width+x1)*4+c]);
 }return {width,height,data};
}
function backgroundColor(source,box){
 const bins=new Map();
 for(let y=box.y+4;y<box.y+box.height-4;y+=5)for(let x=box.x+4;x<box.x+box.width-4;x+=5){
 const i=(y*source.width+x)*4,rgb=[source.data[i],source.data[i+1],source.data[i+2]],key=rgb.map(c=>c>>4).join(",");
 const v=bins.get(key)||{count:0,sum:[0,0,0]};v.count++;rgb.forEach((c,k)=>v.sum[k]+=c);bins.set(key,v);
 }
 const best=[...bins.values()].sort((a,b)=>b.count-a.count)[0];
 return best?best.sum.map(c=>c/best.count):[255,255,255];
}
function enhance(source,box,scale=3,mode="standard"){
 const pad=8,width=box.width+pad*2,height=box.height+pad*2,data=new Uint8ClampedArray(width*height*4);data.fill(255);
 const bg=backgroundColor(source,box),darkInk=Math.min(...bg)>175;
 const channel=bg.indexOf(Math.min(...bg));
 for(let y=0;y<box.height;y++)for(let x=0;x<box.width;x++){
 const i=((box.y+y)*source.width+box.x+x)*4;
 const coverage=bg.map((b,c)=>255-b>40?(source.data[i+c]-b)/(255-b):null).filter(x=>x!==null);
 let alpha=darkInk?Math.max(0,Math.min(1,Math.max(...bg.map((b,c)=>(b-source.data[i+c])/Math.max(60,b-100))))):Math.max(0,Math.min(1,...coverage));
 if(mode==="channel"){const contrast=(source.data[i+channel]-bg[channel])/Math.max(40,255-bg[channel]);alpha=Math.max(0,Math.min(1,(contrast-.07)/.83));}
 const edge=x<5||y<5||x>=box.width-5||y>=box.height-5;
 const v=edge?255:255*(1-Math.pow(alpha,.75)),j=((pad+y)*width+pad+x)*4;data[j]=data[j+1]=data[j+2]=v;
 }
 return resize({width,height,data},scale);
}
function columns(boxes,width){
 const widths=boxes.map(b=>b.width).sort((a,b)=>a-b),cw=widths[Math.floor(widths.length/2)],centers=[];
 for(const b of [...boxes].sort((a,b)=>a.x-b.x)){const x=b.x+b.width/2;if(!centers.some(c=>Math.abs(c-x)<cw*.3))centers.push(x);}
 if(centers.length<2)return [];
 const gaps=centers.slice(1).map((x,i)=>x-centers[i]),step=Math.min(...gaps);
 if(step<cw*.8||step>cw*1.5||gaps.some(g=>Math.abs(g/step-Math.round(g/step))>.12))return [];
 const result=[];for(let k=-7;k<=7;k++){const x=centers[0]+step*k;if(x>step*.65&&x<width-step*.3)result.push({x,width:step});}
 return result;
}
function completeHeaders(headers,width){
 if(headers.length<3)return headers;
 const ordered=[...headers].sort((a,b)=>a.x-b.x),gaps=ordered.slice(1).map((x,i)=>x.x-ordered[i].x);
 let best=null;
 for(const gap of gaps)for(let div=1;div<=3;div++){
 const step=gap/div;if(step<width*.08||step>width*.3)continue;
 for(const anchor of ordered){
 const score=ordered.filter(h=>{const k=Math.round((h.x-anchor.x)/step);return Math.abs(h.x-anchor.x-k*step)<step*.12&&((anchor.day-1+k)%7+7)%7+1===h.day;}).length;
 if(!best||score>best.score)best={step,anchor,score};
 }}
 if(!best||best.score<3||best.score<Math.ceil(headers.length*.7))return headers;
 const result=[];for(let k=-6;k<=6;k++){
 const x=best.anchor.x+k*best.step,day=((best.anchor.day-1+k)%7+7)%7+1;
 if(x<best.step*.4||x>width-best.step*.3)continue;
 result.push({x,day,inferred:!ordered.some(h=>h.day===day&&Math.abs(h.x-x)<best.step*.12)});
 }return result.sort((a,b)=>a.x-b.x);
}
function isRoomLine(s){return /[@＠©◎📍]|\d+(?:区|X)|^\d+[一-鿿]|^[日目回]\d|^(?:教室|地点|上课地点)[:：]|(?:教学楼|体育场|体育馆)/.test(s.normalize("NFKC").replace(/\s/g,""));}
function splitLocationSuffix(name){return {name,location:""};}
function separateDraftLocation(draft){return draft;}
function assemble(blocks,headers=[]){
 const courses=[];
 for(const b of blocks){
 const lines=b.text.normalize("NFKC").split(/\n/).map(s=>s.replace(/[ \t]/g,"").trim()).filter(s=>s&&!/^(冲突|冲实|课程冲突)$/.test(s));
 const room=lines.findIndex(s=>/[@＠©◎📍]/u.test(s));
 const titleLines=b.titleLines??(room<0?lines:lines.slice(0,room)); let name=titleLines.filter((s,i)=>/[一-鿿]/.test(s)||(i>0&&/^(?:[A-Za-z]|\([A-Za-z]+\))$/.test(s))).join("").replace(/[|]/g,"").trim();
 if(!name||name.length>100)continue;
 let location=b.location??(room>=0?lines.slice(room).join("").replace(/^.*?[@＠©◎]+/,""):"");
 
 const cx=b.box.x+b.box.width/2;
 const header=headers.length?headers.reduce((a,h)=>Math.abs(h.x-cx)<Math.abs(a.x-cx)?h:a):null;
 const day=header&&Math.abs(header.x-cx)<b.box.width*.8?header.day:0;
 let c=courses.find(c=>c.name===name);
 if(!c){c={name,teacher:b.teacher||"",location,sessions:[],sourceText:"",needsReview:true};courses.push(c);}
 const raw=b.text.trim()+(b.reviewReason?"\n"+b.reviewReason:"")+"\n"+(b.location===""?"地点未可靠识别，请对照原图补充。\n":"")+(b.startSection?"节次候选：第"+b.startSection+"–"+b.endSection+"节；起止时间按已确认作息计算，仍须核对。":"开始时间为时间轴候选，结束时间待核对。")+"学期周数待核对。";
 c.sourceText+=(c.sourceText?"\n\n":"")+raw;
 c.sessions.push({day,startSection:b.startSection||null,endSection:b.endSection||null,start:b.start||"",end:b.end||"",weeks:"1-16",parity:"all",location,sourceText:raw,sourceSlot:day+":"+b.box.y,y:b.box.y,bottom:b.box.y+b.box.height});
 }
 for(const c of courses){
 c.sessions.sort((a,b)=>a.day-b.day||a.y-b.y);
 const merged=[];
 for(const s of c.sessions){const prev=merged.at(-1);if(prev&&prev.day===s.day&&prev.location===s.location&&s.y-prev.bottom<16){prev.bottom=s.bottom;prev.endSection=s.endSection||prev.endSection;prev.end=s.end||prev.end;prev.sourceText+="\n"+s.sourceText;}else merged.push({...s});}
 c.sessions=merged;
 }
 return {drafts:courses,text:courses.map(c=>"课程："+c.name+"\n教室："+c.location+"\n"+c.sourceText).join("\n\n"),gridDetected:headers.length>0};
}
function canvas(im){const c=document.createElement("canvas");c.width=im.width;c.height=im.height;c.getContext("2d").putImageData(new ImageData(im.data,im.width,im.height),0,0);return c;}
﻿function cropPixels(im,x,y,width,height,scale=1){
 x=Math.max(0,Math.floor(x));y=Math.max(0,Math.floor(y));width=Math.min(Math.ceil(width),im.width-x);height=Math.min(Math.ceil(height),im.height-y);
 const data=new Uint8ClampedArray(width*height*4);
 for(let r=0;r<height;r++)data.set(im.data.subarray(((y+r)*im.width+x)*4,((y+r)*im.width+x+width)*4),r*width*4);
 return resize({data,width,height},scale);
}
function ocrLines(data){return (data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));}
function detailBoundary(lines){
 if(lines.length<2)return -1;
 const height=l=>{
 const h=l.bbox.y1-l.bbox.y0;
 const sizes=[];
 return sizes.length?sizes[Math.floor(sizes.length/2)]:h;
 };
 // Compare measured glyph heights before considering any location symbol.
 for(let i=1;i<lines.length;i++){
 const head=lines.slice(0,i).map(height).sort((a,b)=>a-b),base=head[Math.floor(head.length/2)],tail=lines.slice(i);
 if(tail.length===1&&tail[0].text.replace(/\s/g,"").length<2)continue;
 const heights=tail.map(height).sort((a,b)=>a-b);if(height(tail[0])>heights[Math.floor(heights.length/2)]*1.12)continue;
 if(tail.every(l=>height(l)>base*.35&&height(l)<base*.92)&&
 lines[i].bbox.y0>=lines[i-1].bbox.y1&&Math.abs(lines[i].bbox.x0-lines[0].bbox.x0)<base*2)return i;
 }
 return lines.findIndex(l=>/[@＠©◎📍]/u.test(l.text));
}
function visualBoundary(lines,im){
 if(lines.length<2)return {index:-1,reason:"insufficient-lines"};
 const median=a=>{a=[...a].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
 const sizes=lines.map(l=>l.bbox.y1-l.bbox.y0),h=median(sizes);
 const gaps=lines.slice(1).map((l,i)=>({index:i+1,gap:l.bbox.y0-lines[i].bbox.y1}));
 // Thin, long ink segments between text lines are separator evidence.
 for(const g of gaps){
 for(let y=Math.ceil(lines[g.index-1].bbox.y1)+2;y<lines[g.index].bbox.y0-2;y++){
 let run=0,longest=0;
 for(let x=Math.floor(im.width*.12);x<im.width*.88;x++){
 const ink=im.data[(y*im.width+x)*4]<245;run=ink?run+1:0;longest=Math.max(longest,run);
 }
 if(longest>im.width*.55){let thick=0;for(const yy of [y-8,y+8]){let count=0;if(yy>=0&&yy<im.height)for(let x=Math.floor(im.width*.12);x<im.width*.88;x++)if(im.data[(yy*im.width+x)*4]<245)count++;if(count>im.width*.4)thick++;}if(!thick)return {index:g.index,reason:"separator"};}
 }
 }
 const big=[...gaps].sort((a,b)=>b.gap-a.gap)[0];
 const normal=median(gaps.map(g=>g.gap).sort((a,b)=>a-b).slice(0,-1).concat([0]));
 if(big&&big.gap>h*1.25&&big.gap>normal*2)return {index:big.index,reason:"whitespace"};
 return {index:detailBoundary(lines),reason:"size-or-symbol"};
}
async function readDetails(worker,im,data){
 const lines=ocrLines(data),boundary=visualBoundary(lines,im),start=boundary.index;
 if(start<0)return {location:"",titleLines:lines.map(l=>l.text.replace(/\s/g,"")),reviewReason:"字段分界不明确，请对照原文核对课程、教师和地点。"};
 const upper=lines.slice(0,start);let teacher="";
 if(boundary.reason==="separator"&&upper.length>1){const ti=upper.length-1;const previous=upper.slice(0,ti).map(l=>l.bbox.y1-l.bbox.y0).sort((a,b)=>a-b),last=upper[ti];if(ti>0&&(last.bbox.y1-last.bbox.y0)<previous[Math.floor(previous.length/2)]*.82){teacher=upper.slice(ti).map(l=>l.text.replace(/\s/g,"")).join("");upper.splice(ti);}}
 const titleLines=upper.map(l=>l.text.replace(/\s/g,""));
 if(boundary.reason==="size-or-symbol"&&lines.at(-1).bbox.y1>=im.height-80)return {location:"",titleLines,teacher,reviewReason:"地点贴近课块边缘，可能截断，请核对。"}; // Text reaches the course-card edge: do not invent clipped room digits.
 const values=[];
 for(let i=start;i<lines.length;i++){
 const b=lines[i].bbox;let x=b.x0;
 if(i>start){values.push(lines[i].text.replace(/\s/g,""));continue;}
 if(i===start&&/^\s*[@＠©◎📍]/u.test(lines[i].text.replace(/\s/g,"")))x+=Math.round((b.y1-b.y0)*.85);
 const part=cropPixels(im,x,Math.max(0,b.y0-5),b.x1-x+5,b.y1-b.y0+10,2);
 await worker.setParameters({tessedit_pageseg_mode:"7"});
 const r=await worker.recognize(canvas(part),{}, {text:true});
 values.push(r.data.text.replace(/\s/g,"").replace(/^[@©◎]/,""));
 }
 return {location:values.join(""),titleLines,teacher,boundary:boundary.reason};
}
async function readClockRows(worker,source,boxes){
 const cols=columns(boxes,source.width);if(cols.length<5)return [];
 const width=Math.floor(cols[0].x-cols[0].width*.5);
 if(width<source.width*.04)return [];
 const y=Math.min(...boxes.map(b=>b.y)),height=source.height-y;
 const strip=cropPixels(source,0,y,width,height,2);
 await worker.setParameters({tessedit_pageseg_mode:"11",tessedit_char_whitelist:"0123456789:第节"});
 const result=await worker.recognize(canvas(strip),{}, {text:true,blocks:true});
 await worker.setParameters({tessedit_char_whitelist:""});
 const labels=ocrLines(result.data).flatMap(l=>{const m=l.text.replace(/\s/g,"").match(/^(?:第)?(\d{1,2})(?:节)?$/);return m&&Number(m[1])>0&&Number(m[1])<=30?[{section:Number(m[1]),y:y+(l.bbox.y0+l.bbox.y1)/4}]:[];});
 const clocks=ocrLines(result.data).flatMap(l=>{
 const m=l.text.replace(/\s/g,"").match(/^([012]?\d):([0-5]\d)$/);
 return m&&Number(m[1])<24?[{time:m[1].padStart(2,"0")+":"+m[2],y:y+l.bbox.y0/2}]:[];
 });
 clocks.sections=labels;clocks.rawText=result.data.text;return clocks;
}

async function recognize(worker,image,onProgress,cancelled){
 const source=image.getContext("2d").getImageData(0,0,image.width,image.height),boxes=detect(source);
 if(boxes.length<2)return null;
 const minY=Math.min(...boxes.map(b=>b.y)),headerTop=0,headerHeight=Math.max(1,minY-headerTop);
 const rawHeaders=[];
 await worker.setParameters({tessedit_pageseg_mode:"11"});
 for(const col of columns(boxes,image.width)){
 if(cancelled())throw Error("已取消识别");
 const left=Math.max(0,Math.round(col.x-col.width*.43)),cw=Math.min(image.width-left,Math.round(col.width*.86));
 const h=document.createElement("canvas");h.width=cw*2;h.height=headerHeight*2;
 h.getContext("2d").drawImage(image,left,headerTop,cw,headerHeight,0,0,h.width,h.height);
 const {data}=await worker.recognize(h);
 const m=data.text.replace(/\s/g,"").match(/(?:周|星期)([一二三四五六日天])/)||data.text.match(/(?:^|\n)\s*([一二三四五六日天])\s*(?:\n|$|\d)/);
 if(m)rawHeaders.push({x:col.x,day:"一二三四五六日".indexOf(m[1]==="天"?"日":m[1])+1});
 }
 const headers=rawHeaders.length>=3?completeHeaders(rawHeaders,image.width):[];
 const blocks=[];
 const clocks=await readClockRows(worker,source,boxes);
 await worker.setParameters({tessedit_pageseg_mode:"6",preserve_interword_spaces:"0"});
 for(let i=0;i<boxes.length;i++){
 if(cancelled())throw Error("已取消识别");
 onProgress({status:"识别中文课块 "+(i+1)+"/"+boxes.length,progress:i/boxes.length});
 await worker.setParameters({tessedit_pageseg_mode:"6"});
 let enhanced=enhance(source,boxes[i]);
 let {data}=await worker.recognize(canvas(enhanced),{}, {text:true,blocks:true});
 const originalData=data,originalImage=enhanced;
 const bg=backgroundColor(source,boxes[i]);let enhancement="standard";
 if(Math.max(...bg)-Math.min(...bg)>70&&Math.min(...bg)<175){
 if(cancelled())throw Error("已取消识别");
 onProgress({status:"对比高饱和度文字 "+(i+1)+"/"+boxes.length,progress:i/boxes.length});
 const alternate=enhance(source,boxes[i],3,"channel"),other=await worker.recognize(canvas(alternate),{}, {text:true,blocks:true});
 const count=t=>(t.match(/[一-鿿]/g)||[]).length;
 if(other.data.confidence>data.confidence+5&&count(other.data.text)>=count(data.text)*.8){data=other.data;enhanced=alternate;enhancement="channel";}
 }
 let details=await readDetails(worker,enhanced,data);
 if(enhancement==="channel"){const originalDetails=await readDetails(worker,originalImage,originalData);if(originalDetails?.teacher&&!details?.teacher)details={...details,teacher:originalDetails.teacher,location:originalDetails.location};}
 const clock=clocks.filter(c=>c.y>=boxes[i].y&&c.y<boxes[i].y+Math.min(boxes[i].height,source.width*.13)).sort((a,b)=>a.y-b.y)[0];
 const sections=root.SchoolSchedule?.mapSections(boxes[i],clocks.sections||[]);
 const scheduled=sections&&root.SchoolSchedule.resolve(sections.startSection,sections.endSection);
 blocks.push({...sections,end:scheduled?.end||"",box:boxes[i],text:data.text,enhancement,confidence:data.confidence,location:details?.location,titleLines:details?.titleLines,teacher:details?.teacher,reviewReason:[details?.reviewReason,scheduled&&clock&&scheduled.start!==clock.time?"作息表开始时间"+scheduled.start+"与截图"+clock.time+"不一致，请核对作息与节次。":""].filter(Boolean).join("\n"),start:scheduled?.start||clock?.time||""});
 }
 const result=assemble(blocks,headers);
 result.evidence=blocks.map(b=>({...b,needsReview:true}));return result;
}
root.CourseVision={detect,enhance,assemble,recognize,resize,completeHeaders,columns,detailBoundary,splitLocationSuffix,separateDraftLocation,visualBoundary,readClockRows};
if(typeof module!=="undefined")module.exports=root.CourseVision;
})(globalThis);













