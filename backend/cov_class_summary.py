import csv
from collections import defaultdict
rows=list(csv.DictReader(open('target/site/jacoco/jacoco.csv', newline='', encoding='utf-8')))
by_cls=defaultdict(lambda:{'pkg':'','branch_cov':0,'branch_mis':0,'line_cov':0,'line_mis':0})
for row in rows:
    cls=row['CLASS']
    pkg=row['PACKAGE']
    by_cls[cls]['pkg']=pkg
    by_cls[cls]['branch_cov']+=int(row['BRANCH_COVERED'])
    by_cls[cls]['branch_mis']+=int(row['BRANCH_MISSED'])
    by_cls[cls]['line_cov']+=int(row['LINE_COVERED'])
    by_cls[cls]['line_mis']+=int(row['LINE_MISSED'])
for cls, vals in sorted(by_cls.items(), key=lambda item:(item[1]['pkg'], item[1]['branch_mis']), reverse=False):
    if vals['pkg'].startswith('com.cursosonline.backend.services') or vals['pkg'].startswith('com.cursosonline.backend.controller'):
        total=vals['branch_cov']+vals['branch_mis']
        pct=0 if total==0 else 100*vals['branch_cov']/total
        if vals['branch_mis']>0:
            print(f"{vals['pkg']}.{cls}: branch_missed={vals['branch_mis']} branch_cov={vals['branch_cov']} branch_pct={pct:.1f}%")
