import { DOMParser } from '@xmldom/xmldom';

export const LIMITS = Object.freeze({ files: 2048, bytes: 128 * 1024 * 1024, xmlBytes: 4 * 1024 * 1024, references: 8192, xmlElements: 20000, xmlDepth: 128 });
const XML_ROOTS = new Map([['tmx', 'map'], ['tsx', 'tileset'], ['tx', 'template']]);
const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp']);
const UNSUPPORTED = new Set(['tmj', 'tsj', 'tj', 'json', 'world', 'tiled-project', 'svg', 'xml']);
const SCALAR_TYPES = new Set(['string', 'int', 'float', 'bool', 'color', 'file', 'object']);
// A conservative TMX XML vocabulary. Unknown extension elements/attributes are blocked.
const XML_ATTRIBUTES = Object.fromEntries(Object.entries({
  map: 'version tiledversion class orientation renderorder compressionlevel width height tilewidth tileheight hexsidelength staggeraxis staggerindex parallaxoriginx parallaxoriginy backgroundcolor nextlayerid nextobjectid infinite',
  tileset: 'firstgid source version tiledversion name class tilewidth tileheight spacing margin tilecount columns objectalignment tilerendersize fillmode backgroundcolor',
  tileoffset: 'x y', grid: 'orientation width height', properties: '', property: 'name type propertytype value',
  image: 'format source trans width height', data: 'encoding compression', chunk: 'x y width height',
  tile: 'id gid type class terrain probability x y width height', animation: '', frame: 'tileid duration',
  terraintypes: '', terrain: 'name tile probability', wangsets: '', wangset: 'name class type tile',
  wangcolor: 'name class color tile probability', wangtile: 'tileid wangid',
  layer: 'id name class x y width height opacity visible tintcolor offsetx offsety parallaxx parallaxy mode',
  objectgroup: 'id name class color x y width height opacity visible tintcolor offsetx offsety parallaxx parallaxy draworder mode',
  object: 'id name type class x y width height rotation gid visible template', ellipse: '', point: '', polygon: 'points', polyline: 'points',
  text: 'fontfamily pixelsize wrap color bold italic underline strikeout kerning halign valign',
  imagelayer: 'id name class x y opacity visible tintcolor offsetx offsety parallaxx parallaxy repeatx repeaty mode',
  group: 'id name class opacity visible tintcolor offsetx offsety parallaxx parallaxy mode',
  template: '', transformations: 'hflip vflip rotate preferuntransformed', editorsettings: '', export: 'target format'
}).map(([tag, attributes]) => [tag, new Set(attributes.split(' ').filter(Boolean))]));
const XML_CHILDREN = Object.fromEntries(Object.entries({
  map: 'properties tileset layer objectgroup imagelayer group editorsettings',
  tileset: 'properties tileoffset grid image tile terraintypes wangsets transformations',
  properties: 'property', image: 'data', data: 'tile chunk', chunk: 'tile',
  tile: 'properties image objectgroup animation', animation: 'frame', terraintypes: 'terrain', terrain: 'properties',
  wangsets: 'wangset', wangset: 'properties wangcolor wangtile', wangcolor: 'properties',
  layer: 'properties data', objectgroup: 'properties object', object: 'properties ellipse point polygon polyline text',
  imagelayer: 'properties image', group: 'properties layer objectgroup imagelayer group', template: 'tileset object', editorsettings: 'export'
}).map(([tag, children]) => [tag, new Set(children.split(' '))]));
function validXMLCodePoint(n) { return n === 9 || n === 10 || n === 13 || (n >= 0x20 && n <= 0xd7ff) || (n >= 0xe000 && n <= 0xfffd) || (n >= 0x10000 && n <= 0x10ffff); }

