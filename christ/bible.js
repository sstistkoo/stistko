(function() {
    const BOOK_LIST_EN = [
        'Genesis', 'Exodus', 'Leviticus', 'Numeri', 'Deuteronomium',
        'Jozue', 'Soudci', 'Rut',
        '1 Samuelova', '2 Samuelova', '1 Kralovska', '2 Kralovska',
        '1 Paralipomenon', '2 Paralipomenon', 'Ezrdras', 'Nehemjas', 'Ester',
        'Job', 'Zalmy', 'Prislovi', 'Kazatel', 'Pisen pisni',
        'Izajas', 'Jeremjas', 'Plac', 'Ezechiel', 'Daniel',
        'Ozeas', 'Joel', 'Amos', 'Abdijas', 'Jonas', 'Micheas',
        'Nahum', 'Abakuk', 'Sofonjas', 'Ageus', 'Zacharias', 'Malachias',
        'Matous', 'Marek', 'Lukas', 'Jan', 'Skutky aposkolu',
        'Rimanum', '1 Korintskym', '2 Korintskym', 'Galatskym', 'Efezskym',
        'Filipskym', 'Koloskym', '1 Tesalonickym', '2 Tesalonickym',
        '1 Timoteovi', '2 Timoteovi', 'Titovi', 'Filemonovi',
        'Zidum', 'Jakubuv', '1 Petruv', '2 Petruv', '1 Januv', '2 Januv', '3 Januv', 'Juda',
        'Zjeveni Janovo'
    ];

    const BOOK_LIST_CZ = [
        'Genesis', 'Exodus', 'Leviticus', 'Numeri', 'Deuteronomium',
        'Jozue', 'Soudci', 'Rut',
        '1 Samuelova', '2 Samuelova', '1 Královská', '2 Královská',
        '1 Paralipomenon', '2 Paralipomenon', 'Ezrdras', 'Nehemjas', 'Ester',
        'Job', 'Žalmy', 'Přísloví', 'Kazatel', 'Píseň písní',
        'Izajas', 'Jeremjás', 'Pláč', 'Ezechiel', 'Daniel',
        'Ozeas', 'Joel', 'Amos', 'Abdijas', 'Jonas', 'Micheas',
        'Nahum', 'Abakuk', 'Sofonjas', 'Ageus', 'Zacharias', 'Malachias',
        'Matouš', 'Marek', 'Lukas', 'Jan', 'Skutky apoštolů',
        'Římanům', '1 Korintským', '2 Korintským', 'Galatským', 'Efezským',
        'Filipským', 'Koloským', '1 Tesalonickým', '2 Tesalonickým',
        '1 Timoteovi', '2 Timoteovi', 'Titovi', 'Filemonovi',
        'Židům', 'Jakubův', '1 Petrův', '2 Petrův', '1 Janův', '2 Janův', '3 Janův', 'Juda',
        'Zjevení Janovo'
    ];

    const bookSelect = document.getElementById('book-select');
    const verseDisplay = document.getElementById('verse-display');
    const commentaryPanel = document.getElementById('commentary-panel');

    let currentBook = null;
    let kjvBook = null;
    let commentaries = null;

    const FILE_EN_MAP = {
        '01_Genesis.json': '01_Genesis.json',
        '02_Exodus.json': '02_Exodus.json',
        '03_Leviticus.json': '03_Leviticus.json',
        '04_Numeri.json': '04_Numeri.json',
        '05_Deuteronomium.json': '05_Deuteronomium.json',
        '06_Jozue.json': '06_Jozue.json',
        '07_Soudcu.json': '07_Soudcu.json',
        '08_Rut.json': '08_Rut.json',
        '09_1 Samuelova.json': '09_1 Samuelova.json',
        '10_2 Samuelova.json': '10_2 Samuelova.json',
        '11_1 Kralovska.json': '11_1 Kralovska.json',
        '12_2 Kralovska.json': '12_2 Kralovska.json',
        '13_1 Paralipomenon.json': '13_1 Paralipomenon.json',
        '14_2 Paralipomenon.json': '14_2 Paralipomenon.json',
        '15_Ezrdras.json': '15_Ezrdras.json',
        '16_Nehemjas.json': '16_Nehemjas.json',
        '17_Ester.json': '17_Ester.json',
        '18_Job.json': '18_Job.json',
        '19_Zalmy.json': '19_Zalmy.json',
        '20_Prislovi.json': '20_Prislovi.json',
        '21_Kazatel.json': '21_Kazatel.json',
        '22_Pisen pisni.json': '22_Pisen pisni.json',
        '23_Izajas.json': '23_Izajas.json',
        '24_Jeremjas.json': '24_Jeremjas.json',
        '25_Plac.json': '25_Plac.json',
        '26_Ezechiel.json': '26_Ezechiel.json',
        '27_Daniel.json': '27_Daniel.json',
        '28_Ozeas.json': '28_Ozeas.json',
        '29_Joel.json': '29_Joel.json',
        '30_Amos.json': '30_Amos.json',
        '31_Abdijas.json': '31_Abdijas.json',
        '32_Jonas.json': '32_Jonas.json',
        '33_Micheas.json': '33_Micheas.json',
        '34_Nahum.json': '34_Nahum.json',
        '35_Abakuk.json': '35_Abakuk.json',
        '36_Sofonjas.json': '36_Sofonjas.json',
        '37_Ageus.json': '37_Ageus.json',
        '38_Zacharias.json': '38_Zacharias.json',
        '39_Malachias.json': '39_Malachias.json',
        '40_Matous.json': '40_Matous.json',
        '41_Marek.json': '41_Marek.json',
        '42_Lukas.json': '42_Lukas.json',
        '43_Jan.json': '43_Jan.json',
        '44_Skutky aposkolu.json': '44_Skutky aposkolu.json',
        '45_Rimanum.json': '45_Rimanum.json',
        '46_1 Korintskym.json': '46_1 Korintskym.json',
        '47_2 Korintskym.json': '47_2 Korintskym.json',
        '48_Galatskym.json': '48_Galatskym.json',
        '49_Efezskym.json': '49_Efezskym.json',
        '50_Filipskym.json': '50_Filipskym.json',
        '51_Koloskym.json': '51_Koloskym.json',
        '52_1 Tesalonickym.json': '52_1 Tesalonickym.json',
        '53_2 Tesalonickym.json': '53_2 Tesalonickym.json',
        '54_1 Timoteovi.json': '54_1 Timoteovi.json',
        '55_2 Timoteovi.json': '55_2 Timoteovi.json',
        '56_Titovi.json': '56_Titovi.json',
        '57_Filemonovi.json': '57_Filemonovi.json',
        '58_Zidum.json': '58_Zidum.json',
        '59_Jakubuv.json': '59_Jakubuv.json',
        '60_1 Petruv.json': '60_1 Petruv.json',
        '61_2 Petruv.json': '61_2 Petruv.json',
        '62_1 Januv.json': '62_1 Januv.json',
        '63_2 Januv.json': '63_2 Januv.json',
        '64_3 Januv.json': '64_3 Januv.json',
        '65_Juduv.json': '65_Juduv.json',
        '66_Zjeveni Janovo.json': '66_Zjeveni Janovo.json'
    };

    function init() {
        BOOK_LIST_EN.forEach((name, idx) => {
            const opt = document.createElement('option');
            opt.value = `${idx + 1}`.padStart(2, '0') + '_' + name + '.json';
            opt.textContent = BOOK_LIST_CZ[idx];
            bookSelect.appendChild(opt);
        });

        bookSelect.addEventListener('change', loadBook);
        document.addEventListener('click', handleDetailClick);

        loadCommentaries();
    }

    async function loadCommentaries() {
        try {
            const res = await fetch('../rozboru.json');
            commentaries = await res.json();
        } catch (e) {
            commentaries = {};
        }
    }

    async function loadBook() {
        const filename = bookSelect.value;
        if (!filename) return;

        verseDisplay.innerHTML = '<p>Načítám...</p>';

        try {
            const [czRes, enRes] = await Promise.all([
                fetch('../bible/' + filename),
                fetch('../bible/kjv-main/' + filename)
            ]);
            currentBook = await czRes.json();
            kjvBook = await enRes.json();
            renderVerses();
        } catch (e) {
            verseDisplay.innerHTML = '<p style="color:red;">Chyba při načítání knihy: ' + e.message + '</p>';
        }
    }

    const BOOK_LIST_KJV = {};
    const BOOK_LIST_EN = [
        'Genesis': 'Genesis', 'Exodus': 'Exodus', 'Leviticus': 'Leviticus',
        'Numbers': 'Numeri', 'Deuteronomy': 'Deuteronomium',
        'Joshua': 'Jozue', 'Judges': 'Soudci', 'Ruth': 'Rut',
        'I Samuel': '1 Samuelova', 'II Samuel': '2 Samuelova',
        'I Kings': '1 Královská', 'II Kings': '2 Královská',
        'I Chronicles': '1 Paralipomenon', 'II Chronicles': '2 Paralipomenon',
        'Ezra': 'Ezrdras', 'Nehemiah': 'Nehemjas', 'Esther': 'Ester',
        'Job': 'Job', 'Psalms': 'Žalmy', 'Proverbs': 'Přísloví',
        'Ecclesiastes': 'Kazatel', 'Song of Solomon': 'Píseň písní',
        'Isaiah': 'Izajas', 'Jeremiah': 'Jeremjás', 'Lamentations': 'Pláč',
        'Ezekiel': 'Ezechiel', 'Daniel': 'Daniel',
        'Hosea': 'Ozeas', 'Joel': 'Joel', 'Amos': 'Amos',
        'Obadiah': 'Abdijas', 'Jonah': 'Jonas', 'Micah': 'Micheas',
        'Nahum': 'Nahum', 'Habakkuk': 'Abakuk', 'Zephaniah': 'Sofonjas',
        'Haggai': 'Ageus', 'Zechariah': 'Zacharias', 'Malachi': 'Malachias',
        'Matthew': 'Matouš', 'Mark': 'Marek', 'Luke': 'Lukas', 'John': 'Jan',
        'Acts': 'Skutky apoštolů',
        'Romans': 'Římanům', 'I Corinthians': '1 Korintským',
        'II Corinthians': '2 Korintským', 'Galatians': 'Galatským',
        'Ephesians': 'Efezským', 'Philippians': 'Filipským',
        'Colossians': 'Koloským', 'I Thessalonians': '1 Tesalonickým',
        'II Thessalonians': '2 Tesalonickým', 'I Timothy': '1 Timoteovi',
        'II Timothy': '2 Timoteovi', 'Titus': 'Titovi', 'Philemon': 'Filemonovi',
        'Hebrews': 'Židům', 'James': 'Jakubův', 'I Peter': '1 Petrův',
        'II Peter': '2 Petrův', 'I John': '1 Janův', 'II John': '2 Janův',
        'III John': '3 Janův', 'Jude': 'Juda', 'Revelation of John': 'Zjevení Janovo'
    };

    function renderVerses() {
        if (!currentBook) return;

        const czName = NAME_MAP[currentBook.name] || currentBook.name;

        let html = '';
        for (const ch of currentBook.chapters) {
            html += `<h3 style="font-family:'Cinzel',serif;font-size:0.9rem;color:var(--violet);margin:1.5rem 0 1rem;">Kapitola ${ch.chapter}</h3>`;
            for (const v of ch.verses) {
                const text = parseMarkers(v.text, czName, ch.chapter, v.verse);
                html += `<div class="verse"><span class="verse-num">${v.verse}</span>${text}</div>`;
            }
        }
        verseDisplay.innerHTML = html;
    }

    function getEnglishName(czName) {
        const idx = BOOK_LIST_CZ.indexOf(czName);
        return idx >= 0 ? BOOK_LIST_EN[idx] : czName;
    }

    function getCzechName(enName) {
        return NAME_MAP[enName] || enName;
    }

    function parseMarkers(text, bookName, chapter, verse) {
        const enName = getEnglishName(bookName);
        const id = `${enName.replace(/ /g, '_')}_${chapter}_${verse}`;
        return text.replace(/⌈([^⌉]+)⌉/g, 
            '<span class="detail-trigger" data-id="' + id + '">$1</span>'
        );
    }

    function handleDetailClick(e) {
        const trigger = e.target.closest('.detail-trigger');
        if (!trigger) return;

        const id = trigger.dataset.id;
        const parsed = parseId(id);
        showCommentary(parsed);
    }

    function parseId(id) {
        const parts = id.split('_');
        const verse = parts.pop();
        const chapter = parts.pop();
        const bookName = parts.join(' ');
        return { bookName, chapter, verse, id };
    }

    function showCommentary(parsed) {
        if (!commentaries || !commentaries[parsed.id]) {
            commentaryPanel.innerHTML = 
                '<div class="commentary-box"><p class="commentary-empty">K tomuto verši zatím není rozbor doplněn.</p></div>';
            const sidebar = document.getElementById('commentary-sidebar');
            if (sidebar && window.innerWidth <= 768) {
                sidebar.classList.add('mobile-visible');
            }
            return;
        }

        const c = commentaries[parsed.id];
        const czBookName = getCzechName(parsed.bookName);
        commentaryPanel.innerHTML = 
            '<div class="commentary-box">' +
            '<p class="commentary-ref">' + czBookName + ' ' + parsed.chapter + ':' + parsed.verse + '</p>' +
            '<p class="commentary-content">' + c.text + '</p>' +
            '</div>';
        const sidebar = document.getElementById('commentary-sidebar');
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.add('mobile-visible');
        }
    }

    init();
})();