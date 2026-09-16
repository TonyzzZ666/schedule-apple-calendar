(function(root){
"use strict";
const KEY="course-calendar.draft.v1",VERSION=1,fields=["registerName","registerTeacher","registerLocation","rawText","defaultWeeks","defaultParity","amCount","amStart","pmCount","pmStart","lessonMinutes","breakMinutes","extraName","extraTeacher","extraLocation","extraDay","extraWeeks","extraParity","extraStart","extraEnd","makeupTarget","makeupSource"];
const el=id=>document.getElementById(id);
let timer,restoring=false,blocked=false,lastStored=null;
function status(text){el("draftStatus").textContent=text;}
function snapshot(){
 return {schemaVersion:VERSION,workspace:CourseWorkspace.get(),calendar:CalendarOptions.get(),
  school:SchoolSchedule.getRows().map(({section,start,end})=>({section,start,end})),
  schedule:ScheduleEditor.get(),mode:root.AppFlow.mode,
  screen:["entryScreen","scheduleScreen","mainScreen"].find(id=>!el(id).hidden)||"entryScreen",
  fields:Object.fromEntries(fields.map(id=>[id,el(id).value]))};
}
function validate(data){
 const fail=()=>{throw Error("草稿格式不完整或版本不兼容，未覆盖当前输入。");};
 const array=(v,n=2000)=>Array.isArray(v)&&v.length<=n;
 const text=v=>typeof v==="string"&&v.length<=30000;
 if(!data||data.schemaVersion!==VERSION||!data.workspace||!data.calendar||!data.schedule||!data.fields)fail();
 if(![null,"manual","school"].includes(data.mode)||!["entryScreen","scheduleScreen","mainScreen"].includes(data.screen))fail();
 const w=data.workspace;
 if(!text(w.semester)||(!text(w.selected)&&w.selected!==null)||!array(w.courses,500)||!array(w.candidates,500))fail();
 for(const c of [...w.courses,...w.candidates]){
  if(!c||!["id","name","teacher","location","reminder","sourceText"].every(k=>text(c[k]))||typeof c.needsReview!=="boolean"||!array(c.sessions))fail();
  for(const s of c.sessions){
   if(!s||!["id","start","end","weeks","parity","location","sourceText"].every(k=>text(s[k]))||!Number.isInteger(s.day)||s.day<0||s.day>7)fail();
  }
 }
 if(new Set(w.courses.map(c=>c.id)).size!==w.courses.length)fail();
 const cal=data.calendar;
 if(!array(cal.off)||!array(cal.loaded)||!array(cal.makeups)||!["manual","national"].includes(cal.mode)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(cal.month))fail();
 for(const day of [...cal.off,...cal.loaded])CalendarAdjustments.date(day);
 for(const pair of cal.makeups){if(!array(pair,2)||pair.length!==2)fail();CalendarAdjustments.apply([],[],[{target:pair[0],source:pair[1]}]);}
 if(!array(data.school,48)||!array(data.schedule.rows,48)||typeof data.schedule.parametersValid!=="boolean")fail();
 if(data.school.length)SchoolSchedule.validate(data.school);
 if(data.mode==="school"&&data.screen==="mainScreen"&&!data.school.length)fail();
 for(const row of [...data.school,...data.schedule.rows])if(!row||!Number.isInteger(row.section)||!text(row.start)||!text(row.end))fail();
 for(const id of fields)if(!text(data.fields[id]))fail();
 return data;
}
function restore(data){
 validate(data);restoring=true;
 try{
  for(const id of fields)el(id).value=data.fields[id];
  if(data.school.length)SchoolSchedule.setRows(data.school);else SchoolSchedule.clear();
  ScheduleEditor.restore(data.schedule);
  if(data.mode)AppFlow.openMain(data.mode);else AppFlow.mode=null;
  for(const id of ["entryScreen","scheduleScreen","mainScreen"])el(id).hidden=id!==data.screen;
  el("semester").value=data.workspace.semester;
  CalendarOptions.restore(data.calendar);CourseWorkspace.restore(data.workspace);
  // Selecting a course supplies defaults; retain unfinished form fields afterwards.
  for(const id of fields)el(id).value=data.fields[id];
 }finally{restoring=false;}
}
function flush(){
 clearTimeout(timer);
 if(restoring||blocked)return false;
 try{
  const json=JSON.stringify(snapshot());
  const current=localStorage.getItem(KEY);
  if(current!==lastStored){blocked=true;status("其他页面更新了草稿，已暂停自动保存。请先备份本页，再刷新读取最新草稿。");return false;}
  if(json!==lastStored){localStorage.setItem(KEY,json);lastStored=json;}
  status("草稿已保存在此浏览器 · 图片原文件不保存");
  return true;
 }catch{status("此浏览器无法保存草稿，请先下载草稿备份再离开。");return false;}
}
function schedule(){if(restoring||blocked)return;clearTimeout(timer);timer=setTimeout(flush,300);}
function saveFile(content,name,type){
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
root.DraftStore={flush,schedule,snapshot,validate,restore};
try{
 lastStored=localStorage.getItem(KEY);
 if(lastStored){restore(JSON.parse(lastStored));status("已恢复上次草稿，可继续编辑或添加到日历。");}
 else status("编辑后自动保存草稿 · 仅保存在此浏览器");
}catch{blocked=true;status("无法读取草稿，已保留原存储且暂停覆盖。可以恢复备份，或清除旧草稿后重试。");}
for(const event of ["input","change","click","submit"])document.addEventListener(event,schedule);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush();});
window.addEventListener("pagehide",flush);
window.addEventListener("storage",e=>{if(e.key===KEY||e.key===null){blocked=true;status("其他页面更改了草稿，已暂停保存。请备份本页后刷新。");}});
el("backupDraft").onclick=()=>{saveFile(JSON.stringify(snapshot(),null,2),"课表草稿.json","application/json");status("已生成草稿备份，包含课程和设置，不包含图片。");};
el("restoreDraft").onchange=async()=>{
 const file=el("restoreDraft").files[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error("草稿备份不能超过 5 MB。");
  const data=validate(JSON.parse(await file.text()));
  if(!confirm("用该备份替换当前页面的课程和设置？建议先备份现有草稿。"))return;
  restore(data);lastStored=localStorage.getItem(KEY);blocked=false;flush();
 }catch(e){status(e.message||"备份读取失败，当前输入保持不变。");}
 finally{el("restoreDraft").value="";}
};
el("clearDraft").onclick=()=>{
 if(!confirm("清除已保存草稿并重新开始？课程、作息、停课与补课设置将清空。"))return;
 try{localStorage.removeItem(KEY);blocked=true;root.DraftStore.discarding=true;location.reload();}catch{root.DraftStore.discarding=false;status("清除失败，请检查浏览器存储权限。");}
};
})(globalThis);
