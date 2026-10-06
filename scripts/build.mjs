import {build} from 'esbuild';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const root=resolve('artifacts/fixture-source'),samples={};
async function walk(folder){for(const item of await readdir(folder,{withFileTypes:true})){const path=resolve(folder,item.name);if(item.isDirectory())await walk(path);else if(item.isFile())samples[relative(root,path).split('\\').join('/')]=(await readFile(path)).toString('base64');}}
await walk(root);await writeFile('src/sample.mjs','// Original synthetic example files. No asset reuse license is granted.\nexport const SAMPLE_FILES = '+JSON.stringify(samples,null,2)+';\n');
const result=await build({entryPoints:['web/app.mjs'],bundle:true,format:'iife',platform:'browser',target:['chrome110','firefox115','safari16'],write:false,minify:false,legalComments:'inline'});
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const css=await readFile('web/styles.css','utf8');
const license=await readFile('node_modules/@xmldom/xmldom/LICENSE','utf8');
await writeFile('THIRD_PARTY_NOTICES.txt','The offline HTML includes @xmldom/xmldom 0.9.12. The following license applies only to that dependency, not original MapParcel code or fixtures.\n\n'+license);
let html=await readFile('web/index.html','utf8');html=html.replace('<link rel="stylesheet" href="styles.css">',()=>'<style>'+css+'</style>').replace('<script src="app.js"></script>',()=>'<script>'+js+'</script>');
html=html.replace('</head>',()=>'<meta name="map-parcel-dependency-license" content="@xmldom/xmldom 0.9.12; see embedded third-party notice">\n<!-- THIRD-PARTY NOTICE ONLY\n'+license.replace(/--/g,'- -')+'\nEND THIRD-PARTY NOTICE -->\n</head>');
await mkdir('dist',{recursive:true});await writeFile('dist/map-parcel.html',html);console.log(`Built offline dist/map-parcel.html (${Buffer.byteLength(html)} bytes)`);
