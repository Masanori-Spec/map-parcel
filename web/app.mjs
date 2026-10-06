import { planPackage, ParcelError, LIMITS } from '../src/closure.mjs';
import { zipStore } from '../src/zip-store.mjs';
import { SAMPLE_FILES } from '../src/sample.mjs';

const OFFLINE_HTML = '<!doctype html>\n' + document.documentElement.outerHTML;
const $ = id => document.getElementById(id);
const COPY = {
 ja: {
  skip:'作業エリアへ',local:'ローカル処理',title:'地図をひとつ。\n必要なファイルだけ。',lede:'選んだTMXが参照する素材を集めて、元の階層・元のバイトのままZIPに。受け渡し前の確認まで、ブラウザ内で完結します。',noRewrite:'パスの書換えなし',noUpload:'アップロードなし',sameBytes:'SAME PATHS. SAME BYTES.',
  importHeading:'入力フォルダを選ぶ',importHint:'マップと素材がすべて入る共通の親フォルダを選んでください。フォルダの外への参照は止めます。',chooseFolder:'フォルダを選択',nothingSelected:'まだ選ばれていません',trySample:'サンプルで試す →',limits:'最大2,048ファイル・合計128MiB。フォルダ選択対応ブラウザを使用してください。',entryLabel:'入口となるTMX',entryPlaceholder:'入口マップを選んでください',reset:'クリア',reviewHeading:'確認して、まとめる',included:'含めるファイル',sourceSize:'元ファイルの合計',excluded:'含めないファイル',initialStatus:'入口マップを選ぶと、参照先を確認します。',export:'ZIPを保存',receipt:'レシートを保存',print:'確認内容を印刷',receiptHint:'ZIP保存後に、全ファイルのSHA-256と参照元を記録したJSONレシートも保存できます。',pathsHeading:'含まれる理由を確認',pathsHint:'フォルダ階層は保持されます。同じ名前の画像も、別フォルダなら別ファイルです。',supplementsHeading:'補足ファイルを選ぶ（任意）',supplementsHint:'ライセンスや説明書などを明示的に追加できます。補足ファイルの依存先は調べません。選択しても素材の共有・再利用の権利は付与されません。',noSupplements:'追加できるファイルはありません。',zipDigest:'生成ZIPのSHA-256',boundaryTitle:'「明示された参照先」のための道具です',boundaryBody:'外部タイルセット・画像・オブジェクトテンプレート・file型プロパティを追跡します。プロジェクトのクラス既定値、任意の文字列やスクリプトに隠れた依存先は対象外です。完全なゲーム／プロジェクトの出力ではありません。',unsupportedTitle:'止める入力について',unsupportedBody:'ルート外・絶対パス・URL・不足ファイル・名前の衝突・循環・未対応XMLを検出するとZIP保存を止めます。JSON形式、プロジェクト／ワールド、SVG、埋込み画像、カスタムクラス、曖昧なfile値は未対応です。画像の実データやゲーム側の動作までは検証しません。',printBoundary:'これは明示的なファイル参照の確認記録です。完全なプロジェクトや素材の共有権限を保証するものではありません。',footer:'通信せずに処理。元のファイルは変更しません。',offline:'オフラインHTMLを保存',importing:'フォルダを読み込んでいます…',building:'元バイトとSHA-256を確認しています…',ready:'明示的な参照先を確認しました。元の階層とバイトを保持してZIPにまとめられます。',exported:'ZIPの保存を開始しました。レシートには元ファイルとZIPのSHA-256を記録しています。',cleared:'入力をクリアしました。新しいフォルダを選べます。',chooseEntry:'フォルダを読み込みました。入口となるTMXを選んでください。',noMaps:'このフォルダにはTMXがありません。XML形式のTMXを含むフォルダを選んでください。',stopped:'処理を止めました。ZIPは作成されません。',entryReason:'入口マップ',supplementReason:'明示選択した補足',sourceReason:'参照元',files:'ファイル',maps:'個のTMX',bytes:'バイト',errors:{MISSING_FILE:'参照先のファイルが不足しています。共通の親フォルダを選び直してください。',UNSAFE_PATH:'安全に保持できないパスが含まれています。',ROOT_ESCAPE:'参照先が選択ルートの外にあります。',PATH_COLLISION:'大文字・小文字等の違いで名前が衝突します。',CLASS_DEFAULTS:'プロジェクトのクラス既定値に依存する入力は未対応です。',INPUT_LIMIT:'入力ファイル数または合計サイズが上限を超えています。',XML_LIMIT:'XMLのサイズ・深さ・要素数が上限を超えています。',DEPENDENCY_CYCLE:'XML参照が循環しています。',INVALID_XML:'正しくないXMLまたは未対応の混在内容です。',UNSUPPORTED_FORMAT:'未対応の依存ファイル形式です。',UNKNOWN_REFERENCE:'未対応のXML要素・属性・配置が含まれています。',AMBIGUOUS_FILE_VALUE:'file型の値が曖昧で、Tiledと同じ解釈を保証できません。'}
 },
 en: {
  skip:'Skip to workspace',local:'Local processing',title:'One map.\nOnly what it needs.',lede:'Gather the files your selected TMX explicitly references. Keep every path and every source byte, then check the package before sharing. It all happens in your browser.',noRewrite:'No path rewriting',noUpload:'No upload',sameBytes:'SAME PATHS. SAME BYTES.',
  importHeading:'Choose a source folder',importHint:'Choose a shared parent folder containing the map and all its assets. References outside this root are blocked.',chooseFolder:'Choose folder',nothingSelected:'No folder selected',trySample:'Try the sample →',limits:'Up to 2,048 files and 128 MiB total. Use a browser that supports folder selection.',entryLabel:'Entry TMX map',entryPlaceholder:'Choose the entry map',reset:'Clear',reviewHeading:'Review, then package',included:'Included files',sourceSize:'Source bytes',excluded:'Excluded files',initialStatus:'Choose an entry map to inspect its references.',export:'Save ZIP',receipt:'Save receipt',print:'Print review',receiptHint:'After saving the ZIP, save a JSON receipt containing every file’s SHA-256 and reference reasons.',pathsHeading:'See why each file is included',pathsHint:'Folder layout stays intact. Images with the same name remain distinct in separate folders.',supplementsHeading:'Choose supplements (optional)',supplementsHint:'Explicitly add a license, attribution or other note. Supplement dependencies are not inspected. Selecting a file grants no rights to share or reuse assets.',noSupplements:'No additional files are available.',zipDigest:'Generated ZIP SHA-256',boundaryTitle:'For explicit file references',boundaryBody:'Follows external tilesets, images, object templates and file-type properties. Project class defaults, arbitrary strings and script dependencies are outside scope. This is not a complete game or project export.',unsupportedTitle:'Inputs that stop export',unsupportedBody:'Outside-root or absolute paths, URLs, missing files, name collisions, cycles and unsupported XML block export. JSON, projects/worlds, SVG, embedded images, custom classes and ambiguous file values are unsupported. Asset contents and game behavior are not validated.',printBoundary:'This records explicit file references. It does not guarantee a complete project or permission to share assets.',footer:'No network processing. Your source files stay unchanged.',offline:'Save offline HTML',importing:'Reading the folder…',building:'Checking original bytes and SHA-256 values…',ready:'Explicit references checked. The ZIP will preserve the original folder layout and bytes.',exported:'ZIP download started. The receipt records source-file and ZIP SHA-256 values.',cleared:'Input cleared. Choose another folder when ready.',chooseEntry:'Folder loaded. Choose the entry TMX map.',noMaps:'No TMX map found. Choose a folder containing an XML TMX map.',stopped:'Packaging stopped. No ZIP was created.',entryReason:'Entry map',supplementReason:'Explicit supplement',sourceReason:'Referenced by',files:'files',maps:'TMX maps',bytes:'bytes',errors:{MISSING_FILE:'A referenced file is missing. Choose the shared parent folder containing every required file.',UNSAFE_PATH:'A path cannot be preserved safely.',ROOT_ESCAPE:'A reference leaves the selected root.',PATH_COLLISION:'Names collide when case or spelling is normalized.',CLASS_DEFAULTS:'Inputs using project/custom class defaults are unsupported.',INPUT_LIMIT:'Input file count or total size exceeds the limit.',XML_LIMIT:'XML size, depth or element count exceeds the limit.',DEPENDENCY_CYCLE:'XML references form a cycle.',INVALID_XML:'Invalid XML or unsupported mixed content.',UNSUPPORTED_FORMAT:'A dependency uses an unsupported format.',UNKNOWN_REFERENCE:'An XML element, attribute or placement is unsupported.',AMBIGUOUS_FILE_VALUE:'A file value is ambiguous across XML readers.'}
 }
};
const KINDS = {ja:{tileset:'タイルセット',image:'画像 / メタマップ',template:'テンプレート','file-property':'file型'},en:{tileset:'Tileset',image:'Image / metatile',template:'Template','file-property':'File property'}};
let lang = 'ja';
let revision = 0;
let state = {files:new Map(), root:'', entry:'', plan:null, base:null, supplements:new Set(), busy:false, status:'initialStatus', error:null, artifact:null};
const urls = new Set();
const t = key => COPY[lang][key] || key;
function size(bytes) { return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes/1024).toFixed(1)} KiB` : `${(bytes/1048576).toFixed(1)} MiB`; }
function element(tag, className, content) { const node=document.createElement(tag);if(className)node.className=className;if(content!==undefined)node.textContent=content;return node; }
function stale(token) { return token !== revision; }
function invalidate() { revision++;state.artifact=null;state.busy=false;return revision; }
function clearData(status='initialStatus') {
 const token=invalidate();for(const url of urls)URL.revokeObjectURL(url);urls.clear();
 state={files:new Map(),root:'',entry:'',plan:null,base:null,supplements:new Set(),busy:false,status,error:null,artifact:null};$('folder-input').value='';render();return token;
}
function textWithBreaks(node,text) { node.replaceChildren();text.split('\n').forEach((line,i)=>{if(i)node.append(document.createElement('br'));node.append(document.createTextNode(line));}); }
function setLanguage(next) { lang=next;document.documentElement.lang=lang;document.title=lang==='ja'?'MapParcel · 地図を、そのまま届ける':'MapParcel · One map, ready to share';document.querySelectorAll('[data-i18n]').forEach(node=>textWithBreaks(node,t(node.dataset.i18n)));$('lang-ja').setAttribute('aria-pressed',String(lang==='ja'));$('lang-en').setAttribute('aria-pressed',String(lang==='en'));render(); }
function render() {
 const focusedSupplement = document.activeElement?.matches('#supplement-list input') ? document.activeElement.dataset.path : null;
 const maps=[...state.files.keys()].filter(path=>/\.tmx$/i.test(path)).sort();
 $('entry').replaceChildren(new Option(t('entryPlaceholder'),''),...maps.map(path=>new Option(path,path)));$('entry').value=state.entry;$('entry').disabled=!maps.length||state.busy&&state.status==='importing';
 $('folder-summary').textContent=state.root?`${state.root} · ${state.files.size} ${t('files')}`:t('nothingSelected');$('entry-count').textContent=maps.length?`${maps.length} ${t('maps')}`:'';
 $('reset').disabled=!state.root&&!state.busy&&!state.error;
 $('file-count').textContent=state.plan?.paths.length??'—';$('byte-count').textContent=state.plan?size([...state.plan.files.values()].reduce((n,b)=>n+b.byteLength,0)):'—';$('excluded-count').textContent=state.plan?.excluded.length??'—';
 $('status').textContent=state.error?`${t('stopped')}\n${COPY[lang].errors[state.error.code]||''}\n[${state.error.code||'ERROR'}] ${state.error.message}`:t(state.status);$('status').dataset.state=state.error?'error':state.plan?(state.status==='exported'?'exported':'ready'):'empty';
 $('export').disabled=!state.plan||state.busy;$('export').textContent=state.busy&&state.status==='building'?t('building'):t('export');$('receipt').disabled=!state.artifact||state.busy;$('print').disabled=!state.plan||state.busy;$('results').hidden=!state.plan;
 if(!state.plan){$('path-list').replaceChildren();$('supplement-list').replaceChildren();$('entry-badge').textContent='';$('zip-digest').textContent='';$('receipt-preview').hidden=true;$('print-summary').textContent=t(state.status);return;}
 $('entry-badge').textContent=state.entry;
 $('path-list').replaceChildren(...state.plan.paths.map(path=>{
   const item=element('li');item.append(element('span','path-name',path));const reasons=element('span','path-reasons');
   if(path===state.entry)reasons.append(element('span','reason',t('entryReason')));
   for(const edge of state.plan.edges.filter(edge=>edge.to===path)){const row=element('span','reason');row.append(element('span','kind',KINDS[lang][edge.kind]),document.createTextNode(edge.from));reasons.append(row);}
   if(state.supplements.has(path))reasons.append(element('span','reason',t('supplementReason')));
   item.append(reasons,element('span','path-size',size(state.files.get(path).byteLength)));return item;
 }));
 const candidates=[...state.files.keys()].filter(path=>!state.base.paths.includes(path)).sort();
 $('supplement-list').replaceChildren(...candidates.map(path=>{const label=element('label');const checkbox=element('input');checkbox.type='checkbox';checkbox.checked=state.supplements.has(path);checkbox.dataset.path=path;checkbox.addEventListener('change',()=>{invalidate();if(checkbox.checked)state.supplements.add(path);else state.supplements.delete(path);analyze();});label.append(checkbox,element('span','',path));return label;}));$('no-supplements').hidden=!!candidates.length;if(focusedSupplement)[...$('supplement-list').querySelectorAll('input')].find(input=>input.dataset.path===focusedSupplement)?.focus();
 $('receipt-preview').hidden=!state.artifact;$('zip-digest').textContent=state.artifact?.receipt.zip.sha256||'';
 $('print-summary').textContent=`${state.root} / ${state.entry} · ${state.plan.paths.length} ${t('files')} · ${size([...state.plan.files.values()].reduce((n,b)=>n+b.byteLength,0))}`;
}
function fail(error) {state.plan=null;state.base=null;state.busy=false;state.error=error;state.status='stopped';state.artifact=null;render();}
function analyze() {
 state.error=null;state.artifact=null;
 if(!state.entry){state.plan=null;state.base=null;state.status='chooseEntry';render();return;}
 try{state.base=planPackage(state.files,state.entry);state.plan=planPackage(state.files,state.entry,[...state.supplements]);state.status='ready';state.busy=false;render();}catch(error){fail(error);}
}
function acceptFiles(files,root) {state.files=files;state.root=root;state.busy=false;state.error=null;state.supplements.clear();const maps=[...files.keys()].filter(path=>/\.tmx$/i.test(path)).sort();state.entry=maps.length===1?maps[0]:'';state.status=maps.length?'chooseEntry':'noMaps';if(state.entry)analyze();else render();}
async function importFolder(fileList) {
 if(!fileList.length)return;
 const token=clearData();state.busy=true;state.status='importing';render();
 try{
  if(fileList.length>LIMITS.files||fileList.reduce((n,file)=>n+file.size,0)>LIMITS.bytes)throw new ParcelError('INPUT_LIMIT','Maximum 2,048 files / 128 MiB');
  const root=fileList[0].webkitRelativePath.split('/')[0];if(!root||!fileList[0].webkitRelativePath.includes('/'))throw new ParcelError('UNSAFE_PATH','Folder-relative file paths are required');
  const files=new Map();
  for(const file of fileList){if(!file.webkitRelativePath.startsWith(root+'/'))throw new ParcelError('UNSAFE_PATH','Files must share one selected root');const path=file.webkitRelativePath.slice(root.length+1);if(files.has(path))throw new ParcelError('PATH_COLLISION',path);const bytes=new Uint8Array(await file.arrayBuffer());if(stale(token))return;files.set(path,bytes);}
  if(!stale(token))acceptFiles(files,root);
 }catch(error){if(!stale(token))fail(error);}
}
function loadSample() {clearData();const files=new Map(Object.entries(SAMPLE_FILES).map(([path,b64])=>[path,Uint8Array.from(atob(b64),c=>c.charCodeAt(0))]));acceptFiles(files,lang==='ja'?'サンプル':'sample');state.entry='maps/selected.tmx';analyze();}
async function digest(bytes) {return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
function download(name,blob) {const url=URL.createObjectURL(blob);urls.add(url);const link=element('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},60000);}
async function exportPackage() {
 if(!state.plan||state.busy)return;
 const token=revision,plan=state.plan;state.busy=true;state.status='building';render();
 try{
  const entries=[];
  for(const path of plan.paths){const bytes=plan.files.get(path);const sha256=await digest(bytes);if(stale(token))return;entries.push({path,bytes:bytes.byteLength,sha256,reasons:[...(path===plan.entry?[{kind:'entry'}]:[]),...plan.edges.filter(edge=>edge.to===path).map(({from,kind,reference})=>({from,kind,reference})),...(plan.supplements.includes(path)?[{kind:'explicit-supplement'}]:[])]});}
  const zip=zipStore(plan),sha256=await digest(zip);if(stale(token))return;
  const base=plan.entry.split('/').at(-1).replace(/\.tmx$/i,'');const receipt={tool:'MapParcel',version:'0.2.0',scope:'explicit XML TMX/TSX/TX file dependencies; not a complete project',entry:plan.entry,sourceRoot:state.root,sourceBytesUnchanged:true,pathRewrites:false,supplements:plan.supplements,excluded:plan.excluded,files:entries,zip:{name:base+'-parcel.zip',bytes:zip.length,sha256},limits:LIMITS,rights:'No rights to share or reuse source assets are granted by packaging.'};
  state.artifact={receipt,base};state.busy=false;state.status='exported';render();download(receipt.zip.name,new Blob([zip],{type:'application/zip'}));
 }catch(error){if(!stale(token))fail(error);}
}
$('folder-input').addEventListener('change',event=>importFolder([...event.target.files]));$('sample').addEventListener('click',loadSample);$('reset').addEventListener('click',()=>clearData('cleared'));$('entry').addEventListener('change',event=>{invalidate();state.entry=event.target.value;state.supplements.clear();analyze();});$('export').addEventListener('click',exportPackage);$('receipt').addEventListener('click',()=>{if(state.artifact)download(state.artifact.base+'-receipt.json',new Blob([JSON.stringify(state.artifact.receipt,null,2)+'\n'],{type:'application/json'}));});$('print').addEventListener('click',()=>{if(state.plan)window.print();});$('lang-ja').addEventListener('click',()=>setLanguage('ja'));$('lang-en').addEventListener('click',()=>setLanguage('en'));
$('offline').addEventListener('click',event=>{event.preventDefault();download('map-parcel.html',new Blob([OFFLINE_HTML],{type:'text/html;charset=utf-8'}));});
setLanguage('ja');
