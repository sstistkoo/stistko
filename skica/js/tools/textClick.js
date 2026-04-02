// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Nástroj: Textová anotace                         ║
// ╚══════════════════════════════════════════════════════════════╝

import { showToast } from '../state.js';
import { addObject } from '../objects.js';
import { COLORS } from '../constants.js';
import { showTextDialog } from '../dialogs/textDialog.js';

/**
 * Kliknutí při aktivním nástroji "text".
 * Zobrazí dialog pro zadání textu a umístí anotaci na pozici kliknutí.
 */
export function handleTextClick(wx, wy) {
  showTextDialog({}, (result) => {
    addObject({
      type: 'text',
      x: wx,
      y: wy,
      text: result.text,
      fontSize: result.fontSize,
      fontFamily: result.fontFamily,
      rotation: result.rotation,
      textAlign: result.textAlign,
      bold: result.bold,
      italic: result.italic,
      letterSpacing: result.letterSpacing,
      pathMode: result.pathMode,
      pathObjectId: result.pathObjectId,
      name: `Text "${result.text.substring(0, 20)}"`,
      color: COLORS.textSecondary,
    });
    showToast('Text přidán');
  });
}
