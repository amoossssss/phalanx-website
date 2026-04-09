import type { SquadLeaderboardItemType } from '@/utils/api/instances/squad/service';

export type SquadRectangle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  avatar_url: string | null;
  /** PnL for the active leaderboard timeframe (`pnl_1d` or `pnl_total`). */
  pnl: number;
  /** Volume for the active leaderboard timeframe (`volume_1d` or `volume_total`). */
  volume: number;
};

/** Per-squad points for bitmap allocation: `total_points = pnl_point + volume_point * 1.5`. */
export type BitmapSquadPoints = {
  squad: SquadLeaderboardItemType['squad'];
  avatar_url: string | null;
  member_count: number;
  captain_display: string | null;
  volume_rank: number;
  pnl_rank: number;
  pnl_point: number;
  volume_point: number;
  total_points: number;
  pnl: number;
  volume: number;
};

class BitmapHelper {
  /** Pairwise collision resolution sweeps per animation frame. */
  static readonly COLLISION_PAIR_PASSES = 4;

  /** Share of total canvas area used by all squad rectangles combined (rest stays empty for motion). */
  static readonly RECTANGLE_AREA_FILL = 0.5;
  static readonly RECT_MIN_SIDE_PX = 8;
  /** Max square side as a fraction of the smaller container dimension. */
  static readonly RECT_MAX_SIDE_FRACTION = 0.3;

  static readonly RESIZE_DEBOUNCE_MS = 500;

  /** Random tries per rectangle before falling back to a coarse grid scan. */
  private static readonly NON_OVERLAP_RANDOM_ATTEMPTS = 2500;

