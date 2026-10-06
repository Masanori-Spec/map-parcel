# MapParcel

Native-first feasibility gate for a byte-preserving Tiled map resource packer.

**Status: local closure tests pass; hosted native gate is pending. There is no UI yet.**

MapParcel takes a selected XML `.tmx` map and copies its explicitly referenced dependency closure into a ZIP. Original file paths, GIDs and every source byte stay unchanged. It is a narrow sharing tool, not a complete Tiled project exporter or a game dependency scanner.

## Scope

- Follow external TSX tilesets, image sources, object TX templates, and explicit file-type properties
- Recursively follow TMX/TSX/TX documents reached through any supported reference, including a metatile image whose source is another TMX
- Include other explicit file-property files as opaque byte-preserved leaves
- Support external PNG/JPEG/BMP/GIF/WebP images; native feasibility fixture specifically verifies PNG
- Preserve two same-basename files in separate directories
- Exclude unused files and ordinary string properties
- Include license or attribution files only when explicitly selected as supplements. Packaging grants no rights to share someone else's assets

The caller supplies a selected root directory. References must resolve inside it. Absolute paths, URLs, escaping references, ambiguous/colliding paths, symlinks in the filesystem harness, DTDs/entities, namespaces, recursive XML cycles, embedded images, JSON/world/project/SVG dependencies and unknown XML elements, attributes, placements or processing instructions are rejected. Only the conservative TMX element/attribute vocabulary listed in the source is accepted; scalar properties cannot contain child elements. Nonempty `class`, legacy object/tile `type`, custom `propertytype`, class/list properties are conservatively blocked because their dependencies can live in project defaults. Non-UTF-8 XML and empty/directory file properties are blocked. File-property paths require a value attribute or one plain text node; fragmented text, CDATA and mixed attribute/content values are rejected to avoid consumer parsing differences. Some otherwise valid Tiled inputs are intentionally unsupported.

Limits: 2,048 selected input files, 128 MiB total input, 4 MiB per XML file, 20,000 XML elements, depth 128, and 8,192 explicit references. Paths use relative `/` separators and NFC spelling; portable Windows-invalid characters and device names are rejected.

## Local verification

```sh
npm ci --ignore-scripts
npm run verify
```

This runs unit tests, creates original synthetic assets, writes the selected-map ZIP, and checks it using Python's independent ZIP reader against a literal 16-path set and frozen SHA-256 values. The fixture generator does not write the oracle. No Tiled binary is installed or run locally.

## Hosted native verification

The GitHub Actions workflow downloads the official Tiled 1.12.2 AppImage from its publisher only after checking primary release metadata. It verifies the exact 47,286,776-byte artifact and SHA-256 before extraction or execution. The binary stays in the temporary runner directory and is not a product dependency or an uploaded artifact.

The native gate:

1. Renders the original fixture through official `tmxrasterizer`
2. Checks all 32 pixels against the handwritten 8×4 palette and row oracle
3. Extracts the ZIP into an unrelated directory, removes the generated original input directory, and starts a fresh rasterizer process
4. Checks all relocated pixels against both the handwritten oracle and original native output
5. Removes each of four required PNGs in turn: ground, template object, image layer and metatile image. Each negative control must cause a pixel mismatch, missing image or nonzero exit

Exit status zero alone is never a pass. Artifacts include the ZIP, file/edge manifest, frozen-byte verification report, original/relocated/negative renders, consumer provenance and native report. They exclude vendor binaries.

## Why this exists

Tiled's open [resource-pack request #4446](https://github.com/mapeditor/tiled/issues/4446) describes the problem of gathering external files for sharing. The related [dependency-browser PR #4458](https://github.com/mapeditor/tiled/pull/4458) was open and unmerged at research time (2026-10-06); its reviewed implementation lists and opens dependencies but does not package them. See [research and boundaries](docs/research.md).

No license has been selected for the original software or synthetic fixture assets. Publication for inspection does not grant reuse rights. Input assets retain their own licenses.
