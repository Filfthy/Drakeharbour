import sys,re
w=[];p=[];o=[];k=[];t=[];U=[0]*5
for l in sys.stdin:
  m=re.search(r'wins ([\d.]+)%((?: / [\d.]+%)*).*pts/hand ([\d.]+)((?: / [\d.]+)*).*turns/hand ([\d.]+).*kickers (\d+)%',l)
  if m:
    w.append(float(m.group(1))); p.append(float(m.group(3)))
    others=[float(x) for x in re.findall(r'[\d.]+',m.group(4))]; o.append(sum(others)/max(1,len(others)))
    t.append(float(m.group(5))); k.append(float(m.group(6)))
  elif 'planner cards' in l:
    for i,x in enumerate(map(int,l.split()[2:])): U[i]+=x
  elif l.strip(): print(l.strip())
n=len(w)
print('runs %d | planner wins %.1f%% | pts %.1f v %.1f | turns %.1f | kickers %.0f%% | planner cards 1-5 %s'%(n,sum(w)/n,sum(p)/n,sum(o)/n,sum(t)/n,sum(k)/n,U))
