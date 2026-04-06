import type { PacificaPosition } from '@/utils/helpers/PacificaHelper';

class PositionHelper {
  static absSize(amount: number): number {
    return Math.abs(amount);
  }

  static sideTag(side: PacificaPosition['side']): 'long' | 'short' {
    return side === 'bid' ? 'long' : 'short';
  }

  /** +1 for long (bid), -1 for short (ask). */
  static sideSign(side: PacificaPosition['side']): 1 | -1 {
    return side === 'bid' ? 1 : -1;
  }

  /**
   * Signed position size: long is +abs(amount), short is -abs(amount).
   * Useful for formulas that depend on direction.
   */
  static signedAbsSize(position: Pick<PacificaPosition, 'side' | 'amount'>) {
    return this.absSize(position.amount) * this.sideSign(position.side);
  }

  /** Unrealized PnL in quote (USD): long profits when mark > entry, short when mark < entry. */
  static unrealizedPnlUsd(
    side: PacificaPosition['side'],
    amount: number,
    entryPrice: number,
    mark: number,
  ): number | null {
    if (
      !Number.isFinite(amount) ||
      amount === 0 ||
      !Number.isFinite(entryPrice) ||
      entryPrice <= 0 ||
      !Number.isFinite(mark)
    ) {
      return null;
    }
    if (side === 'bid') {
      return (mark - entryPrice) * amount;
    }
    return (entryPrice - mark) * amount;
  }

  /**
   * Base ROI %: on allocated margin when > 0, else on entry notional.
   * (UI may multiply by leverage separately.)
   */
  static unrealizedRoiPct(args: {
    pnlUsd: number;
    entryPrice: number;
    amount: number;
    margin: number;
  }): number | null {
    const { pnlUsd, entryPrice, amount, margin } = args;
    if (!Number.isFinite(pnlUsd)) return null;
    const absSize = this.absSize(amount);
    if (margin > 0 && Number.isFinite(margin)) {
      return (pnlUsd / margin) * 100;
    }
    const notional = entryPrice * absSize;
    if (!Number.isFinite(notional) || notional <= 0) return null;
    return (pnlUsd / notional) * 100;
  }

  static positionNotionalUsd(amount: number, mark: number): number | null {
    if (!Number.isFinite(mark) || mark <= 0) return null;
    const absSize = this.absSize(amount);
    if (!Number.isFinite(absSize) || absSize <= 0) return null;
    return absSize * mark;
  }

  /**
   * Snap a limit price down to the exchange tick grid (floor to increment).
   * Use market `tick_size` when available; callers may fall back to lot size if needed.
   */
  static snapLimitPriceToIncrement(price: number, increment: number): number {
    if (!Number.isFinite(price) || price <= 0) return price;
    if (!Number.isFinite(increment) || increment <= 0) return price;
    const n = Math.floor(price / increment + 1e-10);
    const snapped = n * increment;
    return snapped > 0 ? snapped : 0;
  }

  /** Decimal places to show for a snapped limit price (handles ticks like 0.5, not only powers of 10). */
  static priceIncrementDisplayDecimals(increment: number): number {
    if (!Number.isFinite(increment) || increment <= 0) return 8;
    if (increment >= 1) return 0;
    let places = 0;
    let n = increment;
    const max = 12;
    while (places < max) {
      const r = Math.round(n);
      if (Math.abs(n - r) < 1e-9) break;
      n *= 10;
      places += 1;
    }
    return Math.min(max, places);
  }

  /**
   * Format a price for display on the market `tick_size` grid (nearest tick).
   * When `tickSize` is missing or invalid, uses generic decimal formatting.
   */
  static formatPriceWithTickSize(
    price: number,
    tickSize: string | number | undefined | null,
  ): string {
    if (!Number.isFinite(price)) return '—';
    const tick =
      typeof tickSize === 'number'
        ? tickSize
        : typeof tickSize === 'string'
        ? Number(tickSize.replace(/,/g, ''))
        : NaN;
    if (!Number.isFinite(tick) || tick <= 0) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 8 });
    }
    const decimals = this.priceIncrementDisplayDecimals(tick);
    const ticks = Math.floor(price / tick);
    const rounded = ticks * tick;
    const fixed = Number(rounded.toFixed(Math.min(12, decimals)));
    return fixed.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }

  /** Floor to the nearest lot size step. */
  static floorToLotSize(amount: number, lotSize: number): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (!Number.isFinite(lotSize) || lotSize <= 0) return amount;
    const lots = Math.floor(amount / lotSize + 1e-10);
    return lots * lotSize;
  }

  /**
   * String for API: amount is assumed already on the lot grid; rebuilds from lot count to avoid float dust.
   */
  static formatCloseAmountForApi(amount: number, lotSize: number): string {
    const snapped = this.floorToLotSize(amount, lotSize);
    if (snapped <= 0) return '0';
    if (!Number.isFinite(lotSize) || lotSize <= 0) {
      return String(snapped);
    }
    const dec = this.priceIncrementDisplayDecimals(lotSize);
    const lots = Math.round(snapped / lotSize + 1e-10);
    const rebuilt = lots * lotSize;
    let s = rebuilt.toFixed(dec);
    if (dec > 0) {
      s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    }
    return s === '' ? '0' : s;
  }

  static closeAmountFromFraction(args: {
    positionAmount: number;
    closeFraction: number; // 0–1
    lotSize?: number;
  }): number {
    const absSize = this.absSize(args.positionAmount);
    if (!Number.isFinite(absSize) || absSize <= 0) return 0;
    const frac = Math.min(1, Math.max(0, args.closeFraction));
    const raw = absSize * frac;
    const lot = args.lotSize;
    const lotOk = lot !== undefined && Number.isFinite(lot) && lot > 0;
    if (!lotOk) {
      return Math.min(raw, absSize);
    }
    const maxClose = this.floorToLotSize(absSize, lot);
    const floored = this.floorToLotSize(raw, lot);
    return Math.min(floored, maxClose);
  }

  /**
   * Settings may omit symbols still on defaults; estimate from margin + mark when possible.
   * Returns null when it can't be derived.
   */
  static leverageForPosition(args: {
    position: Pick<PacificaPosition, 'symbol' | 'amount' | 'margin'>;
    markPrice?: number;
    leverageBySymbol?: Record<string, number>;
  }): number | null {
    const fromSettings = args.leverageBySymbol?.[args.position.symbol];
    if (fromSettings !== undefined && fromSettings > 0) return fromSettings;

    const mark = args.markPrice;
    if (
      args.position.margin > 0 &&
      mark !== undefined &&
      Number.isFinite(mark) &&
      this.absSize(args.position.amount) > 0
    ) {
      const notional = this.positionNotionalUsd(args.position.amount, mark);
      if (notional !== null && notional > 0) {
        const est = Math.round(notional / args.position.margin);
        return est > 0 ? est : null;
      }
    }
    return null;
  }
}

export default PositionHelper;
