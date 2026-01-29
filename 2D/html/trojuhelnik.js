let bylVypocitan = false;
let zobrazeniMod = 'kuzel';

function vypocitat() {
    const a = Number(document.getElementById('stranaA').value);
    const b = Number(document.getElementById('stranaB').value);
    const c = Number(document.getElementById('stranaC').value);
    const alfa = Number(document.getElementById('uhelAlfa').value);
    const beta = Number(document.getElementById('uhelBeta').value);

    let delkyInfo = document.getElementById('delkyInfo');
    let uhlyInfo = document.getElementById('uhlyInfo');
    let chybovaHlaska = document.getElementById('chybovaHlaska');

    // Kontrola správnosti zadání
    if (zobrazeniMod !== 'kuzel') {
        let pocetUhlu = [alfa, beta].filter(x => x > 0).length;
        if (pocetUhlu > 1) {
            chybovaHlaska.textContent = "Nelze zadat dva úhly - jeden úhel je vždy 90°";
            return;
        }
    }

    // Reset chybové hlášky
    chybovaHlaska.textContent = '';

    // Synchronizace hodnot pro kužel
    if (zobrazeniMod === 'kuzel') {
        const kuzelVyska = Number(document.getElementById('kuzelVyska').value);
        const kuzelUhel = Number(document.getElementById('kuzelUhel').value);

        if (kuzelVyska) document.getElementById('stranaA').value = kuzelVyska;
        if (kuzelUhel) document.getElementById('uhelBeta').value = kuzelUhel;
    }

    // 1. Známe dvě odvěsny (a,b)
    if (a && b && !c && !alfa && !beta) {
        const vypC = Math.sqrt(a*a + b*b);
        const vypAlfa = Math.asin(a/vypC) * 180/Math.PI;
        const vypBeta = Math.asin(b/vypC) * 180/Math.PI;

        aktualizujVysledky({c: vypC, alfa: vypAlfa, beta: vypBeta});
        delkyInfo.textContent = "Vypočteno z odvěsen a,b";
    }
    // 2. Známe přeponu a jednu odvěsnu (c,a)
    else if (a && !b && c && !alfa && !beta) {
        if (c <= a) {
            alert("Přepona musí být delší než odvěsna!");
            return;
        }
        const vypB = Math.sqrt(c*c - a*a);
        const vypAlfa = Math.asin(a/c) * 180/Math.PI;
        const vypBeta = 90 - vypAlfa;

        aktualizujVysledky({b: vypB, alfa: vypAlfa, beta: vypBeta});
        delkyInfo.textContent = "Vypočteno z c,a";
    }
    // 3. Známe odvěsnu a přilehlý úhel (a,beta)
    else if (a && !b && !c && !alfa && beta) {
        if (beta >= 90) {
            alert("Úhel β musí být menší než 90°!");
            return;
        }
        const vypB = a * Math.tan(beta * Math.PI/180);
        const vypC = a / Math.cos(beta * Math.PI/180);
        const vypAlfa = 90 - beta;

        aktualizujVysledky({b: vypB, c: vypC, alfa: vypAlfa});
        uhlyInfo.textContent = "Vypočteno z a,β";
    }
    // 4. Známe odvěsnu a protilehlý úhel (a,alfa)
    else if (a && !b && !c && alfa && !beta) {
        if (alfa >= 90) {
            alert("Úhel α musí být menší než 90°!");
            return;
        }
        const vypC = a / Math.sin(alfa * Math.PI/180);
        const vypB = Math.sqrt(vypC*vypC - a*a);
        const vypBeta = 90 - alfa;

        aktualizujVysledky({b: vypB, c: vypC, beta: vypBeta});
        uhlyInfo.textContent = "Vypočteno z a,α";
    }
    // 5. Známe přeponu a úhel (c,alfa)
    else if (!a && !b && c && alfa && !beta) {
        if (alfa >= 90) {
            alert("Úhel α musí být menší než 90°!");
            return;
        }
        const vypA = c * Math.sin(alfa * Math.PI/180);
        const vypB = c * Math.cos(alfa * Math.PI/180);
        const vypBeta = 90 - alfa;

        aktualizujVysledky({a: vypA, b: vypB, beta: vypBeta});
        delkyInfo.textContent = "Vypočteno z c,α";
    }
    else {
        if (zobrazeniMod === 'kuzel') {
            // Pro kužel nehlásíme chybu, jen překreslíme
            bylVypocitan = true;
            prekresliTrojuhelnik();
            return;
        }

        // Pro trojúhelník - kontrola vstupů
        let pocetZadanych = [a, b, c, alfa, beta].filter(x => x > 0).length;
        if (pocetZadanych !== 2) {
            chybovaHlaska.textContent = "Pro výpočet je potřeba zadat právě dva údaje";
            return;
        }

        alert("Zadejte právě dva údaje pro výpočet!");
        return;
    }

    bylVypocitan = true;
    prekresliTrojuhelnik();
}

