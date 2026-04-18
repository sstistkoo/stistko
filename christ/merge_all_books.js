const fs = require('fs');

// Mapování českých názvů knih na KJV zkratky
const bookMapping = {
    'Genesis': 'Gen',
    'Exodus': 'Exod',
    'Leviticus': 'Lev',
    'Numeri': 'Num',
    'Deuteronomium': 'Deut',
    'Jozue': 'Josh',
    'Soudcu': 'Judg',
    'Rut': 'Ruth',
    '1 Samuelova': '1Sam',
    '2 Samuelova': '2Sam',
    '1 Kralovska': '1Kgs',
    '2 Kralovska': '2Kgs',
    '1 Paralipomenon': '1Chr',
    '2 Paralipomenon': '2Chr',
    'Ezrdras': 'Ezra',
    'Nehemjas': 'Neh',
    'Ester': 'Esth',
    'Job': 'Job',
    'Zalmy': 'Ps',
    'Prislovi': 'Prov',
    'Kazatel': 'Eccl',
    'Pisen pisni': 'Song',
    'Izajas': 'Isa',
    'Jeremjas': 'Jer',
    'Plac': 'Lam',
    'Ezechiel': 'Ezek',
    'Daniel': 'Dan',
    'Ozeas': 'Hos',
    'Joel': 'Joel',
    'Amos': 'Amos',
    'Abdijas': 'Obad',
    'Jonas': 'Jonah',
    'Micheas': 'Mic',
    'Nahum': 'Nah',
    'Abakuk': 'Hab',
    'Sofonjas': 'Zeph',
    'Ageus': 'Hag',
    'Zacharias': 'Zech',
    'Malachias': 'Mal',
    'Matous': 'Matt',
    'Marek': 'Mark',
    'Lukas': 'Luke',
    'Jan': 'John',
    'Skutky aposkolu': 'Acts',
    'Rimanum': 'Rom',
    '1 Korintskym': '1Cor',
    '2 Korintskym': '2Cor',
    'Galatskym': 'Gal',
    'Efezskym': 'Eph',
    'Filipskym': 'Phil',
    'Koloskym': 'Col',
    '1 Tesalonickym': '1Thess',
    '2 Tesalonickym': '2Thess',
    '1 Timoteovi': '1Tim',
    '2 Timoteovi': '2Tim',
    'Titovi': 'Titus',
    'Filemonovi': 'Philem',
    'Zidum': 'Heb',
    'Jakubuv': 'James',
    '1 Petruv': '1Pet',
    '2 Petruv': '2Pet',
    '1 Januv': '1John',
    '2 Januv': '2John',
    '3 Januv': '3John',
    'Juduv': 'Jude',
    'Zjeveni Janovo': 'Rev'
};

const czFiles = [
    '01_Genesis_cz.json',
    '02_Exodus_cz.json',
    '03_Leviticus_cz.json',
    '04_Numeri_cz.json',
    '05_Deuteronomium_cz.json',
    '06_Jozue_cz.json',
    '07_Soudcu_cz.json',
    '08_Rut_cz.json',
    '09_1 Samuelova_cz.json',
    '10_2 Samuelova_cz.json',
    '11_1 Kralovska_cz.json',
    '12_2 Kralovska_cz.json',
    '13_1 Paralipomenon_cz.json',
    '14_2 Paralipomenon_cz.json',
    '15_Ezrdras_cz.json',
    '16_Nehemjas_cz.json',
    '17_Ester_cz.json',
    '18_Job_cz.json',
    '19_Zalmy_cz.json',
    '20_Prislovi_cz.json',
    '21_Kazatel_cz.json',
    '22_Pisen pisni_cz.json',
    '23_Izajas_cz.json',
    '24_Jeremjas_cz.json',
    '25_Plac_cz.json',
    '26_Ezechiel_cz.json',
    '27_Daniel_cz.json',
    '28_Ozeas_cz.json',
    '29_Joel_cz.json',
    '30_Amos_cz.json',
    '31_Abdijas_cz.json',
    '32_Jonas_cz.json',
    '33_Micheas_cz.json',
    '34_Nahum_cz.json',
    '35_Abakuk_cz.json',
    '36_Sofonjas_cz.json',
    '37_Ageus_cz.json',
    '38_Zacharias_cz.json',
    '39_Malachias_cz.json',
    '40_Matous_cz.json',
    '41_Marek_cz.json',
    '42_Lukas_cz.json',
    '43_Jan_cz.json',
    '44_Skutky aposkolu_cz.json',
    '45_Rimanum_cz.json',
    '46_1 Korintskym_cz.json',
    '47_2 Korintskym_cz.json',
    '48_Galatskym_cz.json',
    '49_Efezskym_cz.json',
    '50_Filipskym_cz.json',
    '51_Koloskym_cz.json',
    '52_1 Tesalonickym_cz.json',
    '53_2 Tesalonickym_cz.json',
    '54_1 Timoteovi_cz.json',
    '55_2 Timoteovi_cz.json',
    '56_Titovi_cz.json',
    '57_Filemonovi_cz.json',
    '58_Zidum_cz.json',
    '59_Jakubuv_cz.json',
    '60_1 Petruv_cz.json',
    '61_2 Petruv_cz.json',
    '62_1 Januv_cz.json',
    '63_2 Januv_cz.json',
    '64_3 Januv_cz.json',
    '65_Juduv_cz.json',
    '66_Zjeveni Janovo_cz.json'
];

