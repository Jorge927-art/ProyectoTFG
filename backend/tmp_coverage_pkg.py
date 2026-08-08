import csv
from collections import defaultdict
from pathlib import Path

path = Path('target/site/jacoco/jacoco.csv')
rows = list(csv.DictReader(path.open(encoding='utf-8')))

wanted = ['com.cursosonline.backend.security','com.cursosonline.backend.services','com.cursosonline.backend.controller']

def pct(covered, missed):
    total = covered + missed
    return (100.0 * covered / total) if total else 0.0

aggregates = defaultdict(lambda: {'line_cov':0,'line_mis':0,'branch_cov':0,'branch_mis':0,'classes':0})
for row in rows:
    pkg = row['PACKAGE']
    if pkg.startswith('com.cursosonline.backend.security'):
        key = 'com.cursosonline.backend.security'
    elif pkg.startswith('com.cursosonline.backend.services'):
        key = 'com.cursosonline.backend.services'
    elif pkg.startswith('com.cursosonline.backend.controller'):
        key = 'com.cursosonline.backend.controller'
    else:
        continue
    agg = aggregates[key]
    agg['line_cov'] += int(row['LINE_COVERED'])
    agg['line_mis'] += int(row['LINE_MISSED'])
    agg['branch_cov'] += int(row['BRANCH_COVERED'])
    agg['branch_mis'] += int(row['BRANCH_MISSED'])
    agg['classes'] += 1

for key in wanted:
    agg = aggregates[key]
    print(f'{key}\tline={pct(agg["line_cov"], agg["line_mis"]):.1f}%\tbranch={pct(agg["branch_cov"], agg["branch_mis"]):.1f}%\tclasses={agg["classes"]}')
