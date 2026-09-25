import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8787');
 await page.locator('#password').fill('opko-prueba-local-2026');await page.locator('#login-form button').click();await page.locator('#workspace').waitFor({state:'visible'});
 const root=path.resolve(import.meta.dirname,'../..');
 const name='STATUS_OPKO_SEMANA 35 - (VIERNES 28-08-2026).xlsx';
 await page.locator('#category').selectOption('STATUS');await page.locator('#files').setInputFiles(path.join(root,name));await page.locator('#upload-button').click();
 await page.waitForFunction(()=>document.getElementById('upload-status').textContent==='Carga finalizada.',{},{timeout:120000});
 await page.locator('#sheet').selectOption('1');await page.waitForFunction(()=>!document.getElementById('search').disabled);
 assert.match(await page.locator('#page-info').textContent(),/160 filas/);
 await page.locator('#search').fill('NO_EXISTE_987654321');assert.match(await page.locator('#tbody').textContent(),/No hay coincidencias/);
 await page.locator('#search').fill('');await page.locator('#next').click();assert.match(await page.locator('#page-info').textContent(),/Página 2/);
 await page.screenshot({path:path.join(root,'po-management-beta-desktop.png'),fullPage:true});
 await page.reload();await page.locator('#password').fill('opko-prueba-local-2026');await page.locator('#login-form button').click();await page.locator('.file-card').first().click();await page.waitForFunction(()=>!document.getElementById('search').disabled);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'po-management-beta-mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'no viewport overflow');
 page.on('dialog',d=>d.accept());await page.locator('#delete').click();await page.waitForFunction(()=>document.getElementById('viewer').hidden);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: login, real Excel upload, sheet switch, search, paging, reload persistence, mobile layout, deletion; no browser errors.');
}finally{await browser.close();}
