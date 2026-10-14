// Transport fixture only: it does not validate Cloudflare credentials or SigV4.
import http from 'node:http';
import crypto from 'node:crypto';
export async function startR2Mock(port=0) {
  const objects=new Map();
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','PUT, GET, HEAD, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
    if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
    const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(req.method==='PUT') {
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const body=Buffer.concat(chunks);const metadata={};
      for(const [key,value] of Object.entries(req.headers))if(key.startsWith('x-amz-meta-'))metadata[key.slice(11)]=value;
      const object={body,metadata,type:req.headers['content-type'],etag:`"${crypto.createHash('md5').update(body).digest('hex')}"`};
      objects.set(path,object);res.setHeader('ETag',object.etag);res.writeHead(200).end();return;
    }
    const object=objects.get(path);
    if(!object){res.setHeader('Content-Type','application/xml');res.writeHead(404).end('<Error><Code>NoSuchKey</Code></Error>');return;}
    if(req.headers['if-match'] && req.headers['if-match']!==object.etag){res.writeHead(412).end();return;}
    res.setHeader('Content-Length',object.body.length);res.setHeader('Content-Type',object.type);res.setHeader('ETag',object.etag);
    for(const [key,value] of Object.entries(object.metadata))res.setHeader('x-amz-meta-'+key,value);
    res.writeHead(200).end(req.method==='HEAD'?undefined:object.body);
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {objects,server,endpoint:`http://127.0.0.1:${server.address().port}`};
}
export function pdfFixture() {
 const stream='BT /F1 16 Tf 50 750 Td (MFN TEST ONLY - NOT AN OFFICIAL DOCUMENT) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=Buffer.byteLength(pdf);pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(pdf);
}
