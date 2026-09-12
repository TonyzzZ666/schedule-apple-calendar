(function(root){
"use strict";
let enginePromise=null,active=null;
function loadEngine(){
 if(root.Tesseract)return Promise.resolve(root.Tesseract);
 if(enginePromise)return enginePromise;
 enginePromise=new Promise((resolve,reject)=>{
 const script=document.createElement("script");
 const timer=setTimeout(()=>{script.remove();reject(Error("识别资源加载超时，请检查网络后重试"));},45000);
 script.src="vendor/tesseract.min.js";
 script.onload=()=>{clearTimeout(timer);root.Tesseract?resolve(root.Tesseract):reject(Error("识别组件加载失败"));};
 script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error("识别资源下载失败，可重试或粘贴系统识别文字"));};
 document.head.append(script);
 }).catch(e=>{enginePromise=null;throw e;});
 return enginePromise;
}
async function recognize(image,onProgress=()=>{}){
 if(root.location?.protocol==="file:")throw Error("当前是直接打开的本地文件，浏览器不允许在此方式下启动识图。请双击项目根目录的「启动课表工具.cmd」，使用打开的本机网页。");
 if(active)throw Error("已有识别任务，请先取消或等待");
 const job={worker:null,cancelled:false,reject:null,phase:"loading"};active=job;
 let timer;
 const stopped=new Promise((_,reject)=>{job.reject=reject;timer=setTimeout(()=>{job.cancelled=true;job.worker?.terminate();reject(Error(job.phase==="loading"?"识别引擎或模型加载超时，请确认通过「启动课表工具.cmd」打开，并保留完整 dist 文件夹。":"图片识别耗时过长，请换用分辨率较低的图片后重试"));},150000);});
 const run=async()=>{
 const T=await loadEngine();if(job.cancelled)throw Error("已取消识别");
 const worker=await T.createWorker(["chi_sim","eng"],1,{
 workerPath:new URL("vendor/ocr/worker.min.js",document.baseURI).href,
 workerBlobURL:false,
 langPath:new URL("vendor/ocr/lang",document.baseURI).href,
 gzip:false,
 cacheMethod:"none",
 corePath:new URL("vendor/ocr/core",document.baseURI).href,
 errorHandler:()=>{if(!job.cancelled)job.reject(Error("识别引擎加载失败，请检查本机启动方式及 dist/vendor/ocr 资源是否完整。"));},
 logger:m=>{if(!job.cancelled)onProgress(m);}
 });
 job.worker=worker;
 if(job.cancelled){await worker.terminate();throw Error("已取消识别");}
 await worker.setParameters({tessedit_pageseg_mode:"11",preserve_interword_spaces:"1"});
 job.phase="recognizing";
 if(root.CourseVision&&image?.getContext){const grouped=await root.CourseVision.recognize(worker,image,onProgress,()=>job.cancelled);if(grouped)return {courseResult:grouped};throw Error("未能自动定位课表区域，目前更适合彩色课程块的正面截图。可以粘贴相册识别文字继续登记。");}
 await worker.setParameters({tessedit_pageseg_mode:"11"});
 const result=await worker.recognize(image,{}, {text:true,blocks:true});
 return result.data;
 };
 try{return await Promise.race([run(),stopped]);}
 finally{clearTimeout(timer);job.cancelled=true;if(job.worker)await job.worker.terminate().catch(()=>{});if(active===job)active=null;}
}
function cancel(){
 if(active){active.cancelled=true;active.worker?.terminate();active.reject(Error("已取消识别，原有课程保持不变"));}
}
async function prepareImage(file){
 let image,close=()=>{};
 if(typeof createImageBitmap==="function"){image=await createImageBitmap(file);close=()=>image.close();}
 else{
 const url=URL.createObjectURL(file);image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error("无法读取图片，请使用 PNG、JPG 或 WebP"));image.src=url;});}
 finally{URL.revokeObjectURL(url);}
 }
 try{
 const w=image.width,h=image.height;
 if(!w||!h||w*h>24000000)throw Error("图片尺寸过大，请使用不超过 2400 万像素的图片");
 const top=0,croppedHeight=h;

 const scale=Math.min(1,2800/Math.max(w,croppedHeight));
 const canvas=document.createElement("canvas");canvas.width=Math.round(w*scale);canvas.height=Math.round(croppedHeight*scale);
 const ctx=canvas.getContext("2d");ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,top,w,croppedHeight,0,0,canvas.width,canvas.height);
 return canvas;
 }finally{close();}
}
root.CourseOcr={recognize,cancel,prepareImage};
})(globalThis);






