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

## UI/browser gate: pending hosted verification

The workflow is implemented to test a sandboxed browser with offline folder import, actual ZIP and receipt downloads, stale operation cancellation, safe rejection, mobile layout, keyboard controls and print content. The native stage consumes the actual browser-downloaded selected ZIP, with the same independent path/hash and pixel/fault oracles. These tests must pass at the publication commit before calling the UI verified.

The tested closure remains narrow: XML TMX/TSX/TX explicit references, PNG native render fixtures and preserved bytes. It is not a complete Tiled project or arbitrary game dependency checker, and no asset rights are granted.
