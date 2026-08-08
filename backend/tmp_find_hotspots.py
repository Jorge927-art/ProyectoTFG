import csv
from pathlib import Path
rows = list(csv.DictReader(Path('target/site/jacoco/jacoco.csv').open(encoding='utf-8')))
for pkg in ['com.cursosonline.backend.services','com.cursosonline.backend.controller']:
    print('PACKAGE', pkg)
    items = []
    for row in rows:
        if row['PACKAGE'] == pkg or row['PACKAGE'].startswith(pkg + '.'):
            bm = int(row['BRANCH_MISSED'])
            bc = int(row['BRANCH_COVERED'])
            lm = int(row['LINE_MISSED'])
            lc = int(row['LINE_COVERED'])
            items.append((bm, bc, lm, lc, row['CLASS'], row['PACKAGE']))
    items.sort(reverse=True)
    for bm, bc, lm, lc, cls, p in items[:15]:
        print(f'{bm:>3} missed  {bc:>3} covered  {cls}  ({p})')
    print()
