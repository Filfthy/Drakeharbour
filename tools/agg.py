import sys,re,json
w=[];p=[];o=[];r=[];q=[];off=[];town=[];lay=[];picks={}
for l in sys.stdin:
  m=re.search(r'wins ([\d.]+)%((?: / [\d.]+%)*) \| pts ([\d.]+)((?: / [\d.]+)*)',l)
  if m:
    w.append(float(m.group(1))); p.append(float(m.group(3)))
    others=[float(x) for x in re.findall(r'[\d.]+',m.group(4))]; o.append(sum(others)/len(others)); continue
  m=re.search(r'rounds ([\d.]+) \(hit max \d+\) \| quests ([\d.]+), off-type (\d+)% \| resources: town (\d+)%',l)
  if m: r.append(float(m.group(1))); q.append(float(m.group(2))); off.append(float(m.group(3))); town.append(float(m.group(4))); continue
  m=re.search(r'lay-offs others ([\d.]+), own ([\d.]+)',l)
  if m: lay.append((float(m.group(1)),float(m.group(2))))
  if l.startswith('PICKS '):
    for k,v in json.loads(l[6:]).items(): picks[k]=picks.get(k,0)+v
n=len(w); tot=sum(picks.values()) or 1
avg=lambda a: sum(a)/len(a) if a else 0
print('runs %d | planner wins %.1f%% | pts %.1f v %.1f | rounds %.1f | quests %.1f off-type %.0f%% | town %.0f%% | lay-offs others %.1f own %.1f'%(n,avg(w),avg(p),avg(o),avg(r),avg(q),avg(off),avg(town),avg([a for a,b in lay]),avg([b for a,b in lay])))
print('   planner choices: '+', '.join('%s %.0f%%'%(k,100*v/tot) for k,v in sorted(picks.items(),key=lambda kv:-kv[1])))
