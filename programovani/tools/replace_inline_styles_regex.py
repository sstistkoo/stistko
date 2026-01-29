import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

replacements = [
    # exact attribute -> replacement (attribute-level replacements)
    (r'style="margin-top:10px;max-height:200px;overflow:auto;background:#111;color:#0f0;padding:8px;border-radius:6px;"', 'class="code-pre-result"'),
    (r'style="margin-top:10px;padding:6px 16px;"', 'class="modal-close-btn"'),
    (r'style="flex-wrap:wrap;gap:8px;"', 'class="flex-wrap-gap-8"'),
    (r'style="padding:0.75rem;border:1px solid #ccc;border-radius:6px;"', 'class="input-snippet"'),
    (r'style="padding-left:\$\{indent\}px;"', 'style="--indent:${indent}px;"'),
    (r'style="color:var\(--warning\);"', 'class="text-warning"'),
    (r'style="display: none;"', 'class="d-none"'),
    (r'style="background: rgba\(239, 68, 68, 0.1\); border-radius: 8px; padding: 8px;"', 'class="alert-error"'),
    (r'style="margin-bottom: 12px; padding: 8px; background: rgba\(239, 68, 68, 0.1\); border-radius: 8px;"', 'class="alert-error"'),
    (r'style="white-space: pre-wrap; font-family: monospace;"', 'class="mono-pre"'),
    (r'style="background: var\(--bg-tertiary\);padding:2px 6px;border-radius:4px;"', 'class="inline-code"'),
    (r'style="border-radius:8px;"', 'class="img-rounded"'),
    (r'style="max-width: 100%; height: auto;"', 'class="img-max-responsive"'),
    (r'style="text-align:center;padding:20px;color:var\(--text-muted\);"', 'class="diff-line-context"'),
    (r'style="grid-column:1/-1;text-align:center;padding:20px;"', 'class="grid-center-loading"'),
    # Simple replacements for margin/padding and font-size combos
    (r'style="margin: 0;"', 'class="no-margin"'),
    (r'style="margin-top: 16px;"', 'class="margin-top-16"'),
    (r'style="padding-top: 16px;"', 'class="padding-top-16"'),
    (r'style="margin-bottom: 8px;"', 'class="margin-bottom-8"'),
    (r'style="margin-top: 12px;"', 'class="margin-top-12"'),
    (r'style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;"', 'class="font-size-12 color-muted margin-bottom-8"'),
    (r'style="color:#00d4aa;"', 'class="link-accent"'),
]

# attribute pattern to class mapping for common font/color/margin combos
attr_map = {
    'font-size:12px;color:var(--text-muted);margin-top:12px;': 'font-size-12 color-muted margin-top-12',
    'font-size:12px;color:var(--success);margin-top:12px;': 'font-size-12 color-success margin-top-12',
    'font-size:12px;color:var(--text-muted);margin-bottom:8px;': 'font-size-12 color-muted margin-bottom-8',
    'color: #64748b; font-size: 12px; padding: 8px;': 'info-muted',
    'margin-bottom: 12px;': 'margin-bottom-12',
    'font-size: 12px; color: #f87171; margin-bottom: 8px;': 'font-size-12 color-error margin-bottom-8',
    'font-size: 12px; color: #60a5fa; margin-bottom: 8px;': 'font-size-12 text-accent-blue margin-bottom-8',
    'color: #64748b; font-size: 12px;': 'color-muted font-size-12',
    'color:#00d4aa;': 'class="link-accent"',
}

html_files = list(ROOT.glob('**/*.html'))
modified = 0
for path in html_files:
    text = path.read_text(encoding='utf-8')
    original = text
    # simple replacements
    for patt, repl in replacements:
        text = re.sub(patt, repl, text)
    # map-based attribute replacements inside tags
    for old_attr, class_list in attr_map.items():
        # replace style="..." where ... matches old_attr (exact substring)
        text = text.replace(f'style="{old_attr}"', f'class="{class_list}"')
        # also handle variants with single quotes
        text = text.replace(f"style='{old_attr}'", f'class="{class_list}"')
    # special handling for style="display: none;" when element already has class attribute -> inject d-none into class
    text = re.sub(r'(<[a-zA-Z0-9\-]+[^>]*?)\sclass="([^"]*)"([^>]*?)\sclass="d-none"', r'\1 class="\2 d-none"\3', text)
    # More robust: replace style="display: none;" when class exists:
    text = re.sub(r'(<[a-zA-Z0-9\-]+[^>]*?)class="([^"]*)"([^>]*?)\sstyle="display: none;"', r'\1class="\2 d-none"\3', text)
    # replace remaining style="display: none;" in tags without class
    text = re.sub(r'<([a-zA-Z0-9\-]+)([^>]*?)\sstyle="display: none;"([^>]*?)>', r'<\1\2 class="d-none"\3>', text)

    if text != original:
        path.write_text(text, encoding='utf-8')
        modified += 1

print(f"Processed {len(html_files)} HTML files, modified: {modified}")
