import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASES_DIR = ROOT / 'docs' / 'data' / 'cases'
REQUIRED_TOP_LEVEL = {
    'case_id', 'date_created', 'csr', 'customer_reference', 'system',
    'symptoms', 'symptom_details', 'troubleshooting_done', 'resolution'
}


def main() -> int:
    bad = False
    for path in sorted(CASES_DIR.glob('*.json')):
      data = json.loads(path.read_text(encoding='utf-8'))
      missing = REQUIRED_TOP_LEVEL - set(data.keys())
      if missing:
          print(f'{path.name}: missing fields: {sorted(missing)}')
          bad = True
      else:
          print(f'{path.name}: OK')
    return 1 if bad else 0


if __name__ == '__main__':
    raise SystemExit(main())
