(function(root){
"use strict";
const el=id=>document.getElementById(id);
function platform(nav){
 const ua=nav.userAgent||"",ios=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&nav.maxTouchPoints>1);
 return /MicroMessenger|XiaoHongShu|Bytedance|FBAN|Instagram/i.test(ua)?"embedded":ios?"ios":/Macintosh|Mac OS X/i.test(ua)?"mac":"other";
}
function filename(semester){const month=Number(semester.slice(5,7));return semester.slice(0,4)+(month>=2&&month<=7?"春季":"秋季")+"课表.ics";}
function file(events,semester){
 return {blob:new Blob([CourseCalendar.ics(events)],{type:"text/calendar;charset=utf-8"}),name:filename(semester)};
}
function openFile(data,download){
 const url=URL.createObjectURL(data.blob),a=document.createElement("a");a.href=url;
 if(download)a.download=data.name;else{a.target="_blank";a.rel="noopener";}
 document.body.append(a);a.click();a.remove();
 // Allow mobile previews time to consume the blob, without navigating away from the editor.
 setTimeout(()=>URL.revokeObjectURL(url),300000);
}
function panel(events,kind,saved){
 el("importPanel").hidden=false;
 el("importSummary").textContent=events.length+" 次课程 · "+events[0].date+" 至 "+events.at(-1).date;
 el("importStorage").textContent=saved?"草稿已保存，返回后可继续编辑。":"草稿尚未保存，请使用上方“备份草稿”保留输入。";
 const steps={
  mac:"已发起日历文件下载。点击浏览器下载列表中的文件，或双击文件，即可交给日历 App；选择已有日历并确认添加。无需先新建日历。",
  ios:"已尝试打开日历文件。若出现系统添加界面，请核对并确认；若只显示预览或没有响应，请返回此页选择“仅下载 ICS”。此路径仍需 iPhone/iPad 实机验证。",
  embedded:"请用浏览器菜单在 Safari 中打开此页面，再添加到日历。更换浏览器前请备份草稿，并在 Safari 恢复。",
  other:"已发起日历文件下载。请用设备上的日历应用打开该文件并确认添加。"
 };
 el("importSteps").textContent=steps[kind];
 el("importPanel").scrollIntoView?.({behavior:"smooth",block:"nearest"});
}
function start(events,semester,downloadOnly=false){
 if(!events.length)throw Error("当前没有可添加的课程，请检查停课日期与课程安排。");
 const saved=root.DraftStore?.flush()||false,kind=platform(navigator),data=file(events,semester);
 panel(events,kind,saved);
 if(downloadOnly){openFile(data,true);el("importSteps").textContent="已发起 ICS 下载，请打开文件并在日历应用中确认添加。";}
 else if(kind!=="embedded")openFile(data,kind!=="ios");
 el("message").textContent="请在系统日历中完成添加；网页无法检测添加结果。";
}
root.CalendarDelivery={start,platform,filename};
el("downloadOnly").onclick=()=>{try{start(CourseWorkspace.events(),document.getElementById("semester").value,true);}catch(e){el("message").textContent=e.message;}};
})(globalThis);
