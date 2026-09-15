import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, contrastRatio } from '../contrast';

const AA_TEXT = 4.5;

const PAIRS = [
  ['body text on the page', 'fg', 'bg'],
  ['muted text on the page', 'muted', 'bg'],
  ['muted text on a card', 'muted', 'surface'],
  ['button label on the accent', 'brandFg', 'brand'],
  ['a link in the accent colour', 'brand', 'bg'],
] as const;

for (const theme of ['light', 'dark'] as const) {
  describe(`${theme} palette meets WCAG AA`, () => {
    for (const [label, a, b] of PAIRS) {
      it(label, () => {
        const ratio = contrastRatio(PALETTE[theme][a], PALETTE[theme][b]);
        assert.ok(
          ratio >= AA_TEXT,
          `${label} is ${ratio.toFixed(2)}:1, below the ${AA_TEXT}:1 needed for text`,
        );
      });
    }
  });
}
