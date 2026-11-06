import {
  FLOORS, BLIND_NAMES, HAND_SIZE, DISCARDS, START_STACK, MIN_STAKE,
  WIN_BONUS_PER_HAND, STAKE_CAP_RATIO, REROLL_COST,
} from './config.js';
import { makeDeck, shuffle, sortByRank } from './cards.js';
import { resolvePlay } from './scoring.js';
import { SHAPES, SHOP_COLORS, LEVEL_PRICE, canEngrave } from './engravings.js';

const SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 };

export class Game {
  constructor() {
    this.resetRun();
  }

  resetRun() {
    this.floor = 0;
    this.blind = 0;
    this.stack = START_STACK;
    this.allCards = makeDeck();
    this.drawPile = shuffle(this.allCards);
    this.discardPile = [];
    this.hand = [];
    this.played = [];
    this.selected = new Set();
    this.lastResult = null;
    this.phase = 'bet';
    this.shopOffers = [];
    this.pending = null;
    this.rerollCost = REROLL_COST;
    this.startRound();
  }

  get floorCfg() {
    return FLOORS[Math.min(this.floor, FLOORS.length - 1)];
  }

  get target() {
    return this.floorCfg.targets[this.blind];
  }

  get maxHands() {
    return this.floorCfg.hands[this.blind];
  }

  get blindName() {
    return BLIND_NAMES[this.blind];
  }

  startRound() {
    this.discardPile.push(...this.hand, ...this.played);
    this.hand = [];
    this.played = [];
    this.selected.clear();
    this.lastResult = null;
    this.roundScore = 0;
    this.handsLeft = this.maxHands;
    this.discardsLeft = DISCARDS;
    this.stake = 0;
    this.hand = this.draw(HAND_SIZE);
    sortByRank(this.hand);
  }

