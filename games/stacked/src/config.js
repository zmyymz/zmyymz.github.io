export const W = 1600;
export const H = 900;

export const CARD_W = 140;
export const CARD_H = 190;

export const HAND_SIZE = 8;
export const DISCARDS = 3;
export const START_STACK = 80;
export const MIN_STAKE = 5;
export const WIN_BONUS_PER_HAND = 8;
export const STAKE_CAP_RATIO = 0.15;
export const REROLL_COST = 4;

export const BLIND_NAMES = ['小注', '大注', '庄家'];

// 目标值按“8 张里挑最优一手，平均约 140 分”标定；接入刻印后需要整体重调
export const FLOORS = [
  { targets: [360, 440, 520], hands: [4, 4, 4] },
  { targets: [640, 820, 1000], hands: [4, 3, 3] },
  { targets: [1040, 1320, 1600], hands: [4, 3, 3] },
  { targets: [1650, 2100, 2550], hands: [3, 3, 3] },
  { targets: [2650, 3350, 4050], hands: [3, 2, 3] },
  { targets: [4300, 5400, 6500], hands: [3, 2, 2] },
];

export const THEME = {
  felt: '#154537',
  feltDark: '#071a14',
  ink: '#f4ecd9',
  dim: '#8aa79a',
  faint: 'rgba(244, 236, 217, 0.35)',
  gold: '#e6c169',
  goldDim: 'rgba(230, 193, 105, 0.35)',
  red: '#e0574a',
  green: '#7fc98c',
  panel: 'rgba(5, 18, 14, 0.86)',
  panelEdge: 'rgba(230, 193, 105, 0.22)',
  shadow: 'rgba(0, 0, 0, 0.45)',
};