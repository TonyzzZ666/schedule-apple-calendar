(function(){
const el=id=>document.getElementById(id);
function screen(id){for(const name of ["entryScreen","scheduleScreen","mainScreen"])el(name).hidden=name!==id;}
function busy(){return !el("cancelOcr").hidden;}
function openMain(mode){AppFlow.mode=mode;screen("mainScreen");el("editSchool").hidden=mode!=="school";el("modeLabel").textContent=mode==="school"?"按学校作息自动填时间":"登记后手动输入时间";el("imagePanel").open=true;el("imagePanel").querySelector("p.hint").textContent=mode==="school"?"识别课程、地点、星期和节次，按已确认作息预填时间。请核对识别结果。":"只预填课程名和地点；登记后选择星期并手动填写时间。图片在浏览器内处理，不上传。";const hints=el("imagePanel").querySelectorAll("p.hint");if(hints[1])hints[1].textContent=mode==="school"?"自动定位课块，识别星期和节次；识别不可靠的字段会留空，供你核对。":"自动定位课块并整理课程名和地点，登记后再填写每周上课时间。";window.refreshInputMode?.();}
window.AppFlow={mode:null,openMain};
el("chooseSchool").onclick=()=>{screen("scheduleScreen");};
el("chooseManual").onclick=()=>openMain("manual");
el("backFromSchool").onclick=()=>screen("entryScreen");
el("backToEntry").onclick=()=>{if(!busy())screen("entryScreen");};
el("editSchool").onclick=()=>{if(!busy()){screen("scheduleScreen");}};
screen("entryScreen");
})();

