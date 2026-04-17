import os
import json

BOOK_MAP = {
    "Gen": "01_Genesis.json",
    "Exo": "02_Exodus.json",
    "Lev": "03_Leviticus.json",
    "Num": "04_Numeri.json",
    "Deu": "05_Deuteronomium.json",
    "Jos": "06_Jozue.json",
    "Jdg": "07_Soudcu.json",
    "Rth": "08_Rut.json",
    "1Sa": "09_1 Samuelova.json",
    "2Sa": "10_2 Samuelova.json",
    "1Ki": "11_1 Kralovska.json",
    "2Ki": "12_2 Kralovska.json",
    "1Ch": "13_1 Paralipomenon.json",
    "2Ch": "14_2 Paralipomenon.json",
    "Ezr": "15_Ezrdras.json",
    "Neh": "16_Nehemjas.json",
    "Est": "17_Ester.json",
    "Job": "18_Job.json",
    "Psa": "19_Zalmy.json",
    "Pro": "20_Prislovi.json",
    "Ecc": "21_Kazatel.json",
    "Sng": "22_Pisen pisni.json",
    "Isa": "23_Izajas.json",
    "Jer": "24_Jeremjas.json",
    "Lam": "25_Plac.json",
    "Eze": "26_Ezechiel.json",
    "Dan": "27_Daniel.json",
    "Hos": "28_Ozeas.json",
    "Joe": "29_Joel.json",
    "Amo": "30_Amos.json",
    "Oba": "31_Abdijas.json",
    "Jon": "32_Jonas.json",
    "Mic": "33_Micheas.json",
    "Nah": "34_Nahum.json",
    "Hab": "35_Abakuk.json",
    "Zep": "36_Sofonjas.json",
    "Hag": "37_Ageus.json",
    "Zec": "38_Zacharias.json",
    "Mal": "39_Malachias.json",
    "Mat": "40_Matous.json",
    "Mar": "41_Marek.json",
    "Luk": "42_Lukas.json",
    "Jhn": "43_Jan.json",
    "Act": "44_Skutky aposkolu.json",
    "Rom": "45_Rimanum.json",
    "1Co": "46_1 Korintskym.json",
    "2Co": "47_2 Korintskym.json",
    "Gal": "48_Galatskym.json",
    "Eph": "49_Efezskym.json",
    "Phl": "50_Filipskym.json",
    "Col": "51_Koloskym.json",
    "1Th": "52_1 Tesalonickym.json",
    "2Th": "53_2 Tesalonickym.json",
    "1Ti": "54_1 Timoteovi.json",
    "2Ti": "55_2 Timoteovi.json",
    "Tit": "56_Titovi.json",
    "Phm": "57_Filemonovi.json",
    "Heb": "58_Zidum.json",
    "Jas": "59_Jakubuv.json",
    "1Pe": "60_1 Petruv.json",
    "2Pe": "61_2 Petruv.json",
    "1Jo": "62_1 Januv.json",
    "2Jo": "63_2 Januv.json",
    "3Jo": "64_3 Januv.json",
    "Jde": "65_Juduv.json",
    "Rev": "66_Zjeveni Janovo.json",
}

base_dir = r"C:\Users\stistko\CascadeProjects\stistko\christ\bible\kjv-main"

for old_name, new_name in BOOK_MAP.items():
    old_path = os.path.join(base_dir, old_name + ".json")
    new_path = os.path.join(base_dir, new_name)
    if os.path.exists(old_path):
        os.rename(old_path, new_path)
        print(f"OK: {old_name}.json -> {new_name}")
    else:
        print(f"MISSING: {old_name}.json")

print("\nDone!")
