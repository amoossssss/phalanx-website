import { useMemo } from 'react';

import ColorHelper from '@/utils/helpers/ColorHelper';
import StringHelper from '@/utils/helpers/StringHelper';
import { MemberType } from '@/utils/constants/Types';

import './VolumeChart.scss';

const SLICE_COLORS = [
  '#8eff71',
  '#8ff5ff',
  '#ff51fa',
  '#3694ff',
  '#dd3a56',
  '#f77808',
  '#7f77dd',
  '#f2d233',
  '#2d3043',
  '#7a7a7a',
];

type VolumeSlice = {
  key: string;
  label: string;
  volume: number;
  share: number;
  color: string;
};

function memberLabel(m: MemberType): string {
  if (m.alias && m.alias.trim().length > 0) {
    return `@${m.alias}`;
  }
  return `@${StringHelper.truncateAddress(m.walletAddress)}`;
}

type VolumeChartProps = {
  members: MemberType[];
  squadColor: string;
};

const VolumeChart = ({ members, squadColor }: VolumeChartProps) => {
  const borderColor = ColorHelper.borderColor(squadColor);

  const { slices, totalVolume } = useMemo(() => {
    const raw = members.map((m, i) => {
      const v = Number(m.volume);
      const volume = Number.isFinite(v) && v >= 0 ? v : 0;
      return {
        key: m.walletAddress,
        label: memberLabel(m),
        volume,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      };
    });
    const total = raw.reduce((s, x) => s + x.volume, 0);
    const slices: VolumeSlice[] = raw.map((x) => ({
      ...x,
      share: total > 0 ? x.volume / total : 0,
    }));
    return { slices, totalVolume: total };
  }, [members]);

  const hasData = totalVolume > 0 && slices.some((s) => s.volume > 0);

  return (
    <div className="volume-chart" style={{ borderColor }}>
      <div className="volume-chart-title">{'<Total_Volume_Share>'}</div>
      {!hasData ? (
        <div className="volume-chart-empty">{'No_volume_data'}</div>
      ) : (
        <>
          <div
            className="volume-chart-square"
            role="img"
            aria-label="Squad volume by member, square stacked chart"
          >
            {slices.map((s) =>
              s.volume > 0 ? (
                <div
                  key={s.key}
                  className="volume-chart-slice"
                  style={{
                    flexGrow: s.volume,
                    flexShrink: 0,
                    flexBasis: 0,
                    backgroundColor: s.color,
                  }}
                  title={`${s.label}: ${StringHelper.formatCompactNumber(
                    s.volume,
                  )} (${(s.share * 100).toFixed(1)}%)`}
                />
              ) : null,
            )}
          </div>
          <ul className="volume-chart-legend">
            {slices.map((s) => (
              <li key={s.key} className="volume-chart-legend-row">
                <span
                  className="volume-chart-legend-swatch"
                  style={{ backgroundColor: s.color }}
                />
                <span className="volume-chart-legend-label">{s.label}</span>
                <span className="volume-chart-legend-pct">
                  {totalVolume > 0 ? `${(s.share * 100).toFixed(1)}%` : '0%'}
                </span>
                <span className="volume-chart-legend-vol">
                  {StringHelper.formatCompactNumber(s.volume)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default VolumeChart;