let stats = {
    processed: 0,
    skipped: 0,
    totalVerses: 0,
    missingChapters: [],
    missingVerses: []
};

czFiles.forEach(czFile => {
    // Získání názvu knihy z češtiny (bez čísla a přípony)
    const match = czFile.match(/^(\d+)_(.+)_cz\.json$/);
    if (!match) {
        console.log(`CHYBA: Nelze parsovat název souboru: ${czFile}`);
        stats.skipped++;
        return;
    }
    
    const bookName = match[2];  // např. "Genesis", "Exodus"
    const kjvBook = bookMapping[bookName];
    
    if (!kjvBook) {
        console.log(`CHYBA: Není mapování pro knihu: ${bookName} (soubor: ${czFile})`);
        stats.skipped++;
        return;
    }
    
    const czPath = `bible/${czFile}`;
    const kjvPath = `bible/kjv-main/${czFile.replace('_cz.json', '.json')}`;
    
    try {
        const czData = JSON.parse(fs.readFileSync(czPath, 'utf8'));
        const kjvData = JSON.parse(fs.readFileSync(kjvPath, 'utf8'));
        
        if (!kjvData[kjvBook]) {
            console.log(`CHYBA: KJV kniha "${kjvBook}" neexistuje v ${kjvPath}`);
            stats.skipped++;
            return;
        }
        
        // Projít české kapitoly a sloučit verše
        for (const chapter of czData.chapters) {
            const chapterNum = chapter.chapter;
            const chapterKey = `${kjvBook}|${chapterNum}`;
            
            if (!kjvData[kjvBook][chapterKey]) {
                console.log(`  POZOR: Kapitola ${chapterNum} chybí v KJV ${kjvBook} (soubor: ${czFile})`);
                stats.missingChapters.push({book: kjvBook, chapter: chapterNum});
                continue;
            }
            
            for (const verse of chapter.verses) {
                const verseNum = verse.verse;
                const verseKey = `${kjvBook}|${chapterNum}|${verseNum}`;
                
                if (!kjvData[kjvBook][chapterKey][verseKey]) {
                    stats.missingVerses.push({book: kjvBook, verse: verseKey});
                    continue;
                }
                
                kjvData[kjvBook][chapterKey][verseKey].cz = verse.text;
                stats.totalVerses++;
            }
        }
        
        // Uložit upravený soubor
        fs.writeFileSync(kjvPath, JSON.stringify(kjvData, null, '\t'));
        console.log(`✓ ${kjvBook} (${czFile}) → sloučeno`);
        stats.processed++;
        
    } catch (err) {
        console.log(`CHYBA při zpracování ${czFile}: ${err.message}`);
        stats.skipped++;
    }
});

console.log('\n=== STATISTIKY ===');
console.log(`Zpracováno knih: ${stats.processed}`);
console.log(`Přeskočeno: ${stats.skipped}`);
console.log(`Celkem přidáno veršů češtiny: ${stats.totalVerses}`);
console.log(`Chybí kapitoly v KJV: ${stats.missingChapters.length}`);
console.log(`Chybí verše v KJV: ${stats.missingVerses.length}`);

if (stats.missingVerses.length > 0) {
    console.log('\nChybějící verše (přeskočeny):');
    stats.missingVerses.forEach(v => console.log(`  ${v.verse}`));
}
