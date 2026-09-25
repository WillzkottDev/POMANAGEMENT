import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import '../public/importer.js';
import worker from '../src/worker.js';
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../public/vendor/xlsx.full.min.js',import.meta.url),'utf8'),context);
const XLSX=context.XLSX;
test('sparse ranges, dates, zero and HTML remain plain data',()=>{
 const sheet=XLSX.utils.aoa_to_sheet([['PO','Fecha','Cantidad','Texto'],['000123',new Date(2026,7,28),0,'<script>alert(1)</script>']]);sheet['!ref']='A1:AZ1048576';
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Prueba');
 const result=POImporter.readWorkbook(null,{...XLSX,read:()=>book})[0];
 assert.equal(result.rows.length,2);assert.equal(result.rows[1].cells[0],'000123');assert.equal(result.rows[1].cells[2],'0');assert.match(result.rows[1].cells[3],/<script>/);assert.equal(result.blocks.length,1);
});
test('API denies access without a configured secret or valid key',async()=>{
 const req=new Request('https://test.local/api/uploads');
 assert.equal((await worker.fetch(req,{})).status,503);
 assert.equal((await worker.fetch(req,{APP_PASSWORD:'test-password'})).status,401);
});
const sources=path.resolve(import.meta.dirname,'../..');
for(const name of fs.readdirSync(sources).filter(n=>n.endsWith('.xlsx'))) test('Real workbook: '+name,()=>{
 const result=POImporter.readWorkbook(fs.readFileSync(path.join(sources,name)),XLSX);
 assert.ok(result.length);assert.ok(result.some(s=>s.rows.length));
 for(const s of result)assert.equal(s.blocks.flat().length,s.rows.length);
 console.log(name+': '+result.map(s=>s.name+'='+s.rows.length).join(', '));
});
