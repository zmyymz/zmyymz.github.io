const FILES = [
  'cardPlace1', 'cardPlace2', 'cardPlace3',
  'cardSlide1', 'cardSlide2', 'cardSlide3',
  'chipsCollide1', 'chipsCollide2', 'chipsCollide3',
  'dieShuffle1', 'dieThrow1', 'dieThrow2',
];

const groups = {};
let ac = null;
let master = null;

export function unlockAudio() {
  if (!ac) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = 0.6;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}

export async function loadSounds() {
  unlockAudio();
  if (!ac) return;
  await Promise.all(FILES.map(async (name) => {
    try {
      const res = await fetch(`assets/${name}.ogg`);
      const buf = await ac.decodeAudioData(await res.arrayBuffer());
      const group = name.replace(/\d+$/, '');
      (groups[group] ||= []).push(buf);
    } catch {
      // 缺音效不影响游戏
    }
  }));
}

export function sfx(group, { rate = 1, gain = 0.5 } = {}) {
  const list = groups[group];
  if (!ac || !list || !list.length || ac.state !== 'running') return;
  const src = ac.createBufferSource();
  src.buffer = list[(Math.random() * list.length) | 0];
  src.playbackRate.value = Math.max(0.5, rate * (0.94 + Math.random() * 0.12));

  const gn = ac.createGain();
  gn.gain.value = gain;
  src.connect(gn).connect(master);
  src.start();
}