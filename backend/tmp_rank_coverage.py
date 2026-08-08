import csv
from collections import defaultdict
from pathlib import Path

p = Path('target/site/jacoco/jacoco.csv')
rows = list(csv.DictReader(p.open(encoding='utf-8', newline='')))
by_class = defaultdict(lambda: {'line_missed': 0, 'line_covered': 0, 'branch_missed': 0, 'branch_covered': 0})
for r in rows:
    cls = r['CLASS']
    by_class[cls]['line_missed'] += int(r['LINE_MISSED'])
    by_class[cls]['line_covered'] += int(r['LINE_COVERED'])
    by_class[cls]['branch_missed'] += int(r['BRANCH_MISSED'])
    by_class[cls]['branch_covered'] += int(r['BRANCH_COVERED'])

for cls, vals in sorted(by_class.items(), key=lambda kv: (kv[1]['branch_missed']), reverse=True)[:20]:
    total = vals['branch_missed'] + vals['branch_covered']
    pct = 0 if total == 0 else 100 * vals['branch_covered'] / total
    print(f"{cls}: branch_missed={vals['branch_missed']} branch_covered={vals['branch_covered']} coverage={pct:.1f}%")
