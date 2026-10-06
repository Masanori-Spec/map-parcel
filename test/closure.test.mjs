import test from 'node:test';
import assert from 'node:assert/strict';
import { planPackage, resolveReference, ParcelError, LIMITS } from '../src/closure.mjs';
import { zipStore } from '../src/zip-store.mjs';
const bytes = text => new TextEncoder().encode(text);
const files = text => new Map([['maps/main.tmx', bytes(text)]]);
const code = expected => error => error instanceof ParcelError && error.code === expected;

test('XML source bytes remain untouched and references resolve from containing document', () => {
  const map = bytes('<?xml version="1.0"?><map><tileset source="../tile/a.tsx"/></map>');
  const tile = bytes('<tileset><image source="../img/a.png"/></tileset>');
  const image = new Uint8Array([0, 255, 1, 2]);
  const input = new Map([['maps/main.tmx', map], ['tile/a.tsx', tile], ['img/a.png', image], ['unused.png', image]]);
  const plan = planPackage(input, 'maps/main.tmx');
  assert.deepEqual(plan.paths, ['img/a.png', 'maps/main.tmx', 'tile/a.tsx']);
  assert.deepEqual(plan.excluded, ['unused.png']);
  assert.deepEqual(plan.files.get('maps/main.tmx'), map);
  assert.deepEqual(plan.files.get('tile/a.tsx'), tile);
  assert.deepEqual(zipStore(plan), zipStore(plan));
});

test('same-basename images remain separate', () => {
  const input = files('<map><imagelayer><image source="../a/sprite.png"/></imagelayer><imagelayer><image source="../b/sprite.png"/></imagelayer></map>');
  input.set('a/sprite.png', bytes('a')); input.set('b/sprite.png', bytes('b'));
  assert.deepEqual(planPackage(input, 'maps/main.tmx').paths, ['a/sprite.png', 'b/sprite.png', 'maps/main.tmx']);
});

test('external templates, their tilesets and typed file-property XML recurse', () => {
  const input = files('<map><objectgroup><object template="../objects/a.tx"/></objectgroup><properties><property type="file" value="../extra.tsx"/></properties></map>');
  input.set('objects/a.tx', bytes('<template><tileset source="../t.tsx"/><object/></template>'));
  input.set('t.tsx', bytes('<tileset><image source="a.png"/></tileset>'));
  input.set('extra.tsx', bytes('<tileset><properties><property type="file">note.txt</property></properties></tileset>'));
  input.set('a.png', bytes('image')); input.set('note.txt', bytes('note'));
  assert.equal(planPackage(input, 'maps/main.tmx').paths.length, 6);
});

test('metatile map-as-image recursively pulls nested images', () => {
  const input = files('<map><tileset source="../a.tsx"/></map>');
  input.set('a.tsx', bytes('<tileset><tile><image source="b.tmx"/></tile></tileset>'));
  input.set('b.tmx', bytes('<map><imagelayer><image source="c.png"/></imagelayer></map>')); input.set('c.png', bytes('pixel'));
  assert.equal(planPackage(input, 'maps/main.tmx').paths.length, 4);
});

test('ordinary strings are never inferred as dependencies; supplements need explicit selection', () => {
  const input = files('<map><properties><property value="../secret.txt"/></properties></map>');
  input.set('secret.txt', bytes('secret')); input.set('LICENSE.txt', bytes('license'));
  assert.deepEqual(planPackage(input, 'maps/main.tmx').paths, ['maps/main.tmx']);
  assert.deepEqual(planPackage(input, 'maps/main.tmx', ['LICENSE.txt']).paths, ['LICENSE.txt', 'maps/main.tmx']);
});

test('reject missing files and incorrect source document roots', () => {
  assert.throws(() => planPackage(files('<map><imagelayer><image source="none.png"/></imagelayer></map>'), 'maps/main.tmx'), code('MISSING_FILE'));
  assert.throws(() => planPackage(files('<tileset/>'), 'maps/main.tmx'), code('WRONG_XML_ROOT'));
});

