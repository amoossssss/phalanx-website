import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';

import ApiService from '@/utils/api/ApiService';
import ColorHelper from '@/utils/helpers/ColorHelper';

import './Heatmap.scss';

const GRID_COLS = 5;
const GRID_ROWS = 4;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function cellBackgroundColor(ratio: number, accentHex: string): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  const rgb = hexToRgb(accentHex);
  if (rgb) {
    const a = 0.06 + clamped * 0.88;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }
  const a = 0.06 + clamped * 0.88;
  return `rgba(143, 245, 255, ${a})`;
}

type HeatmapProps = {
  squadId: string;
  /** Current squad size — denominator for activity ratio */
  memberCount: number;
  /** Squad accent color (hex) for cell fill */
  squadColor?: string;
};

const Heatmap = ({
  squadId,
  memberCount,
  squadColor = '#8ff5ff',
}: HeatmapProps) => {
  const [heatmap, setHeatmap] = useState<string[][]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const borderColor = ColorHelper.borderColor(squadColor);

  const fetchHeatmap = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);
    try {
      const heatmapData = await ApiService.squad.getHeatmap(squadId);
      setHeatmap(heatmapData.heatmap ?? []);
    } catch {
      setHeatmap([]);
      setLoadError('Could not load heatmap');
    } finally {
      setIsLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    void fetchHeatmap();
  }, [fetchHeatmap]);

  const dayRows = useMemo(() => {
    const rows: { dayIndex: number; tradedCount: number; ratio: number }[][] =
      [];
    for (let r = 0; r < GRID_ROWS; r += 1) {
      const row: { dayIndex: number; tradedCount: number; ratio: number }[] =
        [];
      for (let c = 0; c < GRID_COLS; c += 1) {
        const dayIndex = r * GRID_COLS + c;
        const addresses = heatmap[dayIndex] ?? [];
        const tradedCount = addresses.length;
        const denom = memberCount > 0 ? memberCount : 1;
        const ratio = Math.min(1, tradedCount / denom);
        row.push({ dayIndex, tradedCount, ratio });
      }
      rows.push(row);
    }
    return rows;
  }, [heatmap, memberCount]);

  return (
    <div className="heatmap" style={{ borderColor }}>
      <div className="heatmap-title">{'<Trading_activity_20d>'}</div>
      <div className="heatmap-legend">
        <span>{'t-0 (today)'}</span>
        <span>{'→'}</span>
        <span>{'t-19'}</span>
      </div>
      {loadError && (
        <div className="heatmap-error" role="status">
          {loadError}
        </div>
      )}
      {isLoading && !loadError ? (
        <div className="heatmap-loading">{'Loading…'}</div>
      ) : (
        <div
          className="heatmap-grid"
          style={
            {
              '--heatmap-cols': GRID_COLS,
              '--heatmap-rows': GRID_ROWS,
            } as CSSProperties
          }
        >
          {dayRows.map((row) =>
            row.map((cell) => (
              <div
                key={cell.dayIndex}
                className="heatmap-cell"
                style={{
                  backgroundColor: cellBackgroundColor(cell.ratio, squadColor),
                  borderColor,
                }}
                title={`Day ${cell.dayIndex}: ${cell.tradedCount} / ${memberCount} members traded`}
              >
                <span className="heatmap-cell-count">{cell.tradedCount}</span>
              </div>
            )),
          )}
        </div>
      )}
    </div>
  );
};

export default Heatmap;
