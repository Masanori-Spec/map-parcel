#!/usr/bin/env python3
"""Verify actual browser download bytes with a separate standard-library ZIP reader."""
from pathlib import Path
import hashlib,json,zipfile,subprocess
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts/browser'
expected=json.loads((ROOT/'test/expected-oracle.json').read_text())
report=json.loads((ART/'browser-report.json').read_text())
assert report['status']=='PASS' and report['sandboxCommandVerified'] and not report['pageErrors'] and not report['networkRequests']
for zipname,receiptname,supplements in [('browser-selected.zip','browser-receipt.json',[]),('browser-with-supplement.zip','browser-supplement-receipt.json',['NOTICE-assets.txt'])]:
 data=(ART/zipname).read_bytes();receipt=json.loads((ART/receiptname).read_text())
 with zipfile.ZipFile(ART/zipname) as archive:
  assert sorted(archive.namelist())==sorted(expected['paths']+supplements)
  assert len(archive.namelist())==len(set(archive.namelist()))
  assert archive.testzip() is None
  for path in expected['paths']:
   assert hashlib.sha256(archive.read(path)).hexdigest()==expected['hashes'][path]
   assert archive.read(path)==(ROOT/'artifacts/fixture-source'/path).read_bytes()
  for path in supplements:assert archive.read(path)==(ROOT/'artifacts/fixture-source'/path).read_bytes()
  assert sorted(entry['path'] for entry in receipt['files'])==sorted(archive.namelist()), 'Receipt must cover every ZIP member exactly once'
  for entry in receipt['files']:
   original=archive.read(entry['path'])
   assert entry['sha256']==hashlib.sha256(original).hexdigest() and entry['bytes']==len(original)
   if entry['path'] in supplements:assert {'kind':'explicit-supplement'} in entry['reasons']
  literal_reasons={
   'art/ground/sprite.png':{'from':'tiles/ground.tsx','kind':'image','reference':'../art/ground/sprite.png'},
   'art/objects/sprite.png':{'from':'tiles/objects/marker.tsx','kind':'image','reference':'../../art/objects/sprite.png'},
   'metamaps/mini.tmx':{'from':'tiles/meta.tsx','kind':'image','reference':'../metamaps/mini.tmx'},
   'data/settings.txt':{'from':'maps/selected.tmx','kind':'file-property','reference':'../data/settings.txt'}
  }
  receipt_by_path={entry['path']:entry for entry in receipt['files']}
  for path,reason in literal_reasons.items():assert reason in receipt_by_path[path]['reasons']
 assert receipt['zip']['sha256']==hashlib.sha256(data).hexdigest() and receipt['zip']['bytes']==len(data)
 assert receipt['supplements']==supplements and receipt['sourceBytesUnchanged'] and not receipt['pathRewrites']
for lang in ['ja','en']:
 pdf=ART/f'review-{lang}.pdf';text=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True)
 assert 'MapParcel' in text and 'maps/selected.tmx' in text
 for path in expected['paths']:assert path in text, (lang,path)
 (ART/f'review-{lang}.txt').write_text(text)
 subprocess.run(['pdftoppm','-png','-r','100',str(pdf),str(ART/f'print-{lang}')],check=True)
(ART/'independent-browser-report.json').write_text(json.dumps({'status':'PASS','actualZIPsChecked':2,'literalRequiredPaths':16,'originalBytesAndFrozenHashesMatch':True,'receiptHashesMatchActualDownload':True,'explicitSupplementOnly':True,'printPathsVerified':['ja','en']},indent=2)+'\n')
print('PASS actual browser ZIPs, receipts, supplements and print path content')
