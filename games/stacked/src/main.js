import { W, H } from './config.js';
import { loadAssets } from './assets.js';
import { loadSounds, unlockAudio, sfx } from './audio.js';
import { Game } from './game.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

let dpr = 1;

function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * s)}px`;
  canvas.style.height = `${Math.floor(H * s)}px`;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * W,
    y: ((e.clientY - r.top) / r.height) * H,
  };
}

const game = new Game();
const view = new Renderer();

function doPlay() {
  const res = game.play();
  if (!res) return;
  sfx('cardPlace', { gain: 0.45 });
  view.onPlayed(game);
  if (game.phase === 'won') {
    view.shakeT = 0.18;
    view.burst(12, { x: 1462, y: 560 }, { x: 138, y: 800 });
  } else if (game.phase === 'lost') {
    view.burst(8, { x: 138, y: 700 }, { x: 1462, y: 800 });
  }
}

function doDiscard() {
  const ghosts = view.snapshotSelected(game);
  if (game.discard()) {
    sfx('cardSlide', { gain: 0.4 });
    view.leaveCards(ghosts);
  }
}

function onClick(x, y) {
  view.hoverInfo = null;
  const b = view.buttonAt(x, y);

  if (b && b.id === 'chart') {
    view.chartOpen = !view.chartOpen;
    sfx('cardSlide', { gain: 0.2, rate: 1.4 });
    return;
  }
  if (b && (b.id === 'tab0' || b.id === 'tab1')) {
    view.chartTab = b.id === 'tab1' ? 1 : 0;
    sfx('cardSlide', { gain: 0.18, rate: 1.4 });
    return;
  }
  if (view.chartOpen) {
    view.chartOpen = false;
    return;
  }

  if (b) {
    if (b.id.startsWith('bet')) {
      game.chooseStake(b.value);
      sfx('chipsCollide', { gain: 0.55 });
      sfx('cardSlide', { gain: 0.25 });
    } else if (b.id === 'play') {
      doPlay();
    } else if (b.id === 'discard') {
      doDiscard();
    } else if (b.id === 'continue') {
      game.advance();
      sfx('dieShuffle', { gain: 0.3 });
    } else if (b.id === 'restart') {
      game.resetRun();
      view.roundKey = '';
      sfx('dieShuffle', { gain: 0.35 });
    } else if (b.id === 'reroll') {
      if (game.reroll()) sfx('dieShuffle', { gain: 0.35 });
    } else if (b.id === 'leave') {
      game.leaveShop();
      sfx('dieShuffle', { gain: 0.3 });
    } else if (b.id === 'cancel') {
      game.cancelPick();
      sfx('cardSlide', { gain: 0.3 });
    }
    return;
  }

  if (game.phase === 'shop') {
    const i = view.offerAt(x, y);
    if (i >= 0) {
      const offer = game.shopOffers[i];
      if (offer && game.stack >= offer.price && game.beginPick(i)) {
        sfx('cardSlide', { gain: 0.32 });
      } else {
        sfx('dieThrow', { gain: 0.25, rate: 0.8 });
      }
    }
    return;
  }

  if (game.phase === 'pick') {
    const i = view.pickAt(x, y);
    if (i >= 0) {
      const card = game.deckView()[i];
      if (game.applyPending(card)) {
        sfx('cardPlace', { gain: 0.5 });
      } else {
        sfx('dieThrow', { gain: 0.25, rate: 0.8 });
      }
    }
    return;
  }

  const i = view.cardAt(x, y, game);
  if (i >= 0) {
    game.toggleSelect(i);
    sfx('cardSlide', { gain: 0.22, rate: 1.35 });
  }
}

canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  const { x, y } = toLogical(e);
  onClick(x, y);
});

canvas.addEventListener('pointermove', (e) => {
  const { x, y } = toLogical(e);
  const b = view.buttonAt(x, y);
  let hoverId = b ? b.id : null;

  if (!hoverId && game.phase === 'shop') {
    const i = view.offerAt(x, y);
    if (i >= 0) hoverId = `offer${i}`;
  }

  view.hoverButton = hoverId;
  view.hoverCard = game.phase === 'pick' ? view.pickAt(x, y) : view.cardAt(x, y, game);
  view.hoverInfo = view.chartOpen ? null : view.hoverTarget(x, y, game);
  canvas.style.cursor = hoverId || view.hoverCard >= 0 ? 'pointer' : 'default';
});

window.addEventListener('keydown', (e) => {
  unlockAudio();
  if (e.key === 'Escape' && view.chartOpen) {
    view.chartOpen = false;
    return;
  }
  if (e.key.toLowerCase() === 'tab') {
    e.preventDefault();
    view.chartOpen = !view.chartOpen;
    return;
  }
  if (game.phase === 'play') {
    if (e.key === ' ') { e.preventDefault(); doPlay(); }
    else if (e.key.toLowerCase() === 'x') doDiscard();
    else if (/^[1-8]$/.test(e.key)) {
      game.toggleSelect(Number(e.key) - 1);
      sfx('cardSlide', { gain: 0.2, rate: 1.35 });
    }
  } else if (e.key === 'Enter') {
    if (game.phase === 'won' || game.phase === 'lost') { game.advance(); sfx('dieShuffle', { gain: 0.3 }); }
    else if (game.phase === 'over' || game.phase === 'clear') { game.resetRun(); view.roundKey = ''; }
  }
});

window.addEventListener('resize', fit);

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  view.update(dt, game);
  view.draw(ctx, game);
  requestAnimationFrame(loop);
}

(async function boot() {
  fit();
  await loadAssets();
  loadSounds();
  const bootEl = document.getElementById('boot');
  bootEl.classList.add('gone');
  setTimeout(() => bootEl.remove(), 500);
  requestAnimationFrame(loop);
})();