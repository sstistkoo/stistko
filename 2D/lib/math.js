// math.js
// Modul pro matematické výpočty pro CNC AI aplikaci

// Příklad: výpočet délky úsečky
export function delkaUsecky(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Příklad: převod stupňů na radiány
export function degToRad(deg) {
    return deg * (Math.PI / 180);
}

// Příklad: převod radiánů na stupně
export function radToDeg(rad) {
    return rad * (180 / Math.PI);
}

// Trigonometrické funkce
export function sinus(x) {
    return Math.sin(x);
}

export function cosinus(x) {
    return Math.cos(x);
}

export function tangens(x) {
    return Math.tan(x);
}

export function arcSinus(x) {
    return Math.asin(x);
}

export function arcCosinus(x) {
    return Math.acos(x);
}

export function arcTangens(x) {
    return Math.atan(x);
}

// Další matematické funkce lze přidávat sem podle potřeby
