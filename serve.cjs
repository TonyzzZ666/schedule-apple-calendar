"use strict";
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
function createServer(rootDir=path.join(__dirname,"dist")){
 const root=fs.realpathSync(rootDir);
 return http.createServer(async(req,res)=>{
 const allowed=new Set(["127.0.0.1:"+res.socket.localPort,"localhost:"+res.socket.localPort]);
 if(!allowed.has(req.headers.host)){res.writeHead(403);res.end("Local access only");return;}
 if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405,{Allow:"GET, HEAD"});res.end();return;}
 try{
 const requestPath=decodeURIComponent((req.url||"/").split("?")[0]);
 if(requestPath.includes("\\")||requestPath.includes("\0"))throw Error("Invalid path");
 const file=path.resolve(root,"."+ (requestPath==="/"?"/index.html":requestPath));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const real=await fs.promises.realpath(file);
 if(real!==root&&!real.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const stat=await fs.promises.stat(real);if(!stat.isFile()){res.writeHead(404);res.end();return;}
 const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".wasm":"application/wasm",".txt":"text/plain; charset=utf-8",".png":"image/png"};
 res.writeHead(200,{"Content-Type":types[path.extname(real)]||"application/octet-stream","Content-Length":stat.size,"Cache-Control":"no-cache","X-Content-Type-Options":"nosniff"});
 if(req.method==="HEAD"){res.end();return;}
 const stream=fs.createReadStream(real);stream.on("error",()=>res.destroy());stream.pipe(res);
 }catch(e){res.writeHead(e.code==="ENOENT"?404:400);res.end("File not available");}
 });
}
module.exports={createServer};
if(require.main===module){
 const server=createServer();
 server.on("error",e=>{console.error(e.code==="EADDRINUSE"?"4173 端口已被占用。若课表工具已经启动，请使用原窗口；否则关闭占用程序后重试。":e.message);process.exitCode=1;});
 server.listen(4173,"127.0.0.1",()=>{
 const url="http://127.0.0.1:4173";
 console.log("课表入历已启动："+url+"\n请保持此窗口打开。按 Ctrl+C 停止。\n仅提供本机静态文件；图片不会上传，识图无需联网。");
 if(process.argv.includes("--open")){
 const child=require("node:child_process").spawn("explorer.exe",[url],{windowsHide:true,stdio:"ignore"});
 child.on("error",()=>console.log("请手动在浏览器打开上述地址。"));
 }
 });
}
