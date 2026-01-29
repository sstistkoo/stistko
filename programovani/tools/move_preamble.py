from pathlib import Path
p=Path('html_studio.html')
s=p.read_text(encoding='utf-8')
idx = s.find('<!DOCTYPE html>')
if idx==-1:
    print('No DOCTYPE found')
else:
    pre = s[:idx]
    rest = s[idx:]
    bidx = rest.find('<body')
    if bidx==-1:
        print('No <body> found after DOCTYPE')
    else:
        # find the end of the body start tag
        body_tag_end = rest.find('>', bidx)
        insert_pos = body_tag_end+1
        new = rest[:insert_pos] + '\n' + pre + rest[insert_pos:]
        Path('html_studio.html').write_text(new,encoding='utf-8')
        print('Moved pre-DOCTYPE content into <body>')
