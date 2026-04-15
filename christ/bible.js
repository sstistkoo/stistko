(function() {
    const BOOK_LIST = [
        'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
        'Joshua', 'Judges', 'Ruth',
        'I Samuel', 'II Samuel', 'I Kings', 'II Kings',
        'I Chronicles', 'II Chronicles', 'Ezra', 'Nehemiah', 'Esther',
        'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
        'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
        'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
        'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
        'Matthew', 'Mark', 'Luke', 'John', 'Acts',
        'Romans', 'I Corinthians', 'II Corinthians', 'Galatians', 'Ephesians',
        'Philippians', 'Colossians', 'I Thessalonians', 'II Thessalonians',
        'I Timothy', 'II Timothy', 'Titus', 'Philemon',
        'Hebrews', 'James', 'I Peter', 'II Peter', 'I John', 'II John', 'III John', 'Jude',
        'Revelation of John'
    ];

    const bookSelect = document.getElementById('book-select');
    const verseDisplay = document.getElementById('verse-display');
    const commentaryPanel = document.getElementById('commentary-panel');

    let currentBook = null;
    let commentaries = null;

    function init() {
        BOOK_LIST.forEach((name, idx) => {
            const opt = document.createElement('option');
            opt.value = `${idx + 1}`.padStart(2, '0') + '_' + name + '.json';
            opt.textContent = name;
            bookSelect.appendChild(opt);
        });

        bookSelect.addEventListener('change', loadBook);
        document.addEventListener('click', handleDetailClick);

        loadCommentaries();
    }

    async function loadCommentaries() {
        try {
            const res = await fetch('rozboru.json');
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
            const res = await fetch('bible/' + filename);
            currentBook = await res.json();
            renderVerses();
        } catch (e) {
            verseDisplay.innerHTML = '<p style="color:red;">Chyba při načítání knihy.</p>';
        }
    }

    function renderVerses() {
        if (!currentBook) return;

        let html = '';
        for (const ch of currentBook.chapters) {
            html += `<h3 style="font-family:'Cinzel',serif;font-size:0.9rem;color:var(--violet);margin:1.5rem 0 1rem;">Kapitola ${ch.chapter}</h3>`;
            for (const v of ch.verses) {
                const text = parseMarkers(v.text, currentBook.name, ch.chapter, v.verse);
                html += `<div class="verse"><span class="verse-num">${v.verse}</span>${text}</div>`;
            }
        }
        verseDisplay.innerHTML = html;
    }

    function parseMarkers(text, bookName, chapter, verse) {
        const id = `${bookName.replace(/ /g, '_')}_${chapter}_${verse}`;
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
            return;
        }

        const c = commentaries[parsed.id];
        commentaryPanel.innerHTML = 
            '<div class="commentary-box">' +
            '<p class="commentary-ref">' + parsed.bookName + ' ' + parsed.chapter + ':' + parsed.verse + '</p>' +
            '<p class="commentary-content">' + c.text + '</p>' +
            '</div>';
    }

    init();
})();