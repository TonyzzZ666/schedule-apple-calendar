(function(root){
"use strict";
const C=typeof module!=="undefined"?require("./calendar.js"):root.CourseCalendar;
let seq=0;
const id=()=> "c"+Date.now().toString(36)+"-"+(++seq)+"-"+Math.random().toString(36).slice(2);
function course(info={}){
 return {id:id(),name:info.name||"",teacher:info.teacher||"",location:info.location||"",reminder:info.reminder||"none",sessions:[],needsReview:true,sourceText:info.sourceText||""};
}
function session(info={}){
 return {id:id(),day:Number(info.day)||1,start:info.start||"",end:info.end||"",weeks:info.weeks||"1-16",parity:info.parity||"all",location:info.location||"",sourceText:info.sourceText||""};
}
function rows(c){
 return c.sessions.map(s=>({...s,id:c.id+"-"+s.id,name:c.name,teacher:c.teacher,location:s.location||c.location,reminder:c.reminder}));
}
function validate(c,semester){
 if(!c.name.trim())throw Error("请填写课程名称");
 if(!c.sessions.length)throw Error("请至少选择一个上课日并填写时间");
 return C.expand(semester,rows(c));
}
function confirmedEvents(courses,semester){
 C.monday(semester);
 return courses.filter(c=>!c.needsReview).flatMap(c=>validate(c,semester)).sort((a,b)=>a.begin-b.begin||a.finish-b.finish);
}
function exportEvents(courses,semester){
 if(!courses.length)throw Error("请先登记课程");
 if(courses.some(c=>c.needsReview))throw Error("还有课程待核对，请逐门保存并确认");
 return confirmedEvents(courses,semester);
}
const key=t=>String(t).normalize("NFKC").replace(/\s/g,"").toLowerCase();
function mergeDrafts(existing,drafts){
 const result=existing.map(c=>({...c,sessions:c.sessions.map(s=>({...s}))}));
 for(const d of drafts){
 if(!d.name.trim())continue;
 let c=result.find(x=>key(x.name)===key(d.name)&&key(x.teacher)===key(d.teacher));
 if(!c){c=course(d);result.push(c);}
 const signature=s=>JSON.stringify([s.day,s.start,s.end,s.weeks,s.parity,s.location]);
 const seen=new Set(c.sessions.map(signature));
 for(const raw of d.sessions||[]){
 const s=session(raw);if(!seen.has(signature(s))){c.sessions.push(s);seen.add(signature(s));}
 }
 if(!c.location)c.location=d.location||"";
 c.sourceText=[c.sourceText,d.sourceText].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join("\n\n").slice(0,16000);
 c.needsReview=true;
 }return result;
}
root.CourseModel={id,course,session,rows,validate,confirmedEvents,exportEvents,mergeDrafts};
if(typeof module!=="undefined")module.exports=root.CourseModel;
})(globalThis);
