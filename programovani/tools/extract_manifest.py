import re, base64
from pathlib import Path
p=Path('html_studio.html')
s=p.read_text(encoding='utf-8')
m=re.search(r'href="data:application/json;base64,([A-Za-z0-9+/=]+)"', s)
if not m:
    print('No base64 manifest found')
else:
    b64=m.group(1)
    data=base64.b64decode(b64).decode('utf-8')
    Path('manifest.webmanifest').write_text(data,encoding='utf-8')
    new = s.replace('href="data:application/json;base64,'+b64+'"','href="manifest.webmanifest"')
    p.write_text(new,encoding='utf-8')
    print('Wrote manifest.webmanifest and updated HTML')