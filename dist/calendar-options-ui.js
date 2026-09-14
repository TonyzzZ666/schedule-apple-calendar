(function(){
"use strict";
const A=CalendarAdjustments,el=id=>document.getElementById(id),off=new Set(),makeups=new Map(),loaded=new Set();
let mode="manual";
function element(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn,cls){const b=element("button",text,cls);b.type="button";b.onclick=fn;return b;}
function period(){
 const start=CourseCalendar.monday(el("semester").value);
 return {start,end:start+209*A.DAY};
}
function inPeriod(value){try{const p=period(),n=A.date(value);return n>=p.start&&n<=p.end;}catch{return false;}}
function refresh(){render();window.refreshCalendarSummary();}
function toggle(day){off.has(day)?off.delete(day):off.add(day);refresh();}
function loadNational(){
 mode="national";
 try{
  const {start,end}=period();
  for(let year=new Date(start).getUTCFullYear();year<=new Date(end).getUTCFullYear();year++){
   const data=A.holidays(year);
   if(data)for(const day of Object.keys(data.off))if(inPeriod(day)&&!loaded.has(day)){off.add(day);loaded.add(day);}
  }
 }catch{}
 refresh();
}
function render(){
 el("manualHolidays").setAttribute("aria-pressed",String(mode==="manual"));
 el("nationalHolidays").setAttribute("aria-pressed",String(mode==="national"));
 const data=A.holidays(2026);
 const relevant=[...off].filter(inPeriod).sort();
 el("holidayCount").textContent=relevant.length+" 天停课";
 const status=el("holidayStatus");status.replaceChildren();
 if(mode==="national"){
  const missing=[];
  try{const p=period();for(let y=new Date(p.start).getUTCFullYear();y<=new Date(p.end).getUTCFullYear();y++)if(!A.holidays(y))missing.push(y);}catch{}
  status.append(element("span","已载入可用的国家放假调休日期，可继续点击日历增减。当前内置 2026 年数据。"));
  const a=element("a","查看国务院通知");a.href=data.source;a.target="_blank";a.rel="noreferrer";status.append(a);
  if(missing.length)status.append(element("strong"," "+missing.join("、")+" 年尚未内置数据，请手动设置，不会自动当作无假期。"));
 }else status.textContent="点击日期选择放假日；切换到手动模式会保留已有选择。";
 const month=el("holidayMonth").value;
 if(!/^\d{4}-\d{2}$/.test(month))return;
 const first=A.date(month+"-01"),d=new Date(first),length=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
 const grid=el("holidayCalendar");grid.replaceChildren();
 for(const name of ["一","二","三","四","五","六","日"])grid.append(element("span",name,"calendar-weekday"));
 for(let i=0;i<((d.getUTCDay()+6)%7);i++)grid.append(element("span"));
 for(let i=1;i<=length;i++){
  const day=month+"-"+String(i).padStart(2,"0"),selected=off.has(day),work=mode==="national"&&data.workdays.includes(day),name=mode==="national"?data.off[day]:"";
  const b=button("",()=>toggle(day),"holiday-day"+(selected?" is-off":""));
  b.setAttribute("aria-pressed",String(selected));b.setAttribute("aria-label",day+(selected?" 停课，点击恢复":" 上课，点击停课"));
  b.append(element("span",String(i)),element("small",selected?"休":work?"班":name||""));
  b.title=day+(name?" "+name:"")+(work?" 国家调休上班日":"");
  grid.append(b);
 }
 el("holidaySelected").replaceChildren();
 for(const day of [...off].sort())el("holidaySelected").append(button(day+(inPeriod(day)?"":"（学期范围外）")+" ×",()=>toggle(day),"holiday-chip"));
 if(!off.size)el("holidaySelected").append(element("p","尚未选择停课日期。","hint"));
 const workList=el("nationalWorkdays");workList.replaceChildren();
 if(mode==="national"){
  for(const day of data.workdays.filter(inPeriod)){
   const row=element("div",null,"makeup-row");
   row.append(element("span",day+" · 国家调休上班日"));
   row.append(element("small",off.has(day)?"已设停课":makeups.has(day)?"补 "+makeups.get(day)+" 的课":"当前按当天原课表；补课请按学校通知设置"));
   row.append(button("设置补课",()=>{el("makeupTarget").value=day;el("makeupSource").focus();}),button(off.has(day)?"恢复上课":"设为停课",()=>toggle(day)));
   workList.append(row);
  }
 }
 const list=el("makeupList");list.replaceChildren();
 for(const [target,source] of [...makeups].sort()){
  const row=element("div",null,"makeup-row");
  row.append(element("span",target+" ← "+source+(off.has(target)?"（该日停课，补课暂不生效）":"")),button("编辑",()=>{el("makeupTarget").value=target;el("makeupSource").value=source;}),button("移除",()=>{makeups.delete(target);refresh();}));
  list.append(row);
 }
}
function moveMonth(delta){
 const date=new Date(A.date(el("holidayMonth").value+"-01"));date.setUTCMonth(date.getUTCMonth()+delta);
 if(date.getUTCFullYear()<2000||date.getUTCFullYear()>2100)return;
 el("holidayMonth").value=A.iso(+date).slice(0,7);render();
}
el("holidayMonth").value=el("semester").value.slice(0,7);
el("holidayMonth").onchange=render;
el("previousHolidayMonth").onclick=()=>moveMonth(-1);
el("nextHolidayMonth").onclick=()=>moveMonth(1);
el("manualHolidays").onclick=()=>{mode="manual";refresh();};
el("nationalHolidays").onclick=()=>{loadNational();el("makeupPanel").open=true;};
el("semester").addEventListener("change",()=>{
 if(el("semester").value)el("holidayMonth").value=el("semester").value.slice(0,7);
 // Preserve explicit edits; dates remain absolute when changing semester.
 if(mode==="national")loadNational();else{render();window.refreshCalendarSummary();}
});
el("makeupForm").onsubmit=event=>{
 event.preventDefault();
 try{
  const target=el("makeupTarget").value,source=el("makeupSource").value;
  A.apply([],[],[{target,source}]);
  if(!inPeriod(target)||!inPeriod(source))throw Error("补课及来源日期须在第一教学周起的 30 周范围内。");
  makeups.set(target,source);refresh();
  el("makeupMessage").textContent=off.has(target)?"安排已保存，但补课日已高亮停课；请取消该日停课后生效。":"已保存。请在整学期预览中核对来源日期的课程；来源当天没有课程时不会生成补课。";
 }catch(e){el("makeupMessage").textContent=e.message;}
};
el("extraForm").onsubmit=event=>{
 event.preventDefault();
 try{
  window.registerExtraCourse({name:el("extraName").value.trim(),teacher:el("extraTeacher").value.trim(),location:el("extraLocation").value.trim(),day:Number(el("extraDay").value),weeks:el("extraWeeks").value,parity:el("extraParity").value,start:el("extraStart").value,end:el("extraEnd").value});
  el("extraForm").reset();el("extraMessage").textContent="已登记到课程列表，请在课程编辑区核对并确认。";
 }catch(e){el("extraMessage").textContent=e.message;}
};
window.CalendarOptions={
 apply:events=>A.apply(events,[...off],[...makeups].filter(([target,source])=>inPeriod(target)&&inPeriod(source)).map(([target,source])=>({target,source}))),
 hasChanges:()=>off.size>0||makeups.size>0||!!el("extraName").value
};
render();window.refreshCalendarSummary();
})();
