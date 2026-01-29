import re
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
CSS_FILE = ROOT / 'css' / 'styles.css'

style_re = re.compile(r'style="([^"]+)"')

# load existing styles.css
css_text = CSS_FILE.read_text(encoding='utf-8')
existing_classes = {}
# Build reverse map of existing inl- classes if any (by scanning for previously generated comments)
for m in re.finditer(r'\.inl-([0-9a-f]{6})\s*{([^}]*)}', css_text):
    cls = 'inl-' + m.group(1)
    decl = m.group(2).strip()
    existing_classes[decl] = cls

new_classes = {}  # decl -> class
file_changes = 0

html_files = list(ROOT.glob('**/*.html'))
for path in html_files:
    text = path.read_text(encoding='utf-8')
    matches = list(style_re.finditer(text))
    if not matches:
        continue
    new_text = text
    offset = 0
    for m in matches:
        decl = m.group(1).strip()
        if decl == '':
            # remove empty style
            start, end = m.span()
            new_text = new_text[:start+offset] + new_text[end+offset:]
            offset -= (end - start)
            continue
        # Normalize declaration: ensure trailing semicolons and normalized spacing
        parts = [p.strip() for p in decl.split(';') if p.strip()]
        norm_decl = '; '.join(parts) + (';' if parts else '')
        # check existing classes
        cls = existing_classes.get(norm_decl)
        if not cls:
            cls = new_classes.get(norm_decl)
        if not cls:
            # generate short hash-based class name
            h = hashlib.md5(norm_decl.encode('utf-8')).hexdigest()[:6]
            cls = f'inl-{h}'
            new_classes[norm_decl] = cls
        # Replace style="..." with class insertion, preserving existing class attr if present
        span_start, span_end = m.span()
        # find preceding segment up to tag start
        prefix = new_text[:span_start+offset]
        suffix = new_text[span_end+offset:]
        # check if there is a class attribute before the style inside the same tag
        tag_start = prefix.rfind('<')
        tag_end = span_end+offset
        tag_text = new_text[tag_start:tag_end]
        class_match = re.search(r'class="([^"]*)"', tag_text)
        if class_match:
            # insert in existing class list
            old_classes = class_match.group(1)
            # ensure we don't duplicate
            if cls not in old_classes.split():
                new_tag_text = tag_text.replace(f'class="{old_classes}"', f'class="{old_classes} {cls}"')
            else:
                new_tag_text = tag_text
            # remove the style attribute from new_tag_text
            new_tag_text = re.sub(r'\sstyle="[^"]+"', '', new_tag_text)
            # replace in new_text
            new_text = new_text[:tag_start] + new_tag_text + suffix
            # update offset: len(new_tag_text) - len(tag_text)
            offset += len(new_tag_text) - len(tag_text)
        else:
            # No class attribute, add one
            # Replace the style attribute with class="<cls>"
            new_tag_text = tag_text.replace(m.group(0), f' class="{cls}"')
            new_text = new_text[:tag_start] + new_tag_text + suffix
            offset += len(new_tag_text) - len(tag_text)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        file_changes += 1

# Append new classes to styles.css
if new_classes:
    css_add = '\n/* Generated classes moved from inline styles */\n'
    for decl, cls in new_classes.items():
        css_add += f'.{cls} {{ {decl} }}\n'
    CSS_FILE.write_text(css_text + css_add, encoding='utf-8')

print(f"Processed {len(html_files)} HTML files, modified {file_changes} files, added {len(new_classes)} classes.")
