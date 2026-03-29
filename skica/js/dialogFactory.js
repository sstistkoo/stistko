// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Dialog Factory (sdílené vytváření overlayů)       ║
// ╚══════════════════════════════════════════════════════════════╝

/**
 * Vytvoří calc-overlay se standardním layoutem (titlebar + close + body).
 * Pokud overlay daného typu již existuje, vrátí null.
 */
export function makeOverlay(type, title, bodyHTML, windowClass) {
  if (document.querySelector(`.calc-overlay[data-type=${type}]`)) return null;
  const overlay = document.createElement("div");
  overlay.className = "calc-overlay";
  overlay.dataset.type = type;
  overlay.innerHTML =
    '<div class="calc-window ' + (windowClass || "cnc-window") + '">' +
      '<div class="calc-titlebar"><h3>' + title + '</h3><button class="calc-close-btn">\u2715</button></div>' +
      '<div class="calc-body">' + bodyHTML + '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector(".calc-close-btn").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  return overlay;
}
