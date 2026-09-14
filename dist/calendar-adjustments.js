(function(root){
"use strict";
const DAY=86400000;
const source="https://www.beijing.gov.cn/cs/gncs/zcwj/202603/t20260327_4568275.html";
const national2026=[
 ["元旦","2026-01-01","2026-01-03"],["春节","2026-02-15","2026-02-23"],
 ["清明节","2026-04-04","2026-04-06"],["劳动节","2026-05-01","2026-05-05"],
 ["端午节","2026-06-19","2026-06-21"],["中秋节","2026-09-25","2026-09-27"],
 ["国庆节","2026-10-01","2026-10-07"]
];
const workdays=["2026-01-04","2026-02-14","2026-02-28","2026-05-09","2026-09-20","2026-10-10"];
function date(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("请选择有效日期");
 const n=Date.parse(value+"T00:00:00Z");
 if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw Error("请选择有效日期");
 return n;
}
const iso=n=>new Date(n).toISOString().slice(0,10);
function holidays(year){
 if(year!==2026)return null;
 const off={};
 for(const [name,start,end] of national2026)for(let n=date(start);n<=date(end);n+=DAY)off[iso(n)]=name;
 return {off,workdays:[...workdays],source};
}
function apply(events,offDates=[],makeups=[]){
 const off=new Set(offDates),targets=new Set();
 for(const day of off)date(day);
 for(const rule of makeups){
  date(rule.target);date(rule.source);
  if(rule.source===rule.target)throw Error("补课日期与来源日期不能相同");
  if(targets.has(rule.target))throw Error("同一天只能设置一份补课安排");
  targets.add(rule.target);
 }
 // Use original occurrences, before holidays are removed, preserving source teaching weeks.
 const result=events.filter(e=>!off.has(e.date)&&!(targets.has(e.date)&&!e.extra));
 for(const rule of makeups){
  if(off.has(rule.target))continue;
  const delta=date(rule.target)-date(rule.source);
  for(const event of events.filter(e=>e.date===rule.source&&!e.extra)){
   result.push({...event,id:event.id+"-makeup-"+rule.source,date:rule.target,
    day:new Date(date(rule.target)).getUTCDay()||7,begin:event.begin+delta,finish:event.finish+delta,
    makeupSource:rule.source});
  }
 }
 return result.sort((a,b)=>a.begin-b.begin||a.finish-b.finish);
}
root.CalendarAdjustments={date,iso,holidays,apply,DAY};
if(typeof module!=="undefined")module.exports=root.CalendarAdjustments;
})(globalThis);