function aktualizujVysledky({a, b, c, alfa, beta} = {}) {
    if (a) document.getElementById('stranaA').value = a.toFixed(2);
    if (b) document.getElementById('stranaB').value = b.toFixed(2);
    if (c) document.getElementById('stranaC').value = c.toFixed(2);
    if (alfa) document.getElementById('uhelAlfa').value = alfa.toFixed(2);
    if (beta) document.getElementById('uhelBeta').value = beta.toFixed(2);

    if (zobrazeniMod === 'kuzel') {
        // Aktualizace propojených polí kužele
        document.getElementById('kuzelVyska').value = document.getElementById('stranaA').value;
        document.getElementById('kuzelUhel').value = document.getElementById('uhelBeta').value;

        // Výpočet spodního průměru D2
        const d1 = Number(document.getElementById('prumer').value) || 0;
        const stranaB = Number(document.getElementById('stranaB').value) || 0;
        const d2 = d1 + (2 * stranaB);
        document.getElementById('spodniPrumer').value = d2.toFixed(2);

        // Pokud není zadán průměr, použijeme vypočtenou stranu b
        if (!d1 && stranaB) {
            document.getElementById('prumer').value = stranaB;
        }
    }
}

function resetovat() {
    ['stranaA','stranaB','stranaC','uhelAlfa','uhelBeta','prumer'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
            element.style.backgroundColor = '';
        }
    });
    document.getElementById('delkyInfo').textContent = '';
    document.getElementById('uhlyInfo').textContent = '';
    document.getElementById('chybovaHlaska').textContent = '';
    prekresliTrojuhelnik();
    ['stranaA', 'stranaB', 'stranaC', 'uhelAlfa', 'uhelBeta'].forEach(id => {
        document.getElementById(id).style.backgroundColor = '';
    });
    bylVypocitan = false;
    prekresliTrojuhelnik();
}

function prepniZobrazeni(mod) {
    zobrazeniMod = mod;
    document.getElementById('kuzelParams').style.display = mod === 'kuzel' ? 'block' : 'none';
    // Zachováme všechny hodnoty a překreslíme
    prekresliTrojuhelnik();
}

function prekresliTrojuhelnik() {
    const canvas = document.getElementById('platno');

    // Přizpůsobení velikosti canvasu pro mobilní zařízení
    const containerWidth = canvas.parentElement.clientWidth - 20;
    canvas.width = containerWidth;
    canvas.height = Math.min(containerWidth * 0.75, window.innerHeight * 0.4);

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const a = Number(document.getElementById('stranaA').value);
    const b = Number(document.getElementById('stranaB').value);

    if (!bylVypocitan) {
        if (zobrazeniMod === 'kuzel') {
            nakresliVzorovyKuzel(ctx, canvas.width, canvas.height);
        } else {
            nakresliVzorovyTrojuhelnik(ctx, canvas.width, canvas.height);
        }
        return;
    }

    if (!a || !b) return;

    if (zobrazeniMod === 'kuzel') {
        const prumer = Number(document.getElementById('prumer').value);
        if (prumer) {
            nakresliKuzel(ctx, canvas.width, canvas.height);
        } else {
            // Pokud není zadán průměr, použijeme hodnotu strany b
            document.getElementById('prumer').value = b;
            nakresliKuzel(ctx, canvas.width, canvas.height);
        }
    } else {
        // Výpočet měřítka pro přizpůsobení trojúhelníku
        const margin = 50;
        const scaleX = (canvas.width - 2 * margin) / b;
        const scaleY = (canvas.height - 2 * margin) / a;
        const scale = Math.min(scaleX, scaleY);

        // Centrování trojúhelníku
        const startX = (canvas.width - b * scale) / 2;
        const startY = canvas.height - margin;

        // Vykreslení trojúhelníku
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + b * scale, startY);
        ctx.lineTo(startX, startY - a * scale);
        ctx.closePath();

        ctx.fillStyle = '#e0e0ff';
        ctx.fill();
        ctx.stroke();

        // Vykreslení pravého úhlu
        const velikostCtverecku = 20 * scale;
        ctx.beginPath();
        ctx.moveTo(startX + velikostCtverecku, startY);
        ctx.lineTo(startX + velikostCtverecku, startY - velikostCtverecku);
        ctx.lineTo(startX, startY - velikostCtverecku);
        ctx.stroke();

        // Výpočet hodnot
        const c = Math.sqrt(a*a + b*b);
        const alfa = Math.asin(a/c) * 180/Math.PI;
        const beta = Math.asin(b/c) * 180/Math.PI;

        // Vykreslení popisků s přizpůsobenou velikostí písma
        const fontSize = Math.max(12, Math.min(16, scale * 14));
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = 'black';

        // Popisky stran
        ctx.fillText(`a = ${a}`, startX - 40, startY - a * scale/2);
        ctx.fillText(`b = ${b}`, startX + b * scale/2, startY + 25);
        ctx.fillText(`c = ${c.toFixed(1)}`, startX + b * scale/3, startY - a * scale/3);

        // Popisky úhlů
        ctx.fillText(`α = ${alfa.toFixed(1)}°`, startX + b * scale - 40, startY - 10);
        ctx.fillText(`β = ${beta.toFixed(1)}°`, startX + 10, startY - a * scale + 20);
        ctx.fillText(`90°`, startX + 25, startY - 25);
    }
}