export class ParcelError extends Error {
  constructor(code, message) { super(message); this.name = 'ParcelError'; this.code = code; }
}
function fail(code, message) { throw new ParcelError(code, message); }
function extension(path) { return path.split('.').at(-1).toLowerCase(); }
function validateSegments(path, relative) {
  if (typeof path !== 'string' || !path || path.normalize('NFC') !== path || /[\\<>:"|?*%#\x00-\x1f\x7f]/u.test(path) || path.startsWith('/')) {
    fail('UNSAFE_PATH', `Unsupported path: ${JSON.stringify(path)}`);
  }
  for (const segment of path.split('/')) {
    if (relative && (segment === '.' || segment === '..')) continue;
    if (!segment || /[. ]$/u.test(segment) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(segment)) fail('UNSAFE_PATH', `Unsupported path segment in ${path}`);
  }
}
export function resolveReference(from, reference) {
  validateSegments(reference, true);
  const parts = from.split('/').slice(0, -1);
  for (const item of reference.split('/')) {
    if (item === '.') continue;
    if (item === '..') {
      if (!parts.length) fail('ROOT_ESCAPE', `${from} escapes selected root: ${reference}`);
      parts.pop();
    } else parts.push(item);
  }
  const resolved = parts.join('/');
  validateSegments(resolved, false);
  return resolved;
}
function indexFiles(input) {
  if (!(input instanceof Map) || !input.size || input.size > LIMITS.files) fail('INPUT_LIMIT', 'Choose 1–2048 files');
  const entries = new Map();
  const folded = new Map();
  let total = 0;
  for (const [path, bytes] of input) {
    validateSegments(path, false);
    if (!(bytes instanceof Uint8Array)) fail('INVALID_BYTES', `${path} is not a byte array`);
    total += bytes.byteLength;
    if (total > LIMITS.bytes) fail('INPUT_LIMIT', 'Input exceeds 128 MiB');
    let prefix = '';
    const segments = path.split('/');
    for (let i = 0; i < segments.length; i++) {
      prefix += (i ? '/' : '') + segments[i];
      const key = prefix.toUpperCase().toLowerCase();
      const kind = i === segments.length - 1 ? 'file' : 'directory';
      const prior = folded.get(key);
      if (prior && (prior.path !== prefix || prior.kind !== kind)) fail('PATH_COLLISION', `Colliding paths: ${prior.path} and ${prefix}`);
      folded.set(key, {path: prefix, kind});
    }
    entries.set(path, bytes);
  }
  return entries;
}
function references(path, bytes) {
  if (bytes.byteLength > LIMITS.xmlBytes) fail('XML_LIMIT', `${path} exceeds 4 MiB XML limit`);
  let xml;
  try { xml = new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
  catch { fail('XML_ENCODING', `${path} must be UTF-8 XML`); }
  for (const character of xml) if (!validXMLCodePoint(character.codePointAt(0))) fail('INVALID_XML', `${path}: forbidden XML character`);
  for (const match of xml.matchAll(/&#(x[0-9a-f]+|[0-9]+);/gi)) {
    const n = match[1][0].toLowerCase() === 'x' ? Number.parseInt(match[1].slice(1), 16) : Number(match[1]);
    if (!validXMLCodePoint(n)) fail('INVALID_XML', `${path}: forbidden numeric XML character reference`);
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail('XML_DOCTYPE', `${path}: DTD and entities are not supported`);
  const declaration = xml.match(/^\uFEFF?\s*<\?xml\s[^?]*encoding\s*=\s*["']([^"']+)["']/i);
  if (declaration && !/^utf-8$/i.test(declaration[1])) fail('XML_ENCODING', `${path}: only UTF-8 is supported`);
  // Bounded lexical preflight before DOM allocation. It is only a limit check;
  // the XML parser still decides validity. Quoted attributes/comments/CDATA do not add depth.
  let depth = 0; let elementCount = 0;
  const tokens = xml.match(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<(?:"[^"]*"|'[^']*'|[^'">])*>/g) || [];
  for (const token of tokens) {
    if (token.startsWith('<?') && !/^<\?xml\s/.test(token)) fail('UNKNOWN_REFERENCE', `${path}: processing instructions are unsupported`);
    if (token.startsWith('<?') || token.startsWith('<!')) continue;
    if (token.startsWith('</')) depth--;
    else { elementCount++; if (!token.endsWith('/>')) depth++; }
    if (depth > LIMITS.xmlDepth || elementCount > LIMITS.xmlElements) fail('XML_LIMIT', `${path}: XML depth/element limit exceeded`);
  }
  let document;
  try {
    document = new DOMParser({onError: (level, message) => { throw new Error(`${level}: ${message}`); }}).parseFromString(xml, 'application/xml');
  } catch (error) { fail('INVALID_XML', `${path}: ${error.message}`); }
  if (document.documentElement?.tagName !== XML_ROOTS.get(extension(path))) fail('WRONG_XML_ROOT', `${path}: unexpected XML root`);
  const output = [];
  const nodes = document.getElementsByTagName('*');
  for (let i = 0; i < nodes.length; i++) {
    const element = nodes[i];
    const tag = element.tagName;
    if (element.namespaceURI || tag.includes(':') || element.hasAttribute('xmlns')) fail('XML_NAMESPACE', `${path}: namespaced XML is unsupported`);
    if (!Object.hasOwn(XML_ATTRIBUTES, tag)) fail('UNKNOWN_REFERENCE', `${path}: unsupported XML element ${tag}`);
    if (element.parentNode?.nodeType === 1 && !XML_CHILDREN[element.parentNode.tagName]?.has(tag)) fail('UNKNOWN_REFERENCE', `${path}: unsupported ${tag} placement inside ${element.parentNode.tagName}`);
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 && tag === 'tileset' && element.hasAttribute('source')) fail('UNKNOWN_REFERENCE', `${path}: external tileset reference cannot contain inline children`);
      if ([3, 4].includes(child.nodeType) && child.nodeValue.trim() && !['property', 'text', 'data', 'chunk'].includes(tag)) fail('INVALID_XML', `${path}: unsupported mixed/text content inside ${tag}`);
    }
    if (element.getAttribute('class') || element.getAttribute('propertytype') || (['object', 'tile'].includes(tag) && element.getAttribute('type')) || (tag === 'property' && element.getAttribute('type') === 'class')) {
      fail('CLASS_DEFAULTS', `${path}: project/custom class defaults cannot be resolved`);
    }
    for (let a = 0; a < element.attributes.length; a++) {
      const attribute = element.attributes[a];
      if (attribute.name.includes(':') || attribute.name.startsWith('xmlns')) fail('XML_NAMESPACE', `${path}: namespaced XML is unsupported`);
      if (!XML_ATTRIBUTES[tag].has(attribute.name)) fail('UNKNOWN_REFERENCE', `${path}: unsupported XML attribute ${attribute.name} on ${tag}`);
      if ((attribute.name === 'source' && !['tileset', 'image'].includes(tag)) || (attribute.name === 'template' && tag !== 'object')) fail('UNKNOWN_REFERENCE', `${path}: unsupported reference-bearing attribute on ${tag}`);
    }
    let reference = null;
    let kind = '';
    if (tag === 'tileset' && element.hasAttribute('source')) { reference = element.getAttribute('source'); kind = 'tileset'; }
    else if (tag === 'image' && element.hasAttribute('source')) { reference = element.getAttribute('source'); kind = 'image'; }
    else if (tag === 'object' && element.hasAttribute('template')) { reference = element.getAttribute('template'); kind = 'template'; }
    if (tag === 'property') {
      const type = element.getAttribute('type') || 'string';
      if (!SCALAR_TYPES.has(type)) fail('PROPERTY_TYPE', `${path}: unsupported property type ${type}`);
      if (type === 'file') {
        // Tiled's streaming reader handles split character tokens differently from textContent.
        // Accept one unambiguous attribute or one plain text node, never fragmented/CDATA values.
        const children = Array.from(element.childNodes);
        if (element.hasAttribute('value')) {
          if (children.some(child => child.nodeType !== 3 || child.nodeValue.trim())) fail('AMBIGUOUS_FILE_VALUE', `${path}: file property mixes value attribute and content`);
          reference = element.getAttribute('value');
        } else {
          if (children.length !== 1 || children[0].nodeType !== 3) {
            if (!children.length) fail('EMPTY_REFERENCE', `${path}: empty file property`);
            fail('AMBIGUOUS_FILE_VALUE', `${path}: file property must contain one plain text node`);
          }
          reference = children[0].nodeValue;
        }
        kind = 'file-property';
      }
    }
    if (tag === 'image' && (!element.hasAttribute('source') || element.getElementsByTagName('data').length)) fail('EMBEDDED_IMAGE', `${path}: embedded image data is unsupported`);
    if (reference !== null) {
      if (!reference || reference === '.') fail('EMPTY_REFERENCE', `${path}: empty/directory ${kind} value`);
      const target = resolveReference(path, reference);
      const ext = extension(target);
      if (kind === 'tileset' && ext !== 'tsx') fail('UNSUPPORTED_FORMAT', `${path}: external tileset must be TSX`);
      if (kind === 'template' && ext !== 'tx') fail('UNSUPPORTED_FORMAT', `${path}: template must be TX`);
      if (kind === 'image' && !IMAGE_TYPES.has(ext) && ext !== 'tmx') fail('UNSUPPORTED_FORMAT', `${path}: unsupported image source ${target}`);
      if (UNSUPPORTED.has(ext)) fail('UNSUPPORTED_FORMAT', `${path}: unsupported dependency ${target}`);
      output.push({from: path, to: target, kind, reference});
    }
  }
  return output;
}
/** Collect only explicit runtime references. No source strings or bytes are changed. */
export function planPackage(input, entry, supplements = []) {
  const files = indexFiles(input);
  validateSegments(entry, false);
  if (extension(entry) !== 'tmx') fail('ENTRY_TYPE', 'Select an XML TMX map');
  if (!Array.isArray(supplements)) fail('INVALID_SUPPLEMENT', 'Supplements must be explicit paths');
  const selected = new Set();
  const edges = [];
  const queue = [entry];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const path = queue[cursor];
    if (selected.has(path)) continue;
    const bytes = files.get(path);
    if (!bytes) fail('MISSING_FILE', `Required file missing: ${path}`);
    selected.add(path);
    if (XML_ROOTS.has(extension(path))) {
      for (const edge of references(path, bytes)) {
        edges.push(edge);
        if (edges.length > LIMITS.references) fail('REFERENCE_LIMIT', 'Too many explicit references');
        queue.push(edge.to);
      }
    }
  }
  // Reject XML dependency cycles rather than shipping recursive metatile/template loops.
  const xmlPaths = [...selected].filter(path => XML_ROOTS.has(extension(path)));
  const indegree = new Map(xmlPaths.map(path => [path, 0]));
  const children = new Map(xmlPaths.map(path => [path, []]));
  for (const {from, to} of edges) if (indegree.has(to)) {
    indegree.set(to, indegree.get(to) + 1);
    children.get(from).push(to);
  }
  const ready = xmlPaths.filter(path => indegree.get(path) === 0);
  for (let i = 0; i < ready.length; i++) for (const next of children.get(ready[i])) {
    indegree.set(next, indegree.get(next) - 1);
    if (indegree.get(next) === 0) ready.push(next);
  }
  if (ready.length !== xmlPaths.length) fail('DEPENDENCY_CYCLE', 'Cyclic XML dependencies are unsupported');
  for (const path of supplements) {
    validateSegments(path, false);
    if (!files.has(path)) fail('MISSING_FILE', `Supplement missing: ${path}`);
    selected.add(path);
  }
  const paths = [...selected].sort();
  return Object.freeze({entry, paths, edges, supplements: [...new Set(supplements)].sort(), files: new Map(paths.map(path => [path, files.get(path)])), excluded: [...files.keys()].filter(path => !selected.has(path)).sort()});
}
