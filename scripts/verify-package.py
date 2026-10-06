#!/usr/bin/env python3
"""Independent ZIP reader; literal expected path/hash oracle, no product imports."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def verify_package():
    expected = json.loads((ROOT / 'test/expected-oracle.json').read_text())
    source = ROOT / 'artifacts/fixture-source'
    with zipfile.ZipFile(ROOT / 'artifacts/selected-map.zip') as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)), 'Duplicate ZIP entries'
        assert sorted(names) == expected['paths'], f'Wrong closure: {sorted(names)}'
        assert set(expected['hashes']) == set(expected['paths']), 'Oracle hashes must cover exact literal path set'
        for name in expected['paths']:
            data = archive.read(name)
            assert data == (source / name).read_bytes(), f'Source bytes changed: {name}'
            assert hashlib.sha256(data).hexdigest() == expected['hashes'][name], f'Frozen digest mismatch: {name}'
        assert not set(names) & set(expected['excluded']), 'Unused/supplemental file leaked into closure'
        assert archive.testzip() is None, 'ZIP CRC mismatch'
    report = {'status': 'PASS', 'entry': expected['entry'], 'fileCount': len(names), 'paths': names, 'independentReader': 'Python standard-library zipfile', 'sourceBytesUnchanged': True, 'literalPathSetMatches': True, 'frozenSHA256Matches': True, 'unusedFilesExcluded': True}
    (ROOT / 'artifacts/zip-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('PASS: exact 16-file closure, all source bytes and frozen SHA256 values match')
    return report

if __name__ == '__main__':
    verify_package()
