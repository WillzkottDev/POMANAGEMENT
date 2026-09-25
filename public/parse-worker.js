importScripts('/vendor/xlsx.full.min.js','/importer.js');
self.onmessage=({data})=>{try{self.postMessage({sheets:POImporter.readWorkbook(data,XLSX)});}catch(e){self.postMessage({error:e.message});}};
