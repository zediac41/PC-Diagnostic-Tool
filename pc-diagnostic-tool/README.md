# PC Diagnostic Tool

Simple GitHub Pages-based internal troubleshooting logger.

## Version 1 includes
- Static web UI in `docs/`
- JSON rule-based suggestions
- JSON case export
- Sample case history
- Simple case search

## Local testing
From the repo root, run a simple local web server:

```bash
python -m http.server 8000
```

Then open:
- `http://localhost:8000/docs/`

## How to use
1. Fill out the case form.
2. Click **Refresh Suggestions**.
3. Click **Export JSON** to save the case.
4. Put saved case files into `docs/data/cases/`.
5. Commit and push to update the internal history.

## Next improvements
- Load all case files automatically
- Build `cases_index.json` for faster search
- Add more rules
- Add reports page
- Add GitHub Action validation
