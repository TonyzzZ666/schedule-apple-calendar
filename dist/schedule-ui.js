(function(){
let draft=[],parametersValid=false,pickerTarget=null,pickerHour=8,pickerMinute=0;
const el=id=>document.getElementById(id);
const parseClock=value=>{if(!/^\d{2}:\d{2}$/.test(value))return null;const [h,m]=value.split(":").map(Number);return h<24&&m<60?h*60+m:null;};
const formatClock=value=>String(Math.floor(value/60)).padStart(2,"0")+":"+String(value%60).padStart(2,"0");
const duration=()=>Number(el("lessonMinutes").value);

function validate(){
 try{if(!parametersValid)throw Error("请先填写完整有效的上方参数");SchoolSchedule.validate(draft);el("saveSchedule").disabled=false;el("scheduleStatus").textContent="共 "+draft.length+" 节，请核对后确认。";}
 catch(e){el("saveSchedule").disabled=true;el("scheduleStatus").textContent=e.message;}
}

function applyTime(row,key,value){
 row[key]=value;
 const point=parseClock(value),span=duration();
 if(point!==null&&Number.isInteger(span)&&span>=10&&span<=180){
  const paired=key==="start"?point+span:point-span;
  if(paired>=0&&paired<1440)row[key==="start"?"end":"start"]=formatClock(paired);
  else row[key==="start"?"end":"start"]="";
 }
 if(row.inputs){row.inputs.start.value=row.start;row.inputs.end.value=row.end;}
 validate();
}

function createWheel(label,count){
 const wrap=document.createElement("div");wrap.className="time-wheel-wrap";
 const title=document.createElement("span");title.className="time-wheel-label";title.textContent=label;
 const wheel=document.createElement("div");wheel.className="time-wheel";wheel.tabIndex=0;wheel.setAttribute("role","listbox");wheel.setAttribute("aria-label",label);
 for(let i=0;i<count;i++){
  const option=document.createElement("button");option.type="button";option.className="time-option";option.textContent=String(i).padStart(2,"0");option.dataset.value=String(i);option.setAttribute("role","option");
  option.onclick=()=>wheel.scrollTo({top:i*48,behavior:"smooth"});wheel.append(option);
 }
 let timer;wheel.addEventListener("scroll",()=>{clearTimeout(timer);timer=setTimeout(()=>selectWheelValue(wheel),55);},{passive:true});
 wrap.append(title,wheel);return {wrap,wheel};
}

function selectWheelValue(wheel){
 const max=wheel.children.length-1,value=Math.max(0,Math.min(max,Math.round(wheel.scrollTop/48)));
 if(wheel===hourWheel)pickerHour=value;else pickerMinute=value;
 [...wheel.children].forEach((option,index)=>{const selected=index===value;option.classList.toggle("selected",selected);option.setAttribute("aria-selected",String(selected));});
 el("timePickerValue").textContent=String(pickerHour).padStart(2,"0")+":"+String(pickerMinute).padStart(2,"0");
}

const dialog=document.createElement("dialog");dialog.id="timePickerDialog";dialog.className="time-picker-dialog";dialog.innerHTML='<div class="time-picker-sheet"><div class="time-picker-head"><button type="button" data-action="cancel">取消</button><div><strong id="timePickerTitle">选择时间</strong><span id="timePickerValue">08:00</span></div><button type="button" class="primary" data-action="done">完成</button></div><div class="time-picker-wheels"><div class="time-picker-highlight" aria-hidden="true"></div></div><p class="time-picker-hint">上下滑动翻页选择，点击完成后自动推算另一时间</p></div>';
document.body.append(dialog);
const wheels=dialog.querySelector(".time-picker-wheels"),hour=createWheel("时",24),minute=createWheel("分",60),hourWheel=hour.wheel,minuteWheel=minute.wheel;
wheels.append(hour.wrap,minute.wrap);

function closePicker(commit){
 if(!dialog.open)return;
 if(commit&&pickerTarget)applyTime(pickerTarget.row,pickerTarget.key,String(pickerHour).padStart(2,"0")+":"+String(pickerMinute).padStart(2,"0"));
 const input=pickerTarget?.input;dialog.classList.add("closing");
 setTimeout(()=>{dialog.close();dialog.classList.remove("closing");pickerTarget=null;input?.focus();},180);
}
function openPicker(input,row,key){
 const value=parseClock(input.value)??(key==="start"?8*60:8*60+duration());pickerHour=Math.floor(value/60);pickerMinute=value%60;pickerTarget={input,row,key};
 el("timePickerTitle").textContent=key==="start"?"选择上课时间":"选择下课时间";el("timePickerValue").textContent=formatClock(value);
 dialog.showModal();requestAnimationFrame(()=>requestAnimationFrame(()=>{hourWheel.scrollTo({top:pickerHour*48,behavior:"instant"});minuteWheel.scrollTo({top:pickerMinute*48,behavior:"instant"});selectWheelValue(hourWheel);selectWheelValue(minuteWheel);}));
}
dialog.querySelector('[data-action="cancel"]').onclick=()=>closePicker(false);
dialog.querySelector('[data-action="done"]').onclick=()=>closePicker(true);
dialog.addEventListener("cancel",event=>{event.preventDefault();closePicker(false);});
dialog.addEventListener("click",event=>{if(event.target===dialog)closePicker(false);});

function update(savedRows){
 try{
  const counts=["am","pm"].map(p=>{if(el(p+"Count").value==="")throw Error("请填写上午和下午节数");return {count:Number(el(p+"Count").value),start:el(p+"Start").value};});
  draft=SchoolSchedule.generate(counts,duration(),Number(el("breakMinutes").value));parametersValid=true;
  if(Array.isArray(savedRows))draft=savedRows.map(row=>({section:row.section,start:row.start,end:row.end}));
  const fragment=document.createDocumentFragment();
  for(const row of draft){
   const wrap=document.createElement("div");wrap.className="school-time-row";
   const title=document.createElement("strong");title.textContent="第 "+row.section+" 节";wrap.append(title);row.inputs={};
   for(const key of ["start","end"]){
    const label=document.createElement("label");label.textContent=key==="start"?"上课时间":"下课时间";
    const input=document.createElement("input");input.type="time";input.value=row[key];input.required=true;input.readOnly=true;input.className="time-picker-trigger";input.setAttribute("aria-label","第"+row.section+"节"+(key==="start"?"开始":"结束"));input.setAttribute("aria-haspopup","dialog");
    input.addEventListener("click",event=>{event.preventDefault();openPicker(input,row,key);});
    input.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openPicker(input,row,key);}});
    input.addEventListener("input",()=>applyTime(row,key,input.value));input.addEventListener("change",()=>applyTime(row,key,input.value));
    row.inputs[key]=input;label.append(input);wrap.append(label);
   }fragment.append(wrap);
  }
  el("scheduleRows").replaceChildren(fragment);validate();
 }catch(e){parametersValid=false;draft=[];el("scheduleRows").replaceChildren();el("saveSchedule").disabled=true;el("scheduleStatus").textContent=e.message;}
}
for(const id of ["amCount","pmCount","amStart","pmStart","lessonMinutes","breakMinutes"])el(id).addEventListener("input",update);
el("saveSchedule").onclick=()=>{try{if(!parametersValid)throw Error("请检查作息参数");SchoolSchedule.setRows(draft);globalThis.AppFlow?.openMain("school");}catch(e){el("scheduleStatus").textContent=e.message;}};
window.ScheduleEditor={
 get:()=>({rows:draft.map(({section,start,end})=>({section,start,end})),parametersValid}),
 restore:state=>{update(state.rows);parametersValid=state.parametersValid;validate();}
};
update();
})();
