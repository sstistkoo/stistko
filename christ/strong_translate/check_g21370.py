# Check G21370 in TBESG
target = "G21370"
count = 0
out = open("g21370_debug.txt", "w", encoding="utf-8")
with open("tbesg_extended.txt", "r", encoding="utf-8") as f:
    for line in f:
        if target in line:
            parts = line.strip().split("|")
            out.write(f"Found: {len(parts)} fields\n")
            out.write(f"Raw: {repr(line)}\n")
            out.write(f"Fields: {parts}\n")
            count += 1

out.write(f"Count: {count}\n")
out.close()
