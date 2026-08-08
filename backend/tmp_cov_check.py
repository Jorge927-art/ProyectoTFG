import csv
from collections import defaultdict
rowlist=list(csv.DictReader(open('target/site/jacoco/jacoco.csv', newline='', encoding='utf-8')))
by_pkg=defaultdict(lambda:{'line_cov':0,'line_mis':0,'branch_cov':0,'branch_mis':0,'classes':set()})
for row in rowlist:
    pkg=row['PACKAGE']
    by_pkg[pkg]['line_cov']+=int(row['LINE_COVERED'])
    by_pkg[pkg]['line_mis']+=int(row['LINE_MISSED'])
    by_pkg[pkg]['branch_cov']+=int(row['BRANCH_COVERED'])
    by_pkg[pkg]['branch_mis']+=int(row['BRANCH_MISSED'])
    by_pkg[pkg]['classes'].add(row['CLASS'])
for name in sorted(by_pkg):
    if name.startswith('com.cursosonline.backend.services') or name.startswith('com.cursosonline.backend.controller') or name.startswith('com.cursosonline.backend.security'):
        vals=by_pkg[name]
        def pct(cov, mis):
            total=cov+mis
            return 0 if total==0 else 100*cov/total
        print(f'{name}: line={pct(vals["line_cov"], vals["line_mis"]):.1f}% branch={pct(vals["branch_cov"], vals["branch_mis"]):.1f}% classes={len(vals["classes"])}')
