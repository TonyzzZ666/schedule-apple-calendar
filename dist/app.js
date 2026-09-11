"use strict";
const $=id=>document.getElementById(id),M=CourseModel,C=CourseCalendar,I=CourseImport;
const DAYS=["一","二","三","四","五","六","日"];
let courses=[],selected=null,candidates=[],imageFile=null,imageUrl=null,recognizing=false;
const current=()=>courses.find(c=>c.id===selected);
function node(tag,text="",cls=""){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn,cls=""){const b=node("button",text,cls);b.type="button";b.onclick=fn;return b;}
function say(text,id="message"){$(id).textContent=text;}
function markChanged(c){c.needsReview=true;renderRegistry();renderSummary();say("修改尚未确认。检查后点击下方保存。","editorMessage");}
function renderRegistry(){
 $("courses").replaceChildren();$("registeredCount").textContent=courses.length+" 门";
 if(!courses.length){$("courses").append(node("p","还没有课程，可以手动登记或识图预填。","empty small"));return;}
 for(const c of courses){
 const b=button("",()=>selectCourse(c.id),"course-choice"+(selected===c.id?" selected":""));
 b.setAttribute("aria-pressed",String(selected===c.id));
 b.append(node("strong",c.name||"未命名课程"),node("span",(c.teacher?c.teacher+" · ":"")+c.sessions.length+" 个上课时段","hint"),node("span",c.needsReview?"待核对":"已确认",c.needsReview?"status pending":"status ready"));
 $("courses").append(b);
 }
}
function renderSummary(){
 const pending=courses.filter(c=>c.needsReview);
 $("pending").textContent=pending.length?pending.length+" 门课程待核对，全部确认后即可导出。":courses.length?"全部课程已确认。":"登记课程后在这里预览。";
 $("events").replaceChildren();$("download").disabled=true;
 try{
 const events=M.confirmedEvents(courses,$("semester").value);
 $("count").textContent=events.length+" 次已确认课程";
 for(const e of events)$("events").append(node("div",e.date+" · 周"+DAYS[e.day-1]+" · 第 "+e.week+" 周 · "+e.start+"–"+e.end+"　"+e.name+(e.location?" / "+e.location:""),"event"));
 let overlaps=0;for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length&&events[j].begin<events[i].finish;j++)overlaps++;
 $("conflicts").textContent=overlaps?"发现 "+overlaps+" 组已确认时段重叠，请检查具体日期。":"";
 $("download").disabled=!events.length||!!pending.length;
 }catch(e){$("count").textContent="请检查设置";$("conflicts").textContent=e.message;}
}
function inputField(text,value,type,onInput){
 const label=node("label",text),input=document.createElement("input");
 input.type=type;input.value=value;input.setAttribute("aria-label",text);
 if(type==="text")input.maxLength=100;
 input.oninput=()=>onInput(input.value);label.append(input);return label;
}
function parityField(text,value,onChange){
 const label=node("label",text),select=document.createElement("select");select.setAttribute("aria-label",text);
 for(const [v,t] of [["all","每周"],["odd","单周"],["even","双周"]]){const o=node("option",t);o.value=v;select.append(o);}select.value=value;select.onchange=()=>onChange(select.value);label.append(select);return label;
}
function addSession(day){
 const c=current();if(!c)return;
 try{C.weeks($("defaultWeeks").value,$("defaultParity").value);}catch(e){say(e.message,"editorMessage");return false;}
 c.sessions.push(M.session({day,weeks:$("defaultWeeks").value,parity:$("defaultParity").value}));
 markChanged(c);renderSchedule();return true;
}
function renderSchedule(){
 const c=current();if(!c)return;
 $("weekdays").replaceChildren();$("sessions").replaceChildren();
 DAYS.forEach((label,i)=>{
 const day=i+1,wrap=node("label","","day-choice"),check=document.createElement("input");
 check.type="checkbox";check.checked=c.sessions.some(s=>s.day===day);check.setAttribute("aria-label","周"+label+"有课");
 check.onchange=()=>{
 if(check.checked){if(!addSession(day))check.checked=false;}
 else{c.sessions=c.sessions.filter(s=>s.day!==day);markChanged(c);renderSchedule();}
 };wrap.append(check,node("span","周"+label));$("weekdays").append(wrap);
 });
 for(let day=1;day<=7;day++){
 const sessions=c.sessions.filter(s=>s.day===day);if(!sessions.length)continue;
 const group=node("div","","day-group"),title=node("div","","title");title.append(node("h3","周"+DAYS[day-1]),button("＋ 再加一个时段",()=>addSession(day),"subtle"));group.append(title);
 sessions.forEach((s,index)=>{
 const item=node("div","","session"),prefix="周"+DAYS[day-1]+"时段"+(index+1);
 const update=key=>value=>{s[key]=value;markChanged(c);};
 const top=node("div","","title");top.append(node("b","时段 "+(index+1)),button("移除此时段",()=>{c.sessions=c.sessions.filter(x=>x.id!==s.id);markChanged(c);renderSchedule();},"subtle danger"));item.append(top);
 const grid=node("div","","fields");
 grid.append(inputField(prefix+"开始时间",s.start,"time",update("start")),inputField(prefix+"结束时间",s.end,"time",update("end")),inputField(prefix+"周数",s.weeks,"text",update("weeks")),parityField(prefix+"单双周",s.parity,update("parity")));
 const loc=inputField(prefix+"教室（留空用默认）",s.location,"text",update("location"));loc.className="wide";grid.append(loc);item.append(grid);
 if(s.sourceText)item.append(node("p","由识图预填，时间与周数请对照原图。","hint"));
 group.append(item);
 });$("sessions").append(group);
 }
 if(!c.sessions.length)$("sessions").append(node("p","勾选上课日后，为每天填写时间。","empty small"));
}
function selectCourse(id){
 selected=id;const c=current();$("editorEmpty").hidden=!!c;$("editorContent").hidden=!c;
 renderRegistry();if(!c)return;
 $("editorTitle").textContent=c.name+" · 上课安排";
 for(const [field,key] of [["editName","name"],["editTeacher","teacher"],["editLocation","location"],["editReminder","reminder"]])$(field).value=c[key];
 $("sourceText").textContent=c.sourceText;$("sourcePanel").hidden=!c.sourceText;
 $("defaultWeeks").value=c.sessions[0]?.weeks||"1-16";$("defaultParity").value=c.sessions[0]?.parity||"all";
 say(c.needsReview?"这门课待核对，请补全时间并确认。":"这门课已确认。修改后需要重新确认。","editorMessage");
 renderSchedule();
}
for(const [field,key] of [["editName","name"],["editTeacher","teacher"],["editLocation","location"],["editReminder","reminder"]]){
 $(field).addEventListener(key==="reminder"?"change":"input",()=>{const c=current();if(c){c[key]=$(field).value.trim();$("editorTitle").textContent=(c.name||"未命名课程")+" · 上课安排";markChanged(c);}});
}
$("registerForm").onsubmit=e=>{
 e.preventDefault();const name=$("registerName").value.trim();if(!name)return;
 const c=M.course({name,teacher:$("registerTeacher").value.trim(),location:$("registerLocation").value.trim()});
 courses.push(c);$("registerForm").reset();selectCourse(c.id);renderSummary();say("已登记，请在右侧选择上课日。");
};
$("confirmCourse").onclick=()=>{
 const c=current();if(!c)return;
 try{M.validate(c,$("semester").value);c.needsReview=false;renderRegistry();renderSummary();say("已保存并确认这门课。","editorMessage");}catch(e){say(e.message,"editorMessage");}
};
$("deleteCourse").onclick=()=>{
 const c=current();if(!c||!confirm("删除“"+c.name+"”及其全部上课时段？"))return;
 courses=courses.filter(x=>x.id!==c.id);selectCourse(courses[0]?.id||null);renderSummary();
};
$("semester").onchange=()=>{
 courses.forEach(c=>c.needsReview=true);renderRegistry();renderSummary();
 say("学期日期已改变，请重新确认课程日期。");
};
$("download").onclick=()=>{
 try{
 const events=M.exportEvents(courses,$("semester").value),url=URL.createObjectURL(new Blob([C.ics(events)],{type:"text/calendar;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="本学期课表.ics";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 say("已生成 "+events.length+" 次课程，请在 Apple Calendar 中导入。");
 }catch(e){say(e.message);}
};
function renderCandidates(){
 $("candidates").replaceChildren();$("importCandidates").hidden=!candidates.length;
 candidates.forEach((c,i)=>{
 const card=node("div","","candidate"),label=node("label","","candidate-select"),check=document.createElement("input");
 check.type="checkbox";check.checked=c.include!==false;check.onchange=()=>c.include=check.checked;
 label.append(check,node("span","候选 "+(i+1)));card.append(label);
 card.append(inputField("候选"+(i+1)+"课程名称",c.name,"text",v=>c.name=v),node("p",[c.teacher,c.location,c.sessions.length?c.sessions.length+" 个待核对时段":"时间待补充"].filter(Boolean).join(" · "),"hint"));
 $("candidates").append(card);
 });
}
$("parseText").onclick=()=>{
 candidates=I.parseText($("rawText").value);renderCandidates();
 say(candidates.length?"整理出 "+candidates.length+" 条候选，请勾选需要登记的课程。":"未找到课程。请用空行分隔课程，并以“课程：名称”开头。","ocrStatus");
};
$("importCandidates").onclick=()=>{
 const chosen=candidates.filter(c=>c.include!==false&&c.name.trim());
 if(!chosen.length){say("请勾选至少一门有名称的课程。","ocrStatus");return;}
 courses=M.mergeDrafts(courses,chosen);
 const target=courses.find(c=>c.needsReview);
 candidates=[];renderCandidates();selectCourse(target?.id||courses[0]?.id);renderSummary();
 say("已登记。完全同名且教师相同的课程已合并；请在已登记课程中逐门核对。","ocrStatus");
};
$("imageFile").onchange=()=>{
 imageFile=null;$("recognize").disabled=true;$("imagePreview").hidden=true;
 if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=null;}
 const file=$("imageFile").files[0];if(!file)return;
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>16*1024*1024){say("请选择不超过 16 MB 的 PNG、JPG 或 WebP 图片。","ocrStatus");return;}
 imageFile=file;imageUrl=URL.createObjectURL(file);$("imagePreview").src=imageUrl;$("imagePreview").hidden=false;$("recognize").disabled=false;
 say("图片已选择，点击识别后会生成候选课程。","ocrStatus");
};
$("recognize").onclick=async()=>{
 if(!imageFile||recognizing)return;
 if(location.protocol==="file:"){say("请先双击项目根目录的「启动课表工具.cmd」，在打开的本机网页中选择图片。直接打开 index.html 无法运行识图。","ocrStatus");return;}
 recognizing=true;$("recognize").disabled=true;$("imageFile").disabled=true;$("cancelOcr").hidden=false;$("ocrProgress").hidden=false;$("ocrProgress").value=0;
 say("正在从本机加载识别资源并准备图片。","ocrStatus");
 try{
 const image=await CourseOcr.prepareImage(imageFile);
 if(!recognizing)return;
 const data=await CourseOcr.recognize(image,m=>{
 const labels={"loading tesseract core":"正在加载识别引擎","initializing tesseract":"正在初始化","loading language traineddata":"正在加载中英文识别资源","initializing api":"正在准备识别","recognizing text":"正在识别文字"};
 say((labels[m.status]||"正在准备识别")+" "+Math.round((m.progress||0)*100)+"%","ocrStatus");$("ocrProgress").value=m.progress||0;
 });
 const result=I.parseOcr(data);$("rawText").value=result.text;candidates=result.drafts;renderCandidates();
 say(candidates.length?"识别出 "+candidates.length+" 条候选。"+(result.gridDetected?"已尝试按星期列整理。":"未定位到星期表头，部分时间需要补填。")+"请先登记，再逐门核对。":"未整理出课程，请展开识别文字修正，或换一张只包含课表的清晰截图。","ocrStatus");
 if(!candidates.length)$("rawPanel").open=true;
 }catch(e){say(e.message||"识别失败，请重试或粘贴识别文字。","ocrStatus");}
 finally{recognizing=false;$("recognize").disabled=!imageFile;$("imageFile").disabled=false;$("cancelOcr").hidden=true;$("ocrProgress").hidden=true;}
};
$("cancelOcr").onclick=()=>{recognizing=false;CourseOcr.cancel();say("已取消识别。","ocrStatus");};
window.addEventListener("beforeunload",e=>{if(courses.length||candidates.length||$("registerName").value){e.preventDefault();e.returnValue="";}});
renderRegistry();renderSummary();

if(location.protocol==="file:"){$("launchNotice").hidden=false;$("launchNotice").textContent="当前是文件打开模式。识图请使用项目根目录的「启动课表工具.cmd」；手动登记仍可使用。";}
