# Verification record

## Native feasibility: passed

- Exact commit: `8c08f7df0f52acd871a88f83098d2397e1abacf9`
- [GitHub Actions run 37422232310](https://github.com/Masanori-Spec/map-parcel/actions/runs/37422232310)
- Actual downloaded artifact SHA-256: `74187df6561d96b5cd8a229f90f0fb6741dd83bb3e7c99ec7f95dd5109354d4f`
- 60 core tests and independent 16-file ZIP path/hash checks passed
- Official Tiled 1.12.2 AppImage metadata, exact size and SHA-256 verified before execution
- Original and relocated selected map each matched all 32 handwritten RGBA pixels
- The generated original input directory was removed before relocated rendering
- Four required PNG removals all returned consumer exit status 0, but each changed pixels and was caught: ground (8 changed pixels), template object (4), image layer (4), nested metatile image (2)
- An independent reviewer checked the downloaded ZIP, pixel arrays, negative images and release pin

Initial runner launches exposed missing system EGL libraries and an AppImage containing only the `xcb` Qt platform plugin. The final gate uses standard Ubuntu runtime libraries plus Xvfb. No native assertions were weakened and no security settings were changed.

## UI/browser gate: passed

- Exact runtime commit: `d79b5e88674b7d6f64ff6f78a02a758f703e62d2`
- [Browser-to-Tiled run 37425815870](https://github.com/Masanori-Spec/map-parcel/actions/runs/37425815870)
- [Native core run 37425815915](https://github.com/Masanori-Spec/map-parcel/actions/runs/37425815915)
- Both runs succeeded; 62 core tests and 19 actual browser scenarios passed
- Sandboxed Chrome was explicitly requested and its process command verified without `--no-sandbox`
- Offline file loading and saved-HTML reopening produced no HTTP requests and no page errors
- A keyboard-selected real directory produced the actual browser ZIP used by the native gate
- The independent ZIP reader checked exact 16-file closure, all original bytes and frozen SHA-256 values; a second 17-file ZIP checked explicit supplement selection
- The independent receipt checker required exact ZIP-member coverage, byte lengths/hashes, explicit supplement reasons and four literal reference reasons
- Original and relocated official Tiled renders matched all 32 literal pixels. The source input directory was unavailable before relocation. Four missing-PNG controls returned exit 0 but changed 8/4/4/2 pixels, all caught
- Japanese/English 390px and 320px layouts, keyboard controls, rejection states, delayed import/export cancellation and two one-page print PDFs were reviewed
- The hosted HTML was byte-identical to the reviewed offline bundle
- Independent source and final visual/native evidence review accepted this runtime

Small, actual hosted [evidence files](evidence/provenance.json), [browser report](evidence/browser-report.json), [independent ZIP/receipt report](evidence/independent-browser-report.json), [native report](evidence/browser-native-report.json), [release pin](evidence/official-consumer-pin.json), [desktop screenshot](evidence/desktop-en.png) and [Japanese mobile screenshot](evidence/mobile-ja.png) are retained in the repository. Their provenance identifies the runtime commit; the documentation closeout changes no runtime bytes.

The first browser attempt stopped because Playwright rejects an empty `setInputFiles` array for directory inputs. The test now accurately uses a dispatched empty change event; it does not claim to automate native OS dialog cancellation. An initially offscreen skip link was made fully clipped until focused, and a duplicate folder focus outline was removed. The final evidence verifies both corrections.

The tested closure remains narrow: XML TMX/TSX/TX explicit references, PNG native render fixtures and preserved bytes. It is not a complete Tiled project or arbitrary game dependency checker, and no asset rights are granted.
