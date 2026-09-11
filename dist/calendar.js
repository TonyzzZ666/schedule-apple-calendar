(function(root){
"use strict";
function weeks(text,parity="all"){
 if(!["all","odd","even"].includes(parity))throw Error("周次筛选无效");
 const out=new Set();
 for(const part of String(text).replace(/，/g,",").replace(/[–—]/g,"-").split(",")){
 const m=part.trim().match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?$/);
 if(!m)throw Error("周数格式应为 1-8,10,12-16");
 const a=+m[1],b=+(m[2]||m[1]);
 if(a<1||b>30||a>b)throw Error("周数须在 1–30 之间，起点不能大于终点");
 for(let w=a;w<=b;w++)if(parity==="all"||(parity==="odd"?w%2===1:w%2===0))out.add(w);
 }if(!out.size)throw Error("筛选后没有上课周数");return [...out].sort((a,b)=>a-b);
}
function monday(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("请选择第一周周一");
 const d=new Date(value+"T00:00:00Z");
 if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==value||d.getUTCFullYear()<2000||d.getUTCFullYear()>2100)throw Error("请选择 2000–2100 年的有效日期");
 if(d.getUTCDay()!==1)throw Error("学期起始日必须是第一教学周的周一");return +d;
}
function minutes(t){if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t))throw Error("请输入有效时间");return +t.slice(0,2)*60 + +t.slice(3);}
function expand(semester,courses){
 const base=monday(semester),events=[];
 for(const c of courses){
 if(!c.name.trim())throw Error("请填写课程名称");
 if(!Number.isInteger(+c.day)||+c.day<1||+c.day>7)throw Error("请选择星期");
 const start=minutes(c.start),end=minutes(c.end);
 if(end<=start)throw Error("结束时间须晚于开始时间，暂不支持跨午夜");
 if(!["none","10","15","30"].includes(c.reminder))throw Error("提醒时间无效");
 for(const week of weeks(c.weeks,c.parity)){
 const day=base+((week-1)*7+(+c.day-1))*86400000;
 events.push({...c,week,date:new Date(day).toISOString().slice(0,10),begin:day+(start-480)*60000,finish:day+(end-480)*60000});
 }}return events.sort((a,b)=>a.begin-b.begin||a.finish-b.finish);
}
const escapeText=s=>String(s).replace(/\\/g,"\\\\").replace(/\r\n|\r|\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
function fold(s){let out="",line="",n=0;for(const ch of s){const b=new TextEncoder().encode(ch).length;if(n+b>75){out+=line+"\r\n";line=" ";n=1;}line+=ch;n+=b;}return out+line;}
const stamp=t=>new Date(t).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
function ics(events,now=Date.now()){
 if(!events.length)throw Error("请先添加课程");
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//BecauseTools//CourseCalendar 0.1//ZH","CALSCALE:GREGORIAN"];
 for(const e of events){
 lines.push("BEGIN:VEVENT","UID:"+e.id+"-"+e.date+"@course-calendar.local","DTSTAMP:"+stamp(now),"DTSTART:"+stamp(e.begin),"DTEND:"+stamp(e.finish),"SUMMARY:"+escapeText(e.name),"LOCATION:"+escapeText(e.location),"DESCRIPTION:"+escapeText((e.teacher?"教师："+e.teacher+"\n":"")+"第 "+e.week+" 教学周；中国标准时间"));
 if(e.reminder!=="none")lines.push("BEGIN:VALARM","TRIGGER:-PT"+e.reminder+"M","ACTION:DISPLAY","DESCRIPTION:"+escapeText(e.name),"END:VALARM");
 lines.push("END:VEVENT");
 }lines.push("END:VCALENDAR");return lines.map(fold).join("\r\n")+"\r\n";
}
root.CourseCalendar={weeks,monday,expand,ics,fold,escapeText};
if(typeof module!=="undefined")module.exports=root.CourseCalendar;
})(globalThis);
