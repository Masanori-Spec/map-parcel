# Research and feasibility boundaries

Checked 2026-10-06 against primary Tiled sources. This is a bounded workflow difference, not a novelty or patent claim.

## Existing alternatives

- [Tiled issue #4446](https://github.com/mapeditor/tiled/issues/4446): asks for a self-contained resource ZIP for sharing maps with external files
- [Tiled PR #4458](https://github.com/mapeditor/tiled/pull/4458): dependency listing/navigation; open and unmerged at research time, no copy/ZIP action in the reviewed change
- [Tilepack](https://github.com/skhoroshavin/pixel-tools#tilepack): rebuilds used tiles into an atlas and TMJ output; a different output contract
- [TiledExportExtensions](https://github.com/RobLoach/TiledExportExtensions): embeds image data using a nonstandard attribute; a different output contract

MapParcel's scope is a selected map's explicit file closure, with original layout and bytes. It does not rename assets, combine atlases, rewrite GIDs, or infer arbitrary application references.

## Primary format/consumer references

- [TMX format](https://doc.mapeditor.org/en/stable/reference/tmx-map-format/): external tilesets, images, templates, file properties and classes
- [ImageCache at v1.12.2](https://github.com/mapeditor/tiled/blob/v1.12.2/src/libtiled/imagecache.cpp): failed image reads can be followed by map rendering, so TMX image dependencies must recurse
- [Official AppRun](https://github.com/mapeditor/tiled/blob/v1.12.2/dist/linux/AppRun): dispatches `tmxrasterizer` as a bundled command
- [Rasterizer main](https://github.com/mapeditor/tiled/blob/v1.12.2/src/tmxrasterizer/main.cpp): command line, template plugin registration and default layer handling
- [Rasterizer implementation](https://github.com/mapeditor/tiled/blob/v1.12.2/src/tmxrasterizer/tmxrasterizer.cpp): rendering is not an exhaustive dependency validation contract
- [Official release](https://github.com/mapeditor/tiled/releases/tag/v1.12.2)
- [Primary asset metadata](https://api.github.com/repos/mapeditor/tiled/releases/tags/v1.12.2)

Pinned consumer: `Tiled-1.12.2_Linux_x86_64.AppImage`, SHA-256 `5e0edbff61314f41af3c72c21ec006b363cf12047cc9cfb5bbd63a98bca3721c`, 47,286,776 bytes. The fetch script rechecks official metadata and downloaded bytes in hosted CI before execution.

## Honest verification claims

The gate's PNG fixture covers external TSX, external object TX and its TSX, colliding basenames in distinct folders, an image layer, a TSX metatile image referencing another TMX, an inline nested tileset image, explicit file properties, recursive file-property XML, and unused assets.

The independent oracle is `test/expected-oracle.json`: a manually enumerated exact path set, independently frozen source SHA-256 values, a literal palette and handwritten pixel rows. The fixture generator never derives or writes that oracle. Python's ZIP reader checks every archive member and its bytes independently of the JavaScript resolver/ZIP writer.

No claim is made that all Tiled render features, custom types, project defaults, scripts, exported game dependencies, or every raster format are covered. Rejected inputs cannot be described as complete packages. Optional supplement selection copies bytes and does not provide asset licenses.