function nakresliKuzel(ctx, width, height) {
    const a = Number(document.getElementById('stranaA').value);
    const b = Number(document.getElementById('stranaB').value);
    const prumer = Number(document.getElementById('prumer').value) || b;

    if (!a || !b) return;

    const margin = 50;
    const scale = Math.min((width - 2 * margin) / (prumer + b), (height - 2 * margin) / a);

    // Centrování
    const startX = width / 2;
    const startY = height - margin;

    // Vykreslení obdélníku (rozvinutá část)
    ctx.beginPath();
    ctx.moveTo(startX - prumer/2 * scale, startY);
    ctx.lineTo(startX + prumer/2 * scale, startY);
    ctx.lineTo(startX + prumer/2 * scale, startY - a * scale);
    ctx.lineTo(startX - prumer/2 * scale, startY - a * scale);
    ctx.closePath();
    ctx.fillStyle = '#e0e0ff';
    ctx.fill();
    ctx.stroke();

    // Vykreslení trojúhelníků po stranách
    // Levý trojúhelník
    ctx.beginPath();
    ctx.moveTo(startX - prumer/2 * scale, startY);
    ctx.lineTo(startX - prumer/2 * scale - b * scale, startY);
    ctx.lineTo(startX - prumer/2 * scale, startY - a * scale);
    ctx.closePath();
    ctx.fillStyle = '#d0d0ff';
    ctx.fill();
    ctx.stroke();

    // Pravý trojúhelník
    ctx.beginPath();
    ctx.moveTo(startX + prumer/2 * scale, startY);
    ctx.lineTo(startX + prumer/2 * scale + b * scale, startY);
    ctx.lineTo(startX + prumer/2 * scale, startY - a * scale);
    ctx.closePath();
    ctx.fillStyle = '#d0d0ff';
    ctx.fill();
    ctx.stroke();

    // Čárkovaná osa uprostřed
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY - a * scale);
    ctx.stroke();
    ctx.setLineDash([]);

    // Popisky
    ctx.fillStyle = 'black';
    const fontSize = Math.max(12, Math.min(16, scale * 14));
    ctx.font = `${fontSize}px Arial`;

    ctx.fillText(`a = ${a}`, startX - 20, startY - a * scale/2 - 10);
    ctx.fillText(`b = ${b}`, startX + prumer/2 * scale + b * scale/2, startY + 20);
    ctx.fillText(`D₁ = ${prumer}`, startX - prumer/4 * scale, startY - a * scale - 10);
    ctx.fillText(`D₂ = ${(prumer + 2*b).toFixed(1)}`, startX - prumer/4 * scale, startY + 40);
}

function nakresliVzorovyTrojuhelnik(ctx, width, height) {
    const a = 100;
    const b = 150;

    // Výpočet měřítka pro vzorový trojúhelník
    const margin = 50;
    const scaleX = (width - 2 * margin) / b;
    const scaleY = (height - 2 * margin) / a;
    const scale = Math.min(scaleX, scaleY) * 0.8;

    const startX = (width - b * scale) / 2;
    const startY = height - margin;

    // Vykreslení trojúhelníku
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + b * scale, startY);
    ctx.lineTo(startX, startY - a * scale);
    ctx.closePath();
    ctx.fillStyle = '#e0e0ff';
    ctx.fill();
    ctx.stroke();

    // Popisky
    ctx.fillStyle = 'black';
    const fontSize = Math.max(14, scale * 12);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText('a', startX - 20, startY - a * scale/2);
    ctx.fillText('b', startX + b * scale/2, startY + 25);
    ctx.fillText('c', startX + b * scale/3, startY - a * scale/3);
    ctx.fillText('α', startX + b * scale - 30, startY - 10);
    ctx.fillText('β', startX + 10, startY - a * scale + 20);
    ctx.fillText('90°', startX + 25, startY - 25);
}

