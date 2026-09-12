(function(){
let draft=[],parametersValid=false;
const el=id=>document.getElementById(id);
function validate(){
 try{if(!parametersValid)throw Error("请先填写完整有效的上方参数");SchoolSchedule.validate(draft);el("saveSchedule").disabled=false;el("scheduleStatus").textContent="共 "+draft.length+" 节，请核对后确认。";}
 catch(e){el("saveSchedule").disabled=true;el("scheduleStatus").textContent=e.message;}
}
function update(){
 try{
 const counts=["am","pm"].map(p=>{if(el(p+"Count").value==="")throw Error("请填写上午和下午节数");return {count:Number(el(p+"Count").value),start:el(p+"Start").value};});
 draft=SchoolSchedule.generate(counts,Number(el("lessonMinutes").value),Number(el("breakMinutes").value));parametersValid=true;
 const fragment=document.createDocumentFragment();
 for(const row of draft){
 const wrap=document.createElement("div");wrap.className="school-time-row";
 const title=document.createElement("strong");title.textContent="第 "+row.section+" 节";wrap.append(title);
 for(const key of ["start","end"]){
 const label=document.createElement("label");label.textContent=key==="start"?"上课时间":"下课时间";
 const input=document.createElement("input");input.type="time";input.value=row[key];input.required=true;input.setAttribute("aria-label","第"+row.section+"节"+(key==="start"?"开始":"结束"));
 input.addEventListener("input",()=>{row[key]=input.value;validate();});input.addEventListener("change",()=>{row[key]=input.value;validate();});
 label.append(input);wrap.append(label);
 }fragment.append(wrap);
 }
 el("scheduleRows").replaceChildren(fragment);validate();
 }catch(e){parametersValid=false;draft=[];el("scheduleRows").replaceChildren();el("saveSchedule").disabled=true;el("scheduleStatus").textContent=e.message;}
}
for(const id of ["amCount","pmCount","amStart","pmStart","lessonMinutes","breakMinutes"])el(id).addEventListener("input",update);
el("saveSchedule").onclick=()=>{try{if(!parametersValid)throw Error("请检查作息参数");SchoolSchedule.setRows(draft);globalThis.AppFlow?.openMain("school");}catch(e){el("scheduleStatus").textContent=e.message;}};
update();
})();
