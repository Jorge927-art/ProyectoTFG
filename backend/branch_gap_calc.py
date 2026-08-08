import csv
from collections import defaultdict
rows=list(csv.DictReader(open('target/site/jacoco/jacoco.csv', newline='', encoding='utf-8')))
by_pkg=defaultdict(lambda:{'branch_cov':0,'branch_mis':0,'classes':set()})
for row in rows:
    pkg=row['PACKAGE']
    by_pkg[pkg]['branch_cov']+=int(row['BRANCH_COVERED'])
    by_pkg[pkg]['branch_mis']+=int(row['BRANCH_MISSED'])
    by_pkg[pkg]['classes'].add(row['CLASS'])
for target_pkg in ['com.cursosonline.backend.services','com.cursosonline.backend.controller']:
    vals=by_pkg[target_pkg]
    total=vals['branch_cov']+vals['branch_mis']
    current=100*vals['branch_cov']/total if total else 0
    if target_pkg=='com.cursosonline.backend.services':
        needed=max(0, int(0.70*total) - vals['branch_cov'])
    else:
        needed=max(0, int(0.60*total) - vals['branch_cov'])
    print(f'{target_pkg}: current={current:.2f}% total={total} branch_cov={vals["branch_cov"]} branch_mis={vals["branch_mis"]} needed_to_goal={needed}')
