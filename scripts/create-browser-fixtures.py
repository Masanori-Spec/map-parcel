#!/usr/bin/env python3
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'artifacts/fixture-source'
base=ROOT/'artifacts/browser-inputs'
base.mkdir(parents=True,exist_ok=True)
for name in ['missing','outside','class-default','case-collision','malformed','fragmented']:
 target=base/name
 if target.exists():shutil.rmtree(target)
 shutil.copytree(source,target)
 entry=target/'maps/selected.tmx'
 text=entry.read_text()
 if name=='missing':(target/'art/ground/sprite.png').unlink()
 elif name=='outside':entry.write_text(text.replace('../tiles/ground.tsx','../../outside.tsx'))
 elif name=='class-default':entry.write_text(text.replace('<map version=','<map class="ProjectClass" version='))
 elif name=='case-collision':(target/'art/ground/SPRITE.png').write_bytes((target/'art/ground/sprite.png').read_bytes())
 elif name=='malformed':entry.write_text('<map>\u0000</map>')
 elif name=='fragmented':entry.write_text(text.replace('<property name="settings" type="file" value="../data/settings.txt"/>','<property name="settings" type="file">prefix<![CDATA[secret.txt]]></property>'))
print('Created browser rejection fixtures')
