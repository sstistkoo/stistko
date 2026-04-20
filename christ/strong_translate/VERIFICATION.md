# Verification Checklist

## After regeneration of strong_updated_detailed_cs.txt

### 1. File basics
- [ ] Size ~8.4 MB (may vary slightly)
- [ ] Lines: ~181000 (use: `wc -l` or PowerShell `(Get-Content).Length`)
- [ ] Encoding: UTF-8 (BOM not expected)

### 2. First entries (G1–G10)
```
G1 | α
BETA: A
Transliteration: Alpha
Morphology: G:N-LI
Definice: ...
KJV Významy: Alpha
Česky: první písmeno abecedy...
```

### 3. Hebrew entry sample (H1–H5)
```
H1 | א
BETA: --
Transliteration: aleph
Morphology: H:N-M-P
Definice: ...
KJV Významy: Aleph
Česky: (první písmeno hebrejské abecedy) [...]
```

### 4. Counts (approximate)
- Greek entries (lines starting with `G`): 10847
- Hebrew entries (lines starting with `H`): 8723
- Total unique entries: ~19570

### 5. Required sections per entry
- [ ] Header line: `G#### | word` or `H#### | word`
- [ ] `BETA:` line (present for most Greek, may be `--` for Hebrew)
- [ ] `Transliteration:` line
- [ ] `Morphology:` line
- [ ] `Definice:` line (can span multiple lines)
- [ ] `KJV Významy:` line
- [ ] `Česky:` line (Czech translation — ensure non-empty)
- [ ] Blank line separator after each entry

### 6. Quick grep checks
```bash
# No empty Czech translations?
findstr /V /C:"Česky: " strong_updated_detailed_cs.txt | findstr /C:"Česky:" | find /C "Česky:"

# BETA codes present for Greek?
findstr /R "^BETA: [A-Z]" strong_updated_detailed_cs.txt | find /C "BETA:"

# No duplicate G/H numbers?
# (sort and check for repeated keys at line start)
```

### 7. Web UI test
- [ ] Open `strong_translator.html` in browser
- [ ] Load `strong_updated_detailed_cs.txt`
- [ ] Verify entries appear in list (G1, G2, …)
- [ ] Click an entry → details pane shows all fields
- [ ] Česky field is populated
