import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NavLink } from 'react-router-dom';

import Media from '@/utils/constants/Media';
import BitmapHelper, {
  type BitmapSquadPoints,
  type SquadRectangle,
} from '@/utils/helpers/BitmapHelper';
import StringHelper from '@/utils/helpers/StringHelper';
import type { SquadLeaderboardResponseType } from '@/utils/api/instances/squad/service';

import { BITMAP_TEST_LEADERBOARD } from './bitmapTemplateData';

import './Bitmap.scss';

type BitmapType = {
  leaderboardType: '24h' | 'total';
  leaderboardData: SquadLeaderboardResponseType | null;
  /** When true, uses `BITMAP_TEST_LEADERBOARD` instead of API data (local UI / layout tests). */
  useTestTemplate?: boolean;
};

const Bitmap = ({
  leaderboardType,
  leaderboardData,
  useTestTemplate = false,
}: BitmapType) => {
  const requestRef = useRef<number>();
  const bitmapRef = useRef<HTMLDivElement>(null);
  const animationPausedRef = useRef(false);

  const [rectangles, setRectangles] = useState<SquadRectangle[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [isLeaderboardTypeInitializing, setIsLeaderboardTypeInitializing] =
    useState(false);

  const isFirstLeaderboardTypeRef = useRef(true);
  const leaderboardDataAtTypeSwitchRef =
    useRef<SquadLeaderboardResponseType | null>(null);
  const lastLayoutSizeRef = useRef({ w: 0, h: 0 });
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const data: BitmapSquadPoints[] = useMemo(() => {
    const source = useTestTemplate ? BITMAP_TEST_LEADERBOARD : leaderboardData;
    if (source === null) return [];

    const items = source.items;
    const totalSquadLength = items.length;
    if (totalSquadLength === 0) return [];

    return items.map((item) => {
      const pnl_point = totalSquadLength - item.pnl_rank + 1;
      const volume_point = totalSquadLength - item.volume_rank + 1;
      const total_points = pnl_point + volume_point * 1.5;
      const isDay = leaderboardType === '24h';
      const pnl = isDay ? item.pnl_1d : item.pnl_total;
      const volume = isDay ? item.volume_1d : item.volume_total;

      return {
        squad: item.squad,
        avatar_url: item.avatar_url,
        member_count: item.member_count,
        captain_display: item.captain_display,
        volume_rank: item.volume_rank,
        pnl_rank: item.pnl_rank,
        pnl_point,
        volume_point,
        total_points,
        pnl,
        volume,
      };
    });
  }, [leaderboardData, useTestTemplate, leaderboardType]);

  useEffect(() => {
    if (useTestTemplate) return;
    if (isFirstLeaderboardTypeRef.current) {
      isFirstLeaderboardTypeRef.current = false;
      return;
    }
    setIsLeaderboardTypeInitializing(true);
    leaderboardDataAtTypeSwitchRef.current = leaderboardData;
  }, [leaderboardType]);

  useEffect(() => {
    if (useTestTemplate) return;
    if (!isLeaderboardTypeInitializing) return;
    if (leaderboardData === null) return;

    // Keep the initializing overlay up until *new* leaderboard data arrives
    // (Home keeps the old data during the fetch).
    if (leaderboardData !== leaderboardDataAtTypeSwitchRef.current) {
      setIsLeaderboardTypeInitializing(false);
    }
  }, [isLeaderboardTypeInitializing, leaderboardData, useTestTemplate]);

  // 1. Size + position rectangles from points; re-run when the container size changes.
  // ResizeObserver debounce 500ms after the last size change; during debounce show overlay and no rectangles.
  useLayoutEffect(() => {
    const el = bitmapRef.current;
    if (!el || data.length === 0) {
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current);
        resizeDebounceRef.current = undefined;
      }
      setRectangles([]);
      setIsResizing(false);
      return;
    }

    const clearResizeSchedule = () => {
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current);
        resizeDebounceRef.current = undefined;
      }
    };

    const apply = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw < 1 || ch < 1) return;

      lastLayoutSizeRef.current = { w: cw, h: ch };

      const sizes = BitmapHelper.computeRectangleSizes(
        data.map((item) => item.total_points),
        cw,
        ch,
      );
      const positions = BitmapHelper.computeNonOverlappingInitialPositions(
        sizes,
        cw,
        ch,
      );

      const initialRects: SquadRectangle[] = data.map((item, idx) => {
        const { w, h } = sizes[idx];
        const { x, y } = positions[idx];
        return {
          id: item.squad.id,
          x,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          w,
          h,
          color: item.squad.color,
          avatar_url: item.squad.avatar_url,
          pnl: item.pnl,
          volume: item.volume,
        };
      });
      setRectangles(initialRects);
    };

    clearResizeSchedule();
    setIsResizing(false);
    apply();

    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw < 1 || ch < 1) return;

      const { w: lw, h: lh } = lastLayoutSizeRef.current;
      if (cw === lw && ch === lh) return;

      setIsResizing(true);
      setRectangles([]);

      clearResizeSchedule();
      resizeDebounceRef.current = setTimeout(() => {
        resizeDebounceRef.current = undefined;
        apply();
        setIsResizing(false);
      }, BitmapHelper.RESIZE_DEBOUNCE_MS);
    });

    ro.observe(el);
    return () => {
      clearResizeSchedule();
      ro.disconnect();
    };
  }, [data]);

  // 2. Animation loop: integrate velocity, wall bounce, then pairwise collision resolve (no overlap)
  const animate = useCallback(() => {
    if (bitmapRef.current === null) return;
    if (animationPausedRef.current) return;

    const cw = bitmapRef.current.clientWidth;
    const ch = bitmapRef.current.clientHeight;

    setRectangles((prevRects) => {
      let next: SquadRectangle[] = prevRects.map((r) => {
        let newX = r.x + r.vx;
        let newY = r.y + r.vy;
        let newVx = r.vx;
        let newVy = r.vy;

        if (newX <= 0 || newX + r.w >= cw) {
          newVx *= -1;
          newX = r.x;
        }

        if (newY <= 0 || newY + r.h >= ch) {
          newVy *= -1;
          newY = r.y;
        }

        return { ...r, x: newX, y: newY, vx: newVx, vy: newVy };
      });

      for (let pass = 0; pass < BitmapHelper.COLLISION_PAIR_PASSES; pass++) {
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const ai = next[i];
            const aj = next[j];
            if (!ai || !aj) continue;
            const [ri, rj] = BitmapHelper.resolveCollisionPair(ai, aj);
            next[i] = ri;
            next[j] = rj;
          }
        }
      }

      next = next.map((r) => BitmapHelper.clampRectToBounds(r, cw, ch));
      return next;
    });

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  const pauseAnimation = useCallback(() => {
    animationPausedRef.current = true;
    if (requestRef.current !== undefined) {
      cancelAnimationFrame(requestRef.current);
    }
  }, []);

  const resumeAnimation = useCallback(() => {
    animationPausedRef.current = false;
    requestRef.current = requestAnimationFrame(animate);
  }, [animate]);

  return (
    <div
      className="bitmap"
      style={{ backgroundImage: `url(${Media.images.bitmap})` }}
      ref={bitmapRef}
      onMouseEnter={pauseAnimation}
      onMouseLeave={resumeAnimation}
    >
      {isResizing && (
        <div className="bitmap-resizing" aria-live="polite">
          {'> Resizing_Bitmap...'}
        </div>
      )}
      {(leaderboardData === null || isLeaderboardTypeInitializing) && (
        <div className="bitmap-resizing" aria-live="polite">
          {`> Initializing_${leaderboardType}_bitmap...`}
        </div>
      )}
      {!isResizing &&
        !isLeaderboardTypeInitializing &&
        rectangles.map((r) => (
          <NavLink
            key={r.id}
            to={`/squad/${r.id}`}
            target={'_self'}
            className="bitmap-rectangle"
            style={{
              width: r.w,
              height: r.h,
              transform: `translate3d(${r.x}px, ${r.y}px, 0)`,
            }}
          >
            <div
              className="bitmap-rectangle-surface"
              style={{ backgroundColor: r.color }}
            >
              {r.avatar_url && (
                <img src={r.avatar_url} className="avatar" alt={r.id} />
              )}
            </div>
            <div className="bitmap-rectangle-hover" aria-hidden>
              <div className="bitmap-rectangle-stat">
                <span className="bitmap-rectangle-stat-label">{'PnL'}</span>
                <span
                  className={`bitmap-rectangle-stat-value${
                    r.pnl < 0 ? ' negative' : ''
                  }`}
                >
                  {StringHelper.formatCompactNumber(r.pnl)}
                </span>
              </div>
              <div className="bitmap-rectangle-stat">
                <span className="bitmap-rectangle-stat-label">{'Volume'}</span>
                <span className="bitmap-rectangle-stat-value volume">
                  {StringHelper.formatCompactNumber(r.volume)}
                </span>
              </div>
            </div>
          </NavLink>
        ))}
    </div>
  );
};

export default Bitmap;
