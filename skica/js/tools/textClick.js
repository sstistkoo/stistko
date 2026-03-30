// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Nástroj: Textová anotace                         ║
// ╚══════════════════════════════════════════════════════════════╝

import { state, showToast } from '../state.js';
import { addObject } from '../objects.js';
import { COLORS } from '../constants.js';

/**
 * Kliknutí při aktivním nástroji "text".
 * Zobrazí prompt pro zadání textu a umístí anotaci na pozici kliknutí.
 */
export function handleTextClick(wx, wy) {
  const text = prompt('Zadejte text anotace:');
  if (!text || text.trim() === '') return;

  addObject({
    type: 'text',
    x: wx,
    y: wy,
    text: text.trim(),
    fontSize: 14,
    rotation: 0,
    name: `Text "${text.trim().substring(0, 20)}"`,
    color: COLORS.textSecondary,
  });
  showToast('Text přidán');
}
