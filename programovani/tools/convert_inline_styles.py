import re
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / 'html_studio.html'
CSS_PATH = ROOT / 'css' / 'styles.css'

html = HTML_PATH.read_text(encoding='utf-8')

# Find all style attributes (simple approach)
style_pattern = re.compile(r'style\s*=\s*"([^"]*)"', re.DOTALL)
all_styles = style_pattern.findall(html)
uniq_styles = {}

for s in sorted(set([s.strip() for s in all_styles])):
    if not s:
        continue
    # Normalize whitespace
    norm = '; '.join([p.strip() for p in s.replace('\n',' ').split(';') if p.strip()])
    h = hashlib.sha1(norm.encode('utf-8')).hexdigest()[:8]
    cls = f'inl-{h}'
    uniq_styles[norm] = cls

if not uniq_styles:
    print('No inline styles found.')
    exit(0)

# Backup original HTML
bak_path = HTML_PATH.with_suffix('.html.bak')
if not bak_path.exists():
    bak_path.write_text(html, encoding='utf-8')

# Prepare CSS block
css_lines = ['\n/* Auto-converted inline styles */']
for style, cls in uniq_styles.items():
    css_lines.append(f'.{cls} ' + '{ ' + style + ' }')
css_block = '\n'.join(css_lines) + '\n'

# Append CSS block
CSS_PATH.write_text(CSS_PATH.read_text(encoding='utf-8') + css_block, encoding='utf-8')

# Replace occurrences in HTML
# For each unique style, replace style="..." with class attribute
new_html = html
for style, cls in uniq_styles.items():
    # Build a regex to match the exact style content (with flexible whitespace/newlines)
    style_regex = re.compile(r'style\s*=\s*"' + re.escape(style) + r'"', re.DOTALL)

    # Replacement function should merge with existing class attribute if present
    def repl(m):
        # Look backwards a bit to see if there's a class attribute in same tag
        start = m.start()
        # find the last '<' before start
        lt = new_html.rfind('<', 0, start)
        gt = new_html.find('>', start)
        tag = new_html[lt:gt+1]
        cls_attr = re.search(r'class\s*=\s*"([^"]*)"', tag)
        if cls_attr:
            existing = cls_attr.group(1)
            new_tag = tag.replace(f'class="{existing}"', f'class="{existing} {cls}"')
            # Replace the tag in the overall HTML
            return new_tag + m.string[gt+1:m.end()]  # will be processed by re.sub; we will handle differently
        else:
            return f'class="{cls}"'

    # Simpler approach: first replace style="..." with a placeholder ' STYLE_TOKEN_{cls} '
    new_html = style_regex.sub(f'__STYLE_TOKEN__{cls}__', new_html)

# Now process placeholders to inject class attributes correctly while preserving existing class attributes
# Replace patterns like '<tag ... class="existing"> ... __STYLE_TOKEN__inl-xxxx__ ...' or '... __STYLE_TOKEN__inl-xxxx__ ...'
# A robust approach: replace ' __STYLE_TOKEN__cls__' with either 'class="cls"' if there's no class before the token but inside the same tag, or append to existing class attribute if present.

def replace_tokens(text):
    token_pattern = re.compile(r'(__STYLE_TOKEN__inl-[0-9a-f]{8}__)')
    i = 0
    out = ''
    last = 0
    for m in token_pattern.finditer(text):
        out += text[last:m.start()]
        last = m.end()
        cls = m.group(1).replace('__STYLE_TOKEN__','')
        # find last '<' before m.start()
        lt = text.rfind('<', 0, m.start())
        gt = text.find('>', lt)
        tag_content = text[lt:gt+1]
        class_match = re.search(r'class\s*=\s*"([^"]*)"', tag_content)
        if class_match:
            existing = class_match.group(1)
            new_tag = tag_content.replace(f'class="{existing}"', f'class="{existing} {cls}"')
            out = out[:out.rfind(tag_content)] + new_tag
        else:
            # insert class before the token position in the tag
            # locate insertion point: after '<tagname'
            mtag = re.match(r'<\s*([a-zA-Z0-9\-]+)([^>]*)', tag_content)
            if mtag:
                tagname = mtag.group(1)
                rest = mtag.group(2)
                new_tag = f'<{tagname} class="{cls}"{rest}>'
                out = out[:out.rfind(tag_content)] + new_tag
            else:
                # fallback: just insert class="cls"
                out += f' class="{cls}"'
    out += text[last:]
    return out

new_html = replace_tokens(new_html)

# As a final cleanup, remove any leftover STYLE_TOKEN markers
new_html = new_html.replace('__STYLE_TOKEN__','')

HTML_PATH.write_text(new_html, encoding='utf-8')

print(f'Converted {len(uniq_styles)} unique inline style blocks into CSS classes.')
print('Appended CSS block to', CSS_PATH)
print('Updated HTML:', HTML_PATH)
