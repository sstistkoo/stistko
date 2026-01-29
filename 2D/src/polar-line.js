// ===== POLÁRNÍ KROK ČÁRA - Fixní úhel (šedá) =====

window.updatePolarLineAngle = function (value) {
  const angle = parseFloat(value);

  if (!isNaN(angle) && value.trim() !== "") {
    // Zadána hodnota - nastavit fixní úhel (neblokuje spodní nastavení)
    window.polarLineAngleFixed = angle;
  } else {
    // Prázdná hodnota - zrušit fixní úhel
    window.polarLineAngleFixed = null;
  }
};

// Uložit referenci na původní funkci z ui.js
const originalPolarSnapFromUI = window.updateSnap;

// Rozšířit existující updateSnap funkci - kontroluje OBĚ možnosti
window.updateSnap = function (start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
  let normAngle = ((currentAngle % 360) + 360) % 360;
  const tolerance = 3;

  let candidates = [];

  // 1. Zkontroluj fixní úhel (šedá) - pokud je nastaven
  if (window.polarLineAngleFixed !== null && window.polarLineAngleFixed !== undefined) {
    const fixedAngle = window.polarLineAngleFixed;
    const diff = Math.abs(normAngle - fixedAngle);
    const diff2 = Math.abs(normAngle - fixedAngle + 360);
    const diff3 = Math.abs(normAngle - fixedAngle - 360);
    const minDiff = Math.min(diff, diff2, diff3);

    if (minDiff <= tolerance) {
      candidates.push({
        angle: fixedAngle,
        color: "#bbb", // Světle šedá pro fixní úhel
        diff: minDiff
      });
    }
  }

  // 2. Zkontroluj polární krok (žlutá) - pokud je checkbox zaškrtnutý
  const polarCheckbox = document.getElementById("polarSnapCheckboxLegacy");
  if (polarCheckbox && polarCheckbox.checked) {
    const step = parseInt(document.getElementById("polarSnapStep")?.value || "45");
    let allowed = [];
    for (let a = 0; a < 360; a += step) allowed.push(a);

    for (let allowedAngle of allowed) {
      const diff = Math.abs(normAngle - allowedAngle);
      const diff2 = Math.abs(normAngle - allowedAngle + 360);
      const diff3 = Math.abs(normAngle - allowedAngle - 360);
      const minDiff = Math.min(diff, diff2, diff3);

      if (minDiff <= tolerance) {
        candidates.push({
          angle: allowedAngle,
          color: "#facc15", // Žlutá pro polární krok
          diff: minDiff
        });
      }
    }
  }

  // Vyber nejbližší kandidát
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.diff - b.diff);
    const best = candidates[0];
    return {
      snapped: true,
      angle: best.angle,
      color: best.color
    };
  }

  return { snapped: false };
};
