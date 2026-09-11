const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {createWorker}=require("./node_modules/tesseract.js");
const I=require("../../dist/course-import.js");
(async()=>{
 const worker=await createWorker(["chi_sim","eng"],1,{cachePath:__dirname,logger:m=>{if(m.status==="loading language traineddata")console.log(m.status,Math.round(m.progress*100));}});
 try{
 await worker.setParameters({tessedit_pageseg_mode:"11",preserve_interword_spaces:"1"});
 const {data}=await worker.recognize(path.join(__dirname,"ocr-fixture.png"),{}, {text:true,blocks:true});
 fs.writeFileSync(path.join(__dirname,"ocr-result.json"),JSON.stringify(data,null,2));
 console.log("OCR text:",data.text);
 const parsed=I.parseOcr(data);console.log("Parsed:",JSON.stringify(parsed.drafts));
 assert.ok(parsed.drafts.some(c=>c.name==="数据结构"),"真实OCR应识别数据结构");
 assert.ok(parsed.drafts.some(c=>c.name==="大学英语"),"真实OCR应识别大学英语");
 fs.writeFileSync(path.join(__dirname,"ocr-parsed.json"),JSON.stringify(parsed,null,2));
 }finally{await worker.terminate();}
})().catch(e=>{console.error(e);process.exitCode=1;});