for (const path of ['/etc/passwd', 'https://example.com/a.png', 'C:/secret.png', '\\\\server\\a.png', 'a%2fb.png', 'a?.png', 'a/../.. /a.png', 'NUL.png']) {
  test(`reject unsafe reference ${JSON.stringify(path)}`, () => assert.throws(() => resolveReference('maps/main.tmx', path), code('UNSAFE_PATH')));
}
test('reject root escape but preserve safe parent traversal', () => {
  assert.throws(() => resolveReference('maps/main.tmx', '../../secret.png'), code('ROOT_ESCAPE'));
  assert.equal(resolveReference('maps/main.tmx', '../art/a.png'), 'art/a.png');
});
for (const [a, b] of [['A.png', 'a.png'], ['Art/a.png', 'art/b.png'], ['a', 'a/b']]) {
  test(`reject case or file-directory collision: ${a} / ${b}`, () => {
    const input = files('<map/>'); input.set(a, bytes('a')); input.set(b, bytes('b'));
    assert.throws(() => planPackage(input, 'maps/main.tmx'), code('PATH_COLLISION'));
  });
}
for (const xml of ['<map class="Enemy"/>', '<map><objectgroup><object type="Enemy"/></objectgroup></map>', '<map><tileset><tile type="Terrain"/></tileset></map>', '<map><properties><property type="class"/></properties></map>', '<map><properties><property propertytype="NamedEnum"/></properties></map>']) {
  test(`reject project/class defaults: ${xml}`, () => assert.throws(() => planPackage(files(xml), 'maps/main.tmx'), code('CLASS_DEFAULTS')));
}
for (const xml of ['<!DOCTYPE map [<!ENTITY x SYSTEM "file:///etc/passwd">]><map/>', '<!DOCTYPE map><map/>']) {
  test('reject DTD/entity XML before parsing', () => assert.throws(() => planPackage(files(xml), 'maps/main.tmx'), code('XML_DOCTYPE')));
}
for (const xml of ['<map><image></map>', '<map a="1" a="2"/>', '<map>&bad;</map>', '<map/><map/>']) {
  test(`reject malformed XML: ${xml}`, () => assert.throws(() => planPackage(files(xml), 'maps/main.tmx'), code('INVALID_XML')));
}
for (const xml of ['<map><properties><property type="file"/></properties></map>', '<map><properties><property type="file" value="."/></properties></map>', '<map><imagelayer><image source=""/></imagelayer></map>']) {
  test('reject empty/directory references', () => assert.throws(() => planPackage(files(xml), 'maps/main.tmx'), code('EMPTY_REFERENCE')));
}
for (const xml of ['<map><tileset source="a.tsj"/></map>', '<map><imagelayer><image source="a.svg"/></imagelayer></map>', '<map><objectgroup><object template="a.json"/></objectgroup></map>', '<map><properties><property type="file" value="a.tiled-project"/></properties></map>']) {
  test(`reject unsupported dependency formats: ${xml}`, () => assert.throws(() => planPackage(files(xml), 'maps/main.tmx'), code('UNSUPPORTED_FORMAT')));
}
test('reject unsupported list properties and embedded image content', () => {
  assert.throws(() => planPackage(files('<map><properties><property type="list"/></properties></map>'), 'maps/main.tmx'), code('PROPERTY_TYPE'));
  assert.throws(() => planPackage(files('<map><imagelayer><image><data>abc</data></image></imagelayer></map>'), 'maps/main.tmx'), code('EMBEDDED_IMAGE'));
});
test('reject invalid UTF8 and non-UTF8 declarations', () => {
  assert.throws(() => planPackage(new Map([['maps/main.tmx', new Uint8Array([255])]]), 'maps/main.tmx'), code('XML_ENCODING'));
  assert.throws(() => planPackage(files('<?xml version="1.0" encoding="UTF-16"?><map/>'), 'maps/main.tmx'), code('XML_ENCODING'));
});
test('reject namespaces and resource limit overruns', () => {
  assert.throws(() => planPackage(files('<map xmlns="urn:x"/>'), 'maps/main.tmx'), code('XML_NAMESPACE'));
  assert.throws(() => planPackage(files('<map>' + ' '.repeat(LIMITS.xmlBytes) + '</map>'), 'maps/main.tmx'), code('XML_LIMIT'));
  const many = new Map(Array.from({length: LIMITS.files + 1}, (_, i) => [`a${i}`, new Uint8Array()]));
  assert.throws(() => planPackage(many, 'maps/main.tmx'), code('INPUT_LIMIT'));
});

