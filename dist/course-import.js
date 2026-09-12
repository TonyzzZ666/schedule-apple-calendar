(function(root){
"use strict";
const normalize=s=>String(s).normalize("NFKC").replace(/[–—~～至]/g,"-").replace(/，/g,",").replace(/([一-鿿])[ \t]+(?=[一-鿿])/g,"$1").trim();
const dayNumber=s=>({"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"日":7,"天":7,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7})[s];
const dayPattern=/(?:星期|周|礼拜)\s*([一二三四五六日天1-7])/g;
function parseBlock(raw,inferredDay=0){
 const text=normalize(raw);
 const lines=text.split(/\n/).map(x=>x.trim()).filter(Boolean);
 const nameLabel=text.match(/(?:课程名称|课程名|课程|科目)\s*[:：]\s*([^\n|;]+)/);
 let name=nameLabel?nameLabel[1].trim():"";
 if(!name){
 name=lines.find(l=>/[一-鿿A-Za-z]{2}/.test(l)&&
 !/^(?:姓名|学号|班级|专业|教师|老师|任课|地点|教室|时间|节次|周次|周数|星期|周[一二三四五六日天1-7]|第\d|上午|下午|晚上|学年|学期)/.test(l)&&
 !/(?:课表|课程表|教学周|学年|学期)$/.test(l)&&
 !/^(?:[\d,:\s-]+周|[\d,:\s-]+节|[一-鿿]{0,5}(?:楼|教室|教学楼|区)[A-Za-z-]?\d+)/.test(l))||"";
 name=name.split(/[|;]/)[0].replace(/\s+(?=(?:周|星期|教师|老师|教室|地点|时间|\d{1,2}:)).*$/,"");
 }
 name=name.replace(/(?:星期|周)[一二三四五六日天1-7].*$/,"").trim();
 if(!name||name.length>100||/^(?:课程名称|课程|科目|大学课表|个人课表|星期|周次)$/.test(name))return null;
 const teacher=(text.match(/(?:教师|老师|任课教师)\s*[:：]\s*([^\n|;]+)/)||[])[1]||"";
 const location=(text.match(/(?:教室|地点|上课地点)\s*[:：]\s*([^\n|;]+)/)||[])[1]||"";
 const wm=text.match(/(?:周次|周数)\s*[:：]\s*(\d{1,2}(?:\s*-\s*\d{1,2})?(?:\s*,\s*\d{1,2}(?:\s*-\s*\d{1,2})?)*)/)||
 text.match(/(\d{1,2}(?:\s*-\s*\d{1,2})?(?:\s*,\s*\d{1,2}(?:\s*-\s*\d{1,2})?)*)\s*周/);
 const weekText=wm?wm[1].replace(/\s/g,""):"";
 const globalRules=lines.filter(l=>![...l.matchAll(dayPattern)].length).join("\n"); const parity=/单周|周\s*[\(（]?\s*单/.test(globalRules)?"odd":/双周|周\s*[\(（]?\s*双/.test(globalRules)?"even":"all";
 const clockPairs=l=>[...l.matchAll(/(\d{1,2})\s*:\s*(\d{2})\s*-\s*(\d{1,2})\s*:\s*(\d{2})/g)].map(m=>({start:m[1].padStart(2,"0")+":"+m[2],end:m[3].padStart(2,"0")+":"+m[4]}));
 const days=l=>[...l.matchAll(dayPattern)].map(m=>dayNumber(m[1]));
 let sessions=[];
 const perDay=lines.filter(l=>days(l).length);
 if(perDay.some(l=>clockPairs(l).length)){
 for(const l of perDay){
 const markers=[...l.matchAll(dayPattern)];
 for(let i=0;i<markers.length;i++){
 const chunk=l.slice(markers[i].index,markers[i+1]?.index||l.length);
 const tw=chunk.match(/(\d{1,2}(?:\s*-\s*\d{1,2})?(?:\s*,\s*\d{1,2}(?:\s*-\s*\d{1,2})?)*)\s*周/);
 for(const times of clockPairs(chunk).length?clockPairs(chunk):[{start:"",end:""}])sessions.push({day:dayNumber(markers[i][1]),...times,weeks:tw?tw[1].replace(/\s/g,""):weekText||"1-16",parity:/单周/.test(chunk)?"odd":/双周/.test(chunk)?"even":parity});
 }}
 }else{
 const ds=[...new Set(days(text))];if(!ds.length&&inferredDay)ds.push(inferredDay);
 const times=clockPairs(text);
 for(const d of ds)for(const t of times.length?times:[{start:"",end:""}])sessions.push({day:d,...t});
 }
 sessions=sessions.map(s=>({weeks:weekText||"1-16",parity,...s,location,sourceText:raw}));
 return {name,teacher:teacher.trim(),location:location.trim(),sessions,sourceText:raw,needsReview:true};
}
function parseText(text,inferredDay=0){
 const parts=String(text).replace(/\r/g,"").split(/\n\s*\n|(?=\n(?:课程名称|课程名|课程|科目)\s*[:：])/);
 return parts.map(x=>parseBlock(x,inferredDay)).filter(Boolean);
}
function wordsFrom(data){
 return (data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[]))).filter(w=>w.text?.trim()&&w.bbox);
}
function lineGroups(words){
 const sorted=[...words].sort((a,b)=>a.bbox.y0-b.bbox.y0||a.bbox.x0-b.bbox.x0),rows=[];
 for(const w of sorted){
 const cy=(w.bbox.y0+w.bbox.y1)/2,h=w.bbox.y1-w.bbox.y0;
 let row=rows.find(r=>Math.abs(r.cy-cy)<Math.max(5,Math.min(r.h,h)*0.55));
 if(!row){row={cy,h,words:[],y0:w.bbox.y0,y1:w.bbox.y1};rows.push(row);}
 row.words.push(w);row.y0=Math.min(row.y0,w.bbox.y0);row.y1=Math.max(row.y1,w.bbox.y1);
 }
 return rows.sort((a,b)=>a.y0-b.y0).map(r=>({...r,words:r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0)}));
}
function parseOcr(data){
 const words=wordsFrom(data),rows=lineGroups(words),headerRows=[];
 for(const row of rows){
 const hits=[];
 for(let i=0;i<row.words.length;i++){
 for(let count=1;count<=3&&i+count<=row.words.length;count++){
 const ws=row.words.slice(i,i+count),txt=ws.map(w=>w.text).join("").replace(/\s/g,"");
 const m=txt.match(/^(?:星期|周|礼拜)([一二三四五六日天1-7])$/);
 if(m){hits.push({day:dayNumber(m[1]),x:(ws[0].bbox.x0+ws.at(-1).bbox.x1)/2,y1:row.y1});i+=count-1;break;}
 }}
 const unique=[...new Map(hits.map(h=>[h.day,h])).values()].sort((a,b)=>a.x-b.x);
 if(unique.length>=2)headerRows.push(unique);
 }
 const headers=headerRows.sort((a,b)=>b.length-a.length)[0];
 if(!headers)return {drafts:parseText(data.text||""),text:data.text||"",gridDetected:false};
 const parsed=[],sources=[];
 for(let i=0;i<headers.length;i++){
 const h=headers[i],spacing=i? h.x-headers[i-1].x:headers[1].x-h.x;
 const left=i?(headers[i-1].x+h.x)/2:h.x-spacing/2;
 const right=i+1<headers.length?(headers[i+1].x+h.x)/2:h.x+spacing/2;
 const rowsForDay=lineGroups(words.filter(w=>w.bbox.y0>h.y1&&((w.bbox.x0+w.bbox.x1)/2)>=left&&((w.bbox.x0+w.bbox.x1)/2)<right));
 let groups=[],group=[],last=null;
 for(const row of rowsForDay){
 if(last&&row.y0-last.y1>Math.max(14,(last.y1-last.y0)*1.1)){groups.push(group);group=[];}
 group.push(row.words.map(w=>w.text).join(" "));last=row;
 }if(group.length)groups.push(group);
 for(const lines of groups){
 const raw=lines.join("\n");sources.push("星期"+"一二三四五六日"[h.day-1]+"\n"+raw);
 parsed.push(...parseText(raw,h.day));
 }
 }
 return {drafts:parsed,text:sources.join("\n\n"),gridDetected:true,headers};
}
root.CourseImport={parseBlock,parseText,parseOcr};
if(typeof module!=="undefined")module.exports=root.CourseImport;
})(globalThis);




