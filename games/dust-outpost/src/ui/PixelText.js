import * as Phaser from '../../vendor/phaser.esm.min.js';

const PUNCT = {
  white: { '/': 144, '+': 145, '-': 146 },
  purple: { '/': 90, '+': 91, '-': 92 },
};

function frameFor(ch, color) {
  const digitsBase = color === 'purple' ? 93 : 147;
  const aBase = color === 'purple' ? 108 : 162;
  const nBase = color === 'purple' ? 126 : 180;

  if (ch >= '0' && ch <= '9') return digitsBase + (ch.charCodeAt(0) - 48);
  if (ch >= 'A' && ch <= 'Z') {
    const i = ch.charCodeAt(0) - 65;
    return i < 13 ? aBase + i : nBase + (i - 13);
  }
  const p = PUNCT[color] || PUNCT.white;
  return p[ch] ?? null;
}

export default class PixelText extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text = '', style = {}) {
    super(scene, x, y);
    this.scene = scene;
    this.px = style.size ?? 16;
    this.color = style.color ?? 'white';
    this.gap = style.gap ?? 2;
    this.align = style.align ?? 'left';
    this.text = null;
    scene.add.existing(this);
    this.setText(text);
  }

  setText(value) {
    const str = String(value).toUpperCase();
    if (str === this.text) return this;
    this.text = str;
    this.removeAll(true);

    const adv = this.px + this.gap;
    const total = str.length * adv - this.gap;
    const offset = this.align === 'center' ? -total / 2 : this.align === 'right' ? -total : 0;

    for (let i = 0; i < str.length; i++) {
      const frame = frameFor(str[i], this.color);
      if (frame == null) continue;
      const img = this.scene.add
        .image(offset + i * adv, 0, 'ui', frame)
        .setOrigin(0, 0)
        .setScale(this.px / 16);
      this.add(img);
    }
    return this;
  }
}