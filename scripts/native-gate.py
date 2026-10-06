#!/usr/bin/env python3
"""Native consumer oracle. Exit 0 by itself is never a pass."""
from pathlib import Path
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import tempfile
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BROWSER_MODE = os.environ.get('MAP_PARCEL_BROWSER_ZIP') == '1'
ART = ROOT / ('artifacts/browser-native' if BROWSER_MODE else 'artifacts/native')
ARCHIVE = ROOT / ('artifacts/browser/browser-selected.zip' if BROWSER_MODE else 'artifacts/selected-map.zip')
ART.mkdir(parents=True, exist_ok=True)
EXPECTED = json.loads((ROOT / 'test/expected-oracle.json').read_text())
PALETTE = EXPECTED['palette']
PIXELS = [tuple(PALETTE[c]) for row in EXPECTED['pixelRows'] for c in row]
assert len(PIXELS) == EXPECTED['width'] * EXPECTED['height']

def read_pixels(path):
    with Image.open(path) as image:
        return image.size, list(image.convert('RGBA').getdata())

def matches_literal(path):
    if not path.is_file():
        return False
    size, pixels = read_pixels(path)
    return size == (EXPECTED['width'], EXPECTED['height']) and pixels == PIXELS

def main():
    assert os.environ.get('GITHUB_ACTIONS') == 'true', 'Native consumer gate is hosted-CI-only'
    app = Path(os.environ['RUNNER_TEMP']) / 'map-parcel-tiled/squashfs-root/AppRun'
    assert app.is_file()
    assert os.environ.get('DISPLAY'), 'Use xvfb-run: the official AppImage includes only the xcb platform plugin'
    env = dict(os.environ, QT_QPA_PLATFORM='xcb')
    runtime = Path(tempfile.mkdtemp(prefix='map-parcel-qt-', dir=os.environ['RUNNER_TEMP']))
    runtime.chmod(0o700)
    env['XDG_RUNTIME_DIR'] = str(runtime)
    # Use the official AppRun dispatch, preserving its runtime environment.
    def render(map_path, output, label):
        output.unlink(missing_ok=True)
        command = [str(app), 'tmxrasterizer', '--no-smoothing', str(map_path), str(output)]
        run = subprocess.run(command, cwd=runtime, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60)
        (ART / f'{label}.log').write_bytes(run.stdout)
        return run.returncode
    spec = importlib.util.spec_from_file_location('verify_package', ROOT / 'scripts/verify-package.py')
    verifier = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(verifier)
    verifier.verify_package(ARCHIVE, ART / 'zip-report.json')
    source = ROOT / 'artifacts/fixture-source'
    original = ART / 'original.png'
    original_code = render(source / EXPECTED['entry'], original, 'original')
    assert original_code == 0, f'Original consumer failed: {original_code}'
    assert matches_literal(original), f'Original render differs from literal 8x4 pixel oracle: {read_pixels(original) if original.is_file() else "no image"}'
    relocated = Path(tempfile.mkdtemp(prefix='unrelated-parcel-', dir=os.environ['RUNNER_TEMP']))
    with zipfile.ZipFile(ARCHIVE) as archive:
        archive.extractall(relocated)
    # This is generated test input only. No user source data is removed.
    shutil.rmtree(source)
    assert not source.exists(), 'Original fixture must be unavailable before relocation render'
    result = ART / 'relocated.png'
    relocated_code = render(relocated / EXPECTED['entry'], result, 'relocated')
    assert relocated_code == 0, f'Relocated consumer failed: {relocated_code}'
    assert matches_literal(result), 'Relocated render differs from literal expected pixels'
    assert read_pixels(result) == read_pixels(original), 'Original and relocated native output differ'
    # Fresh process for each fault. Both basename-colliding PNGs, image layer, and metatile dependency must matter.
    controls = []
    for index, required in enumerate(['art/ground/sprite.png', 'art/objects/sprite.png', 'art/layers/overlay.png', 'art/meta/pixel.png']):
        png = relocated / required
        content = png.read_bytes()
        png.unlink()
        assert not png.exists()
        output = ART / f'negative-{index}.png'
        code = render(relocated / EXPECTED['entry'], output, f'negative-{index}')
        mismatch = not matches_literal(output)
        assert code != 0 or mismatch, f'Negative control silently passed after removing {required}'
        controls.append({'removed': required, 'exitCode': code, 'pixelMismatchOrMissing': mismatch, 'caught': True})
        png.write_bytes(content)
    report = {'status': 'PASS', 'inputZIPSource': 'actual sandboxed browser download' if BROWSER_MODE else 'core harness', 'inputZIP_SHA256': hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(), 'consumer': 'Official Tiled 1.12.2 AppImage tmxrasterizer', 'entry': EXPECTED['entry'], 'expectedDimensions': [8, 4], 'literalPixelRows': EXPECTED['pixelRows'], 'all32PixelsMatchLiteral': True, 'originalAndRelocatedPixelsIdentical': True, 'originalInputUnavailable': not source.exists(), 'relocatedToUnrelatedDirectory': True, 'negativeControls': controls, 'exitZeroAloneAccepted': False, 'renderSHA256': hashlib.sha256(result.read_bytes()).hexdigest()}
    (ART / 'native-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        (ART / 'native-report.json').write_text(json.dumps({'status': 'FAIL', 'reason': str(error)}, indent=2) + '\n')
        raise