  draw(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!this.drawPile.length) {
        if (!this.discardPile.length) break;
        this.drawPile = shuffle(this.discardPile);
        this.discardPile = [];
      }
      out.push(this.drawPile.pop());
    }
    return out;
  }

  betOptions() {
    const cap = Math.max(MIN_STAKE, Math.min(Math.floor(this.stack / 2), Math.floor(this.target * STAKE_CAP_RATIO)));
    const mid = Math.max(MIN_STAKE, Math.round(cap / 2));
    const raw = [
      { label: '小注', value: Math.min(MIN_STAKE, cap) },
      { label: '中注', value: mid },
      { label: '全押', value: cap },
    ];
    const seen = new Set();
    return raw.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }

  chooseStake(value) {
    if (this.phase !== 'bet') return false;
    this.stake = Math.min(value, this.stack);
    this.roundScore = this.stake;
    this.phase = 'play';
    return true;
  }

  toggleSelect(index) {
    if (this.phase !== 'play') return;
    if (index < 0 || index >= this.hand.length) return;
    if (this.selected.has(index)) {
      this.selected.delete(index);
      return;
    }
    if (this.selected.size >= 5) return;
    this.selected.add(index);
  }

  selectedCards() {
    return [...this.selected].sort((a, b) => a - b).map((i) => this.hand[i]);
  }

  preview() {
    const cards = this.selectedCards();
    if (!cards.length) return null;
    return resolvePlay(cards, { roundScore: this.roundScore, preview: true });
  }

  play() {
    if (this.phase !== 'play' || this.selected.size === 0) return null;

    const cards = this.selectedCards();
    const result = resolvePlay(cards, { roundScore: this.roundScore });
    this.roundScore += result.total;
    this.handsLeft--;

    const keep = this.hand.filter((_, i) => !this.selected.has(i));
    this.selected.clear();
    this.played = sortByRank(cards.slice());
    this.hand = keep;

    const returnCards = result.post.returnCards;
    const markCards = result.post.markCards;

    for (const c of cards) {
      if (returnCards.includes(c) || markCards.includes(c)) continue;
      this.discardPile.push(c);
    }

    if (result.post.hut > 0) {
      for (const c of keep) c.bonusChips = (c.bonusChips || 0) + result.post.hut;
    }

    this.hand.push(...this.draw(Math.max(0, HAND_SIZE - this.hand.length)));
    this.hand.push(...returnCards);
    if (result.post.draw > 0) this.hand.push(...this.draw(result.post.draw));
    this.drawPile.push(...markCards);
    sortByRank(this.hand);

    this.lastResult = {
      name: result.name,
      chips: result.chips,
      mult: result.mult,
      xmult: result.xmult,
      total: result.total,
      log: result.log,
      roundScore: this.roundScore,
      key: result.key,
    };

    if (this.roundScore >= this.target) this.win();
    else if (this.handsLeft <= 0) this.lose();

    return this.lastResult;
  }

  discard() {
    if (this.phase !== 'play' || this.discardsLeft <= 0 || this.selected.size === 0) return false;

    const cards = this.selectedCards();
    this.discardsLeft--;
    this.discardPile.push(...cards);

    const keep = this.hand.filter((_, i) => !this.selected.has(i));
    this.selected.clear();
    this.hand = keep;
    this.hand.push(...this.draw(Math.max(0, HAND_SIZE - keep.length)));
    sortByRank(this.hand);
    return true;
  }

  win() {
    this.bonus = this.handsLeft * WIN_BONUS_PER_HAND;
    this.payout = this.stake * 2 + this.bonus;
    this.stack += this.payout;
    this.phase = 'won';
  }

  lose() {
    this.stack = Math.max(0, this.stack - this.stake);
    this.phase = this.stack < MIN_STAKE ? 'over' : 'lost';
  }

  advance() {
    if (this.phase !== 'won' && this.phase !== 'lost') return;
    if (this.stack < MIN_STAKE) {
      this.phase = 'over';
      return;
    }
    const lastRound = this.floor >= FLOORS.length - 1 && this.blind >= 2;
    if (this.phase === 'won' && !lastRound) {
      this.openShop();
      return;
    }
    this.nextRound();
  }

  // ---------- 商店 ----------

  openShop() {
    this.phase = 'shop';
    this.pending = null;
    this.rerollCost = REROLL_COST;
    this.shopOffers = this.rollOffers(3);
  }

  rollOffers(n) {
    const offers = [];
    const used = new Set();
    let guard = 0;
    while (offers.length < n && guard++ < 300) {
      const shape = (Math.random() * SHAPES.length) | 0;
      const color = SHOP_COLORS[(Math.random() * SHOP_COLORS.length) | 0];
      const r = Math.random();
      const level = r < 0.62 ? 1 : r < 0.91 ? 2 : 3;
      const key = `${shape}:${color}:${level}`;
      if (used.has(key)) continue;
      used.add(key);
      offers.push({ shape, color, level, price: LEVEL_PRICE[level] });
    }
    return offers;
  }

  reroll() {
    if (this.phase !== 'shop') return false;
    if (this.stack < this.rerollCost) return false;
    this.stack -= this.rerollCost;
    this.rerollCost += 2;
    this.shopOffers = this.rollOffers(3);
    return true;
  }

  beginPick(index) {
    if (this.phase !== 'shop') return false;
    const offer = this.shopOffers[index];
    if (!offer || this.stack < offer.price) return false;
    this.pending = { offer, index };
    this.phase = 'pick';
    return true;
  }

  cancelPick() {
    if (this.phase !== 'pick') return false;
    this.pending = null;
    this.phase = 'shop';
    return true;
  }

  deckView() {
    return this.allCards
      .slice()
      .sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || b.rank - a.rank);
  }

  applyPending(card) {
    const p = this.pending;
    if (!p || !card) return false;
    if (!canEngrave(card, p.offer)) return false;
    if (this.stack < p.offer.price) return false;
    this.stack -= p.offer.price;
    card.engraving = { shape: p.offer.shape, color: p.offer.color, level: p.offer.level };
    this.shopOffers = this.shopOffers.filter((_, i) => i !== p.index);
    this.pending = null;
    this.phase = 'shop';
    return true;
  }

  leaveShop() {
    if (this.phase !== 'shop') return false;
    this.pending = null;
    this.shopOffers = [];
    this.nextRound();
    return true;
  }

  nextRound() {
    this.blind++;
    if (this.blind >= 3) {
      this.blind = 0;
      this.floor++;
    }
    if (this.floor >= FLOORS.length) {
      this.phase = 'clear';
      return;
    }
    this.phase = 'bet';
    this.startRound();
  }
}