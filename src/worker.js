const json = (value, status=200) => Response.json(value, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail = (message, status=400) => {throw Object.assign(new Error(message),{status});};
async function body(request) {
 const text = await request.text();
 if(new TextEncoder().encode(text).length>250000) fail('Carga demasiado grande.',413);
 try {return JSON.parse(text);} catch {fail('JSON inválido.');}
}
export default {
 async fetch(request,env) {
  const url=new URL(request.url), path=url.pathname;
  if(!path.startsWith('/api/')) return env.ASSETS.fetch(request);
  try {
   if(!env.APP_PASSWORD) return json({error:'Configura APP_PASSWORD en Cloudflare para habilitar el acceso.'},503);
   const supplied=request.headers.get('Authorization')||'';
   const a=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(supplied)));
   const b=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('Bearer '+env.APP_PASSWORD)));
   let diff=0; for(let i=0;i<a.length;i++) diff |= a[i]^b[i];
   if(diff) return json({error:'Clave incorrecta. Vuelve a ingresar.'},401);
   if(request.method!=='GET' && request.headers.get('Origin') && request.headers.get('Origin')!==url.origin) return json({error:'Origen inválido.'},403);
   if(path==='/api/uploads' && request.method==='GET') {
    const {results}=await env.DB.prepare('SELECT * FROM uploads ORDER BY created_at DESC').all();
    return json(results.map(r=>({...r,manifest:JSON.parse(r.manifest)})));
   }
   if(path==='/api/uploads' && request.method==='POST') {
    const d=await body(request);
    if(typeof d.name!=='string'||!d.name.length||d.name.length>240||!['OC 2025','OC 2026','Master Capital','STATUS','Otro'].includes(d.category)) fail('Nombre o fuente inválidos.');
    if(!Array.isArray(d.manifest)||!d.manifest.length||d.manifest.length>40) fail('El archivo debe tener entre 1 y 40 hojas.');
    for(const s of d.manifest) if(typeof s.name!=='string'||s.name.length>100||!Number.isInteger(s.rows)||s.rows<0||s.rows>50000||!Number.isInteger(s.parts)||s.parts<0||s.parts>1000) fail('Hoja fuera de los límites de esta beta.');
    const id=crypto.randomUUID();
    await env.DB.prepare('INSERT INTO uploads(id,name,category,manifest) VALUES(?,?,?,?)').bind(id,d.name,d.category,JSON.stringify(d.manifest)).run();
    return json({id},201);
   }
   const match=path.match(/^\/api\/uploads\/([a-f0-9-]+)(?:\/(blocks|complete))?$/);
   if(!match) return json({error:'Ruta no encontrada.'},404);
   const [,id,action]=match;
   const upload=await env.DB.prepare('SELECT * FROM uploads WHERE id=?').bind(id).first();
   if(!upload) return json({error:'Carga no encontrada.'},404);
   const manifest=JSON.parse(upload.manifest);
   if(!action && request.method==='DELETE') {
    await env.DB.batch([env.DB.prepare('DELETE FROM blocks WHERE upload_id=?').bind(id),env.DB.prepare('DELETE FROM uploads WHERE id=?').bind(id)]);
    return json({ok:true});
   }
   if(action==='blocks' && request.method==='POST') {
    if(upload.status!=='loading') fail('Esta carga ya está cerrada.',409);
    const d=await body(request), sheet=manifest[d.sheet];
    if(!Number.isInteger(d.sheet)||!sheet||!Number.isInteger(d.part)||d.part<0||d.part>=sheet.parts||!Array.isArray(d.rows)||!d.rows.length||d.rows.length>100) fail('Bloque inválido.');
    for(const r of d.rows) if(!r||!Number.isInteger(r.n)||r.n<1||!Array.isArray(r.cells)||r.cells.length>200||r.cells.some(c=>typeof c!=='string'||c.length>40000)) fail('Fila inválida.');
    await env.DB.prepare('INSERT INTO blocks(upload_id,sheet,part,payload) VALUES(?,?,?,?) ON CONFLICT(upload_id,sheet,part) DO UPDATE SET payload=excluded.payload').bind(id,d.sheet,d.part,JSON.stringify(d.rows)).run();
    return json({ok:true});
   }
   if(action==='complete' && request.method==='POST') {
    const {results}=await env.DB.prepare('SELECT sheet,COUNT(*) AS parts,SUM(json_array_length(payload)) AS rows FROM blocks WHERE upload_id=? GROUP BY sheet').bind(id).all();
    for(let i=0;i<manifest.length;i++) {const actual=results.find(r=>r.sheet===i); if((actual?.parts||0)!==manifest[i].parts || (actual?.rows||0)!==manifest[i].rows) fail('Carga incompleta. Elimina este intento y vuelve a subir el archivo.',409);}
    await env.DB.prepare("UPDATE uploads SET status='ready' WHERE id=?").bind(id).run();
    return json({ok:true});
   }
   if(action==='blocks' && request.method==='GET') {
    if(upload.status!=='ready') fail('La carga todavía no está completa.',409);
    const sheet=Number(url.searchParams.get('sheet')), part=Number(url.searchParams.get('part'));
    if(!Number.isInteger(sheet)||!manifest[sheet]||!Number.isInteger(part)||part<0) fail('Hoja o bloque inválidos.');
    const row=await env.DB.prepare('SELECT payload FROM blocks WHERE upload_id=? AND sheet=? AND part=?').bind(id,sheet,part).first();
    return json(row?JSON.parse(row.payload):[]);
   }
   return json({error:'Método no permitido.'},405);
  } catch(error) {if(!error.status) console.error(error); return json({error:error.status?error.message:'No se pudo completar la operación. Revisa la conexión y la configuración de D1.'},error.status||500);}
 }
};