test('reject XML dependency cycles', () => {
  const input = files('<map><properties><property type="file" value="../other.tmx"/></properties></map>');
  input.set('other.tmx', bytes('<map><properties><property type="file" value="maps/main.tmx"/></properties></map>'));
  assert.throws(() => planPackage(input, 'maps/main.tmx'), code('DEPENDENCY_CYCLE'));
});
test('reject unknown reference-bearing attributes', () => {
  assert.throws(() => planPackage(files('<map><extension source="a.png"/></map>'), 'maps/main.tmx'), code('UNKNOWN_REFERENCE'));
});
test('predefined and numeric entities use XML-decoded references', () => {
  const input = files('<map><properties><property type="file" value="../a&amp;b&#46;txt"/></properties></map>');
  input.set('a&b.txt', bytes('text'));
  assert.deepEqual(planPackage(input, 'maps/main.tmx').paths, ['a&b.txt', 'maps/main.tmx']);
});
test('XML depth and element count are bounded before DOM allocation', () => {
  assert.throws(() => planPackage(files('<map>' + '<group>'.repeat(130) + '</group>'.repeat(130) + '</map>'), 'maps/main.tmx'), code('XML_LIMIT'));
  assert.throws(() => planPackage(files('<map>' + '<object/>'.repeat(LIMITS.xmlElements) + '</map>'), 'maps/main.tmx'), code('XML_LIMIT'));
});

for (const xml of ['<map>\u0000</map>', '<map>&#0;</map>', '<map>&#xD800;</map>', '<map>&#x110000;</map>', '<map>\uFFFE</map>']) {
  test('reject forbidden XML1.0 characters and numeric references', () => assert.throws(() => planPackage(files(xml), 'maps/main.tmx'), code('INVALID_XML')));
}
for (const xml of ['<map><extension href="missing.png"/></map>', '<map><include href="missing.tmx"/></map>', '<?resource file="missing.tmx"?><map/>', '<map href="missing.tmx"/>']) {
  test('reject unknown XML elements, attributes and processing instructions', () => assert.throws(() => planPackage(files(xml), 'maps/main.tmx'), code('UNKNOWN_REFERENCE')));
}
test('reject embedded image data even when source is also present', () => {
  assert.throws(() => planPackage(files('<map><imagelayer><image source="a.png"><data>abc</data></image></imagelayer></map>'), 'maps/main.tmx'), code('EMBEDDED_IMAGE'));
});

test('reject XML elements hidden inside ordinary scalar property content', () => {
  const input = files('<map><properties><property type="string"><tileset source="secret.tsx"/></property></properties></map>');
  input.set('maps/secret.tsx', bytes('<tileset/>'));
  assert.throws(() => planPackage(input, 'maps/main.tmx'), code('UNKNOWN_REFERENCE'));
});
test('reject mixed element text and contradictory external tileset children', () => {
  assert.throws(() => planPackage(files('<map>unexpected</map>'), 'maps/main.tmx'), code('INVALID_XML'));
  assert.throws(() => planPackage(files('<map><tileset source="a.tsx"><image source="a.png"/></tileset></map>'), 'maps/main.tmx'), code('UNKNOWN_REFERENCE'));
});
test('reject conservative Unicode case-fold collision', () => {
  const input = files('<map/>'); input.set('σ.png', bytes('a')); input.set('ς.png', bytes('b'));
  assert.throws(() => planPackage(input, 'maps/main.tmx'), code('PATH_COLLISION'));
});

for (const value of ['prefix<![CDATA[secret.txt]]>', 'prefix<!--split-->secret.txt', '<![CDATA[secret.txt]]>']) {
  test('reject fragmented file-property text that native readers interpret differently', () => {
    const input = files(`<map><properties><property type="file">${value}</property></properties></map>`);
    assert.throws(() => planPackage(input, 'maps/main.tmx'), code('AMBIGUOUS_FILE_VALUE'));
  });
}
test('reject file property with mixed attribute and content', () => {
  assert.throws(() => planPackage(files('<map><properties><property type="file" value="a.txt">b.txt</property></properties></map>'), 'maps/main.tmx'), code('AMBIGUOUS_FILE_VALUE'));
});
