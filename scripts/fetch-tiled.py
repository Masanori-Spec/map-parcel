#!/usr/bin/env python3
"""Hosted-CI-only official, pinned Tiled consumer. Never included in public payload."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PIN = json.loads((ROOT / 'scripts/tiled-release.json').read_text())
HOSTS = {'api.github.com', 'github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'}

def allowed(url):
    p = urllib.parse.urlsplit(url)
    return p.scheme == 'https' and p.hostname in HOSTS and p.port in (None, 443) and not p.username and not p.password

class RestrictedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        if not allowed(newurl):
            raise RuntimeError('Unexpected download redirect host; stopped before following')
        return super().redirect_request(request, fp, code, msg, headers, newurl)

def main():
    if not os.environ.get('GITHUB_ACTIONS') == 'true' or not os.environ.get('RUNNER_TEMP'):
        raise RuntimeError('Official AppImage runs only in hosted GitHub Actions for this gate')
    folder = Path(os.environ['RUNNER_TEMP']) / 'map-parcel-tiled'
    folder.mkdir(parents=True, exist_ok=True)
    opener = urllib.request.build_opener(RestrictedRedirect())
    request = urllib.request.Request(PIN['release_api_url'], headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'MapParcel-native-gate'})
    with opener.open(request, timeout=60) as response:
        release = json.loads(response.read(2 * 1024 * 1024))
    assert release['tag_name'] == 'v' + PIN['version'] and not release['draft'] and not release['prerelease']
    asset = next(a for a in release['assets'] if a['name'] == PIN['asset']['name'])
    assert asset['browser_download_url'] == PIN['asset']['url']
    assert asset['digest'] == 'sha256:' + PIN['asset']['sha256']
    assert asset['size'] == PIN['asset']['size']
    url = PIN['asset']['url']
    assert allowed(url)
    binary = folder / PIN['asset']['name']
    digest = hashlib.sha256()
    size = 0
    with opener.open(url, timeout=120) as response, binary.open('wb') as out:
        assert allowed(response.url)
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            assert size <= PIN['asset']['size'], 'Download exceeds pinned size'
            digest.update(chunk)
            out.write(chunk)
    assert digest.hexdigest() == PIN['asset']['sha256'] and size == PIN['asset']['size'], 'Official binary pin mismatch; not executed'
    binary.chmod(0o755)
    with (folder / 'extract.log').open('wb') as log:
        subprocess.run([str(binary), '--appimage-extract'], cwd=folder, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=180)
    assert (folder / 'squashfs-root/AppRun').is_file()
    assert (folder / 'squashfs-root/usr/bin/tmxrasterizer').is_file()
    evidence = ROOT / 'artifacts/native'
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / 'official-consumer-pin.json').write_text(json.dumps({**PIN, 'actualSHA256': digest.hexdigest(), 'actualSize': size, 'metadataVerifiedBeforeExecution': True, 'binaryVerifiedBeforeExecution': True}, indent=2) + '\n')
    print(f'Verified official Tiled {PIN["version"]} AppImage: {size} bytes, {digest.hexdigest()}')

if __name__ == '__main__':
    main()
