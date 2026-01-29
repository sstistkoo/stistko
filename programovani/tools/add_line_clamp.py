from pathlib import Path
p=Path('html_studio.html')
s=p.read_text(encoding='utf-8')
new = s.replace('-webkit-line-clamp: 2;','-webkit-line-clamp: 2;\n        line-clamp: 2;')
if new!=s:
    p.write_text(new,encoding='utf-8')
    print('Inserted line-clamp properties')
else:
    print('No changes')
