#!/usr/bin/env python3
"""Original, tiny assets for the native gate. This never generates the oracle."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / 'artifacts' / 'fixture-source'
ROOT.mkdir(parents=True, exist_ok=True)

def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content if isinstance(content, bytes) else content.encode('utf-8'))

def png(width, height, color):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    raw = b''.join(b'\0' + bytes(color) * width for _ in range(height))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

write('maps/selected.tmx', '''<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="4" height="2" tilewidth="2" tileheight="2" infinite="0" backgroundcolor="#101820" nextlayerid="4" nextobjectid="2">
 <properties>
  <property name="settings" type="file" value="../data/settings.txt"/>
  <property name="extraExplicitTileset" type="file" value="../extras/property.tsx"/>
  <property name="ordinaryStringIsNotAPath" value="../unused/secret.txt"/>
 </properties>
 <tileset firstgid="1" source="../tiles/ground.tsx"/>
 <tileset firstgid="2" source="../tiles/meta.tsx"/>
 <layer id="1" name="Ground and metatile" width="4" height="2"><data encoding="csv">1,0,2,0,
1,0,0,0</data></layer>
 <objectgroup id="2" name="Template tile"><object id="1" template="../templates/marker.tx" x="2" y="2"/></objectgroup>
 <imagelayer id="3" name="Overlay" offsetx="6" offsety="2"><image source="../art/layers/overlay.png" width="2" height="2"/></imagelayer>
</map>
''')
write('tiles/ground.tsx', '''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="Ground" tilewidth="2" tileheight="2" tilecount="1" columns="1">
 <properties><property name="tileNote" type="file" value="../data/tile-note.txt"/></properties>
 <image source="../art/ground/sprite.png" width="2" height="2"/>
</tileset>
''')
write('tiles/objects/marker.tsx', '''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="Marker" tilewidth="2" tileheight="2" tilecount="1" columns="1"><image source="../../art/objects/sprite.png" width="2" height="2"/></tileset>
''')
write('templates/marker.tx', '''<?xml version="1.0" encoding="UTF-8"?>
<template>
 <tileset firstgid="1" source="../tiles/objects/marker.tsx"/>
 <object name="Yellow marker" gid="1" width="2" height="2">
  <properties><property name="templateNote" type="file" value="../data/template-note.txt"/></properties>
 </object>
</template>
''')
write('tiles/meta.tsx', '''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="Meta" tilewidth="2" tileheight="2" tilecount="1" columns="0"><grid orientation="orthogonal" width="1" height="1"/><tile id="0"><image width="2" height="2" source="../metamaps/mini.tmx"/></tile></tileset>
''')
write('metamaps/mini.tmx', '''<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="2" height="2" tilewidth="1" tileheight="1" infinite="0" nextlayerid="2" nextobjectid="1">
 <tileset firstgid="1" name="Meta pixels" tilewidth="1" tileheight="1" tilecount="1" columns="1"><image source="../art/meta/pixel.png" width="1" height="1"/></tileset>
 <layer id="1" name="Diagonal" width="2" height="2"><data encoding="csv">1,0,
0,1</data></layer>
</map>
''')
write('extras/property.tsx', '''<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="Explicit property dependency" tilewidth="1" tileheight="1" tilecount="1" columns="1">
 <properties><property name="chain" type="file" value="../data/chain.txt"/></properties>
 <image source="../art/property/pixel.png" width="1" height="1"/>
</tileset>
''')
write('data/settings.txt', 'Only this explicitly referenced settings file belongs to the package.\n')
write('data/tile-note.txt', 'Tile metadata is an explicit file property.\n')
write('data/template-note.txt', 'Template metadata follows the template file location.\n')
write('data/chain.txt', 'Recursive XML file-property dependencies are included.\n')
write('art/ground/sprite.png', png(2, 2, (230, 40, 60, 255)))
write('art/objects/sprite.png', png(2, 2, (250, 210, 30, 255)))
write('art/layers/overlay.png', png(2, 2, (210, 40, 220, 255)))
write('art/meta/pixel.png', png(1, 1, (20, 210, 100, 255)))
write('art/property/pixel.png', png(1, 1, (20, 180, 230, 255)))
write('unused/sprite.png', png(1, 1, (100, 100, 100, 255)))
write('unused/unused.tsx', '<tileset name="Unused"><image source="sprite.png"/></tileset>\n')
write('unused/secret.txt', 'An arbitrary string does not make this a dependency.\n')
write('NOTICE-assets.txt', 'Original synthetic gate fixture attribution note. No license grant is made.\n')
print(f'Created original fixture at {ROOT}')
