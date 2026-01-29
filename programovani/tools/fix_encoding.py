# -*- coding: utf-8 -*-
"""Fix broken UTF-8 encoding in MenuModals.js"""

import os

# Map of broken UTF-8 sequences to correct characters
fixes = {
    'âŒ': '❌',
    'â³': '⏳',
    'âœ…': '✅',
    'âœ"': '✔',
    'ðŸ"¥': '📥',
    'ðŸ"‹': '📋',
    'ðŸ—'ï¸': '🗑️',
    'âš ï¸': '⚠️',
    'ðŸ"„': '📄',
    'ðŸ"': '🔍',
    'ðŸ›': '🐛',
    'â„¹ï¸': 'ℹ️',
    'NaÄÃ­st': 'Načíst',
    'NaÄÃ­tÃ¡m': 'Načítám',
    'NaÄti': 'Načti',
    'naÄten': 'načten',
    'NaÄteno': 'Načteno',
    'NeplatnÃ¡': 'Neplatná',
    'PrÃ¡zdnÃ½': 'Prázdný',
    'ÃºspÄ›Å¡nÄ›': 'úspěšně',
    'znakÅ¯': 'znaků',
    'Å½Ã¡dnÃ©': 'Žádné',
    'nezaznamenÃ¡ny': 'nezaznamenány',
    'poslednÃ­ch': 'posledních',
    'DuplicitnÃ­': 'Duplicitní',
    'potlaÄeny': 'potlačeny',
    'pouÅ¾ijte': 'použijte',
    'KopÃ­rovat': 'Kopírovat',
    'ZkopÃ­rovÃ¡no': 'Zkopírováno',
    'vymazÃ¡n': 'vymazán',
    'NepodaÅ™ilo': 'Nepodařilo',
    'problÃ©m': 'problém',
    'textovÃ©ho': 'textového',
}

file_path = r'c:\Users\stistko\CascadeProjects\test_base\programovani\src\modules\menu\services\MenuModals.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

for old, new in fixes.items():
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed encoding in MenuModals.js!')
