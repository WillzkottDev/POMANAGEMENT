/* Parse sparse worksheets: do not traverse Excel's potentially inflated !ref. */
(function(root){
 function readWorkbook(buffer,XLSX){
  const wb=XLSX.read(buffer,{type:'array',cellStyles:false,cellHTML:false,cellText:true});
  if(wb.SheetNames.length>40) throw new Error('Máximo 40 hojas por archivo.');
  return wb.SheetNames.map(name=>{
   const map=new Map();
   for(const [address,cell] of Object.entries(wb.Sheets[name])){
    if(address.startsWith('!')||cell.v==null||cell.v==='') continue;
    const pos=XLSX.utils.decode_cell(address);
    if(pos.c>=200) throw new Error('La hoja '+name+' supera las 200 columnas admitidas.');
    const value=String(cell.w??XLSX.utils.format_cell(cell));
    if(value.length>40000) throw new Error('Una celda supera el límite de texto.');
    if(!map.has(pos.r)) map.set(pos.r,[]);
    map.get(pos.r)[pos.c]=value;
   }
   if(map.size>50000) throw new Error('La hoja '+name+' supera las 50.000 filas con contenido.');
   const rows=[...map].sort((a,b)=>a[0]-b[0]).map(([r,cells])=>({n:r+1,cells:Array.from(cells,v=>v??'')}));
   const blocks=[]; let block=[],bytes=2;
   for(const row of rows){
    const size=new TextEncoder().encode(JSON.stringify(row)).length+1;
    if(size>180000) throw new Error('Una fila supera el tamaño permitido.');
    if(block.length&&(block.length>=100||bytes+size>180000)){blocks.push(block);block=[];bytes=2;}
    block.push(row);bytes+=size;
   }
   if(block.length) blocks.push(block);
   if(blocks.length>1000) throw new Error('La hoja supera el tamaño permitido.');
   return {name,rows,blocks};
  });
 }
 root.POImporter={readWorkbook};
})(globalThis);
