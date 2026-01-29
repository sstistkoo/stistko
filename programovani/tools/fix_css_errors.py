#!/usr/bin/env python3
"""
Oprava template stringů a prázdných pravidel v CSS souboru.
"""
import re

# Přečíst soubor
css_file = r'c:\Users\stistko\CascadeProjects\test_base\programovani\css\styles.css'

with open(css_file, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Původní velikost: {len(content)} znaků")

# 1. Opravit template string s color
content = re.sub(
    r'\.inl-a1a09c0a \{ font-size:36px; font-weight:bold; color:\$\{[^}]+\? \}',
    '.inl-a1a09c0a { font-size:36px; font-weight:bold; color:var(--success) }',
    content
)

# 2. Opravit template string s padding-left
content = re.sub(
    r'\.inl-7e0b0d4e \{ padding-left:\$\{indent\}px \}',
    '.inl-7e0b0d4e { padding-left: 20px }',
    content
)

# 3. Opravit template string s --indent
content = re.sub(
    r'\.inl-335bcb \{ --indent:\$\{indent\}px; \}',
    '.inl-335bcb { --indent: 20px; }',
    content
)

# 4. Opravit template string s font-weight:bold
content = re.sub(
    r'\.inl-b1b856 \{ font-weight:bold; color:\$\{[^}]+\?; \}',
    '.inl-b1b856 { font-weight:bold; color:var(--success); }',
    content
)

# 5. Odstranit prázdné CSS pravidla
empty_rules = [
    r'\.input-custom \{ /\* zde lze doplnit konkrétní styly podle původních inline stylů \*/ \}\n',
    r'\.select-custom \{ /\* zde lze doplnit konkrétní styly podle původních inline stylů \*/ \}\n',
    r'\.svg-custom \{ /\* zde lze doplnit konkrétní styly podle původních inline stylů \*/ \}\n',
    r'\.a-custom \{ /\* zde lze doplnit konkrétní styly podle původních inline stylů \*/ \}\n',
    r'\.pre-custom \{ /\* zde lze doplnit konkrétní styly podle původních inline stylů \*/ \}\n',
    r'\.modal-actions \{ /\* případné další styly pro modal-actions \*/ \}\n',
]

for rule in empty_rules:
    content = re.sub(rule, '', content)

print(f"Nová velikost: {len(content)} znaků")

# Zapsat zpět
with open(css_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ CSS soubor opraven!")
print("\nOdstraněné chyby:")
print("  - Template stringy: ${score >= 80 ? } → var(--success)")
print("  - Template stringy: ${indent}px → 20px")
print("  - Prázdná pravidla: .input-custom, .select-custom, atd.")
