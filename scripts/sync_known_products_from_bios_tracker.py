from __future__ import annotations

import json
from pathlib import Path
import sys

import yaml

VENDOR_LABELS = {
    "asus": "ASUS",
    "msi": "MSI",
    "gigabyte": "Gigabyte",
    "asrock": "ASRock",
}


def extract_motherboards(config_path: Path) -> list[dict[str, object]]:
    config = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    vendors = config.get("vendors", {})
    groups: list[dict[str, object]] = []

    for vendor_key, label in VENDOR_LABELS.items():
        items = [entry.get("name", "").strip() for entry in vendors.get(vendor_key, []) if isinstance(entry, dict)]
        items = [item for item in items if item]
        if items:
            groups.append({"group": label, "items": items})

    return groups


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/sync_known_products_from_bios_tracker.py path/to/config.yml")
        return 1

    config_path = Path(sys.argv[1])
    output_path = Path("docs/data/known-products.json")

    if not config_path.exists():
        print(f"Config not found: {config_path}")
        return 1

    if not output_path.exists():
        print(f"Known products file not found: {output_path}")
        return 1

    known_products = json.loads(output_path.read_text(encoding="utf-8"))
    known_products["motherboards"] = extract_motherboards(config_path)
    output_path.write_text(json.dumps(known_products, indent=2), encoding="utf-8")

    total = sum(len(group["items"]) for group in known_products["motherboards"])
    print(f"Updated motherboard list from BIOS tracker config: {total} boards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