function nakresliVzorovyKuzel(ctx, width, height) {
    const a = 100;  // výška
    const b = 150;  // strana trojúhelníku
    const prumer = b;  // výchozí průměr

    const margin = 50;
    const scale = Math.min((width - 2 * margin) / (prumer + b), (height - 2 * margin) / a) * 0.8;

    // Centrování
    const startX = width / 2;
    const startY = height - margin;

    // Obdélník (rozvinutá část)
    ctx.beginPath();
    ctx.moveTo(startX - prumer/2 * scale, startY);
    ctx.lineTo(startX + prumer/2 * scale, startY);
    ctx.lineTo(startX + prumer/2 * scale, startY - a * scale);
    ctx.lineTo(startX - prumer/2 * scale, startY - a * scale);
    ctx.closePath();
    ctx.fillStyle = '#e0e0ff';
    ctx.fill();
    ctx.stroke();

    // Trojúhelníky
    [1, -1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(startX + side * prumer/2 * scale, startY);
        ctx.lineTo(startX + side * (prumer/2 + b) * scale, startY);
        ctx.lineTo(startX + side * prumer/2 * scale, startY - a * scale);
        ctx.closePath();
        ctx.fillStyle = '#d0d0ff';
        ctx.fill();
        ctx.stroke();
    });

    // Popisky
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.fillText('a', startX - 20, startY - a * scale/2);
    ctx.fillText('b', startX + prumer/2 * scale + b * scale/2, startY + 20);
    ctx.fillText('D₁', startX - 10, startY - a * scale - 10);
    ctx.fillText('D₂', startX - 10, startY + 40);
}

// Přidáme událost pro automatický výpočet při změně hodnot
function pridejEventListenery() {
    ['stranaA', 'stranaB', 'stranaC', 'uhelAlfa', 'uhelBeta', 'prumer', 'kuzelVyska', 'kuzelUhel'].forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;

        element.addEventListener('focus', function() {
            // Automatické doplnění druhého úhlu
            if (id === 'uhelAlfa' || id === 'uhelBeta') {
                const alfa = Number(document.getElementById('uhelAlfa').value);
                const beta = Number(document.getElementById('uhelBeta').value);

                if (id === 'uhelAlfa' && beta && !alfa) {
                    document.getElementById('uhelAlfa').value = (90 - beta).toFixed(2);
                }
                if (id === 'uhelBeta' && alfa && !beta) {
                    document.getElementById('uhelBeta').value = (90 - alfa).toFixed(2);
                }
            }

            if (getPocetVyplnenych() === 2) {
                vypocitat();
            }
        });

        // Synchronizace hodnot při změně
        element.addEventListener('input', function() {
            if (zobrazeniMod === 'kuzel') {
                if (id === 'kuzelVyska') {
                    document.getElementById('stranaA').value = this.value;
                }
                if (id === 'kuzelUhel') {
                    document.getElementById('uhelBeta').value = this.value;
                }
            }
            zvyrazniDalsiPolicka(id);
        });

        // Výpočet až při opuštění pole nebo stisknutí Enter
        element.addEventListener('blur', function() {
            if (getPocetVyplnenych() === 2) {
                vypocitat();
            }
        });

        element.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && getPocetVyplnenych() === 2) {
                vypocitat();
            }
        });
    });
}

function getPocetVyplnenych() {
    const hodnoty = {
        a: Number(document.getElementById('stranaA').value),
        b: Number(document.getElementById('stranaB').value),
        c: Number(document.getElementById('stranaC').value),
        alfa: Number(document.getElementById('uhelAlfa').value),
        beta: Number(document.getElementById('uhelBeta').value)
    };

    // V režimu kužele počítáme i s průměrem
    if (zobrazeniMod === 'kuzel') {
        hodnoty.prumer = Number(document.getElementById('prumer').value);
        delete hodnoty.c;  // V režimu kužele nepoužíváme stranu c
    }

    return Object.values(hodnoty).filter(v => v > 0).length;
}

function zvyrazniDalsiPolicka(aktualniId) {
    const vsechnaPolicka = ['stranaA', 'stranaB', 'stranaC', 'uhelAlfa', 'uhelBeta'];
    const pocetVyplnenych = getPocetVyplnenych();

    vsechnaPolicka.forEach(id => {
        const element = document.getElementById(id);
        if (!element.value && pocetVyplnenych === 1) {
            element.style.backgroundColor = '#e8f4ff';  // Zvýraznění prázdných políček
        } else {
            element.style.backgroundColor = '';  // Návrat k původní barvě
        }
    });
}

// Upravíme inicializaci
window.onload = function() {
    pridejEventListenery();
    resetovat();
    // Přidáme inicializaci zobrazení kužele
    document.getElementById('kuzelParams').style.display = 'block';
};

// Přidáme posluchač pro změnu velikosti okna
window.addEventListener('resize', prekresliTrojuhelnik);

// Přidáme posluchač pro změnu orientace zařízení
window.addEventListener('orientationchange', function() {
    setTimeout(prekresliTrojuhelnik, 100);
});