  /** Axis-aligned rectangle overlap (touching edges is not overlap). */
  static rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ): boolean {
    return (
      a.x < b.x + b.w &&
      b.x < a.x + a.w &&
      a.y < b.y + b.h &&
      b.y < a.y + a.h
    );
  }

  /**
   * Places each rectangle at (x, y) so no two overlap (largest area first).
   * Uses random sampling, then a grid scan; if no slot exists, falls back to (0,0)-biased positions.
   */
  static computeNonOverlappingInitialPositions(
    sizes: Array<{ w: number; h: number }>,
    cw: number,
    ch: number,
  ): Array<{ x: number; y: number }> {
    const n = sizes.length;
    if (n === 0) return [];

    const order = sizes.map((_, i) => i);
    order.sort(
      (i, j) =>
        sizes[j].w * sizes[j].h - sizes[i].w * sizes[i].h,
    );

    const placed: Array<{ x: number; y: number; w: number; h: number }> =
      [];
    const out: Array<{ x: number; y: number }> = new Array(n);

    for (const i of order) {
      const { w, h } = sizes[i];
      const maxX = Math.max(0, cw - w);
      const maxY = Math.max(0, ch - h);

      let x = 0;
      let y = 0;
      let found = false;

      for (
        let attempt = 0;
        attempt < BitmapHelper.NON_OVERLAP_RANDOM_ATTEMPTS;
        attempt++
      ) {
        x = Math.random() * maxX;
        y = Math.random() * maxY;
        const candidate = { x, y, w, h };
        if (
          !placed.some((p) => BitmapHelper.rectsOverlap(candidate, p))
        ) {
          found = true;
          break;
        }
      }

      if (!found) {
        const step = Math.max(
          1,
          Math.min(6, Math.floor(Math.min(cw, ch) / 120)),
        );
        const maxXi = Math.floor(maxX);
        const maxYi = Math.floor(maxY);
        outer: for (let yy = 0; yy <= maxYi; yy += step) {
          for (let xx = 0; xx <= maxXi; xx += step) {
            const candidate = { x: xx, y: yy, w, h };
            if (
              !placed.some((p) => BitmapHelper.rectsOverlap(candidate, p))
            ) {
              x = xx;
              y = yy;
              found = true;
              break outer;
            }
          }
        }
      }

      if (!found) {
        const maxXi = Math.floor(maxX);
        const maxYi = Math.floor(maxY);
        let iter = 0;
        const maxFineIterations = 60_000;
        outer: for (let yy = 0; yy <= maxYi; yy++) {
          for (let xx = 0; xx <= maxXi; xx++) {
            if (iter++ >= maxFineIterations) break outer;
            const candidate = { x: xx, y: yy, w, h };
            if (
              !placed.some((p) => BitmapHelper.rectsOverlap(candidate, p))
            ) {
              x = xx;
              y = yy;
              found = true;
              break outer;
            }
          }
        }
      }

      if (!found) {
        x = Math.min(maxX, (placed.length % 8) * 12);
        y = Math.min(maxY, Math.floor(placed.length / 8) * 12);
      }

      placed.push({ x, y, w, h });
      out[i] = { x, y };
    }

    return out;
  }

  /**
   * Square side length from point share: `area_i = (total_points / totalPointsAllSquads) * (W*H*fill)`,
   * `side = sqrt(area_i)`, clamped so rects stay small vs the container.
   */
  static computeRectangleSize = (
    totalPoints: number,
    totalPointsAllSquads: number,
    containerWidth: number,
    containerHeight: number,
  ): { w: number; h: number } => {
    const W = Math.max(1, containerWidth);
    const H = Math.max(1, containerHeight);
    const minDim = Math.min(W, H);
    const maxSide = minDim * BitmapHelper.RECT_MAX_SIDE_FRACTION;

    if (totalPointsAllSquads <= 0 || totalPoints <= 0) {
      const s = BitmapHelper.RECT_MIN_SIDE_PX;
      return { w: s, h: s };
    }

    const share = totalPoints / totalPointsAllSquads;
    const totalAreaBudget = W * H * BitmapHelper.RECTANGLE_AREA_FILL;
    const area = share * totalAreaBudget;
    let side = Math.sqrt(area);
    side = Math.min(maxSide, Math.max(BitmapHelper.RECT_MIN_SIDE_PX, side));
    return { w: side, h: side };
  };

  /**
   * Axis-aligned overlap: swap velocities on the shallow penetration axis and separate half the overlap each.
   * Returns new rect objects (immutable).
   */
  static resolveCollisionPair = (
    a: SquadRectangle,
    b: SquadRectangle,
  ): [SquadRectangle, SquadRectangle] => {
    const dx = a.x + a.w / 2 - (b.x + b.w / 2);
    const dy = a.y + a.h / 2 - (b.y + b.h / 2);
    const combinedHalfW = (a.w + b.w) / 2;
    const combinedHalfH = (a.h + b.h) / 2;

    if (Math.abs(dx) >= combinedHalfW || Math.abs(dy) >= combinedHalfH) {
      return [a, b];
    }

    const overlapX = combinedHalfW - Math.abs(dx);
    const overlapY = combinedHalfH - Math.abs(dy);

    if (overlapX < overlapY) {
      const pushX = overlapX / 2;
      return [
        {
          ...a,
          vx: b.vx,
          x: a.x + (dx > 0 ? pushX : -pushX),
        },
        {
          ...b,
          vx: a.vx,
          x: b.x - (dx > 0 ? pushX : -pushX),
        },
      ];
    }

    const pushY = overlapY / 2;
    return [
      {
        ...a,
        vy: b.vy,
        y: a.y + (dy > 0 ? pushY : -pushY),
      },
      {
        ...b,
        vy: a.vy,
        y: b.y - (dy > 0 ? pushY : -pushY),
      },
    ];
  };

  static clampRectToBounds = (
    r: SquadRectangle,
    cw: number,
    ch: number,
  ): SquadRectangle => {
    let { x, y, vx, vy } = r;
    if (x < 0) {
      x = 0;
      vx = Math.abs(vx);
    }
    if (y < 0) {
      y = 0;
      vy = Math.abs(vy);
    }
    if (x + r.w > cw) {
      x = cw - r.w;
      vx = -Math.abs(vx);
    }
    if (y + r.h > ch) {
      y = ch - r.h;
      vy = -Math.abs(vy);
    }
    return { ...r, x, y, vx, vy };
  };
}

export default BitmapHelper;
