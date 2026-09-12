(function(){
let draft=[];
const el=id=>document.getElementById(id);
el("buildSchedule").onclick=()=>{try{
 draft=SchoolSchedule.generate(["am","pm"].map(p=>({count:Number(el(p+"Count").value),start:el(p+"Start").value})),Number(el("lessonMinutes").value),Number(el("breakMinutes").value));
 el("scheduleRows").replaceChildren();
 for(const row of draft){const wrap=document.createElement("div");wrap.className="fields";wrap.append(document.createTextNode("第"+row.section+"节"));
 for(const key of ["start","end"]){const input=document.createElement("input");input.type="time";input.value=row[key];input.setAttribute("aria-label","第"+row.section+"节"+(key==="start"?"开始":"结束"));input.onchange=()=>{row[key]=input.value;el("scheduleStatus").textContent="修改尚未应用，请确认作息表。";};wrap.append(input);}el("scheduleRows").append(wrap);}
 el("saveSchedule").hidden=false;el("scheduleStatus").textContent="共"+draft.length+"节；这是示例作息，请按学校实际时间调整后确认。";
}catch(e){el("scheduleStatus").textContent=e.message;}};
el("saveSchedule").onclick=()=>{try{SchoolSchedule.setRows(draft);el("scheduleStatus").textContent="作息已启用。之后识图将按节次填时间；已有课程请使用各时段的“按节次填时间”。";}catch(e){el("scheduleStatus").textContent=e.message;}};
})();
