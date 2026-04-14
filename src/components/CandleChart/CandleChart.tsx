'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type UTCTimestamp,
  type Time,
  TickMarkType,
} from 'lightweight-charts';

import CandleChartHelper from '@/utils/helpers/CandleChartHelper';
import PacificaHelper from '@/utils/helpers/PacificaHelper';

import './CandleChart.scss';

type CandleChartProps = {
  market: string;
  resolution?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  height?: number;
  /** Decimals shown on price scale/crosshair (derived from tick size in parent). */
  pricePrecision?: number;
};

/** How close the visible window must be to the oldest bar (logical index) before we fetch older candles. */
const LOAD_MORE_LOGICAL_THRESHOLD = 18;

const candleToBar = (c: {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}): CandlestickData => ({
  time: c.time as UTCTimestamp,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
});

const CandleChart = ({
  market,
  resolution = '1h',
  height = 460,
  pricePrecision = 2,
}: CandleChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreHistoryRef = useRef(true);

  const [isLoading, setIsLoading] = useState(false);

  const timeRange = useMemo(() => {
    const to = CandleChartHelper.nowMilliseconds();
    const from = to - CandleChartHelper.rangeFromResolution(resolution);
    return { from, to };
  }, [resolution]);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    const initialWidth = containerRef.current.clientWidth;
    const initialHeight = containerRef.current.clientHeight || height;

    const chart = createChart(containerRef.current, {
      height: initialHeight,
      width: initialWidth,
      ...CandleChartHelper.chartConfig,
    });

    const series = chart.addSeries(
      CandlestickSeries,
      CandleChartHelper.seriesStyling,
    );

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver((entries) => {
      if (disposed) return;
      if (!containerRef.current || !chartRef.current) return;
      const entry = entries[0];
      const cr = entry?.contentRect;
      const nextWidth = Math.floor(
        cr?.width ?? containerRef.current.clientWidth,
      );
      const nextHeight = Math.floor(
        cr?.height ?? containerRef.current.clientHeight ?? height,
      );
      try {
        chartRef.current.applyOptions({
          height: nextHeight,
          width: nextWidth,
        });
      } catch {
        // lightweight-charts can throw if the chart is disposed during a dev-mode remount
      }
    });
    ro.observe(containerRef.current);

    return () => {
      disposed = true;
      ro.disconnect();
      try {
        chart.remove();
      } catch {
        // ignore double-dispose edge cases
      }
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const isLowerTf =
      resolution === '1m' || resolution === '5m' || resolution === '15m';

    try {
      chart.applyOptions({
        timeScale: {
          timeVisible: isLowerTf,
          secondsVisible: false,
          tickMarkFormatter: (t: Time, _type: TickMarkType, locale: string) => {
            if (!isLowerTf) return null;
            const ms = CandleChartHelper.timeToMs(t);
            if (ms === null) return null;
            return new Intl.DateTimeFormat(locale, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(new Date(ms));
          },
        },
      });
    } catch {
      // ignore disposed edge cases
    }
  }, [resolution]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !containerRef.current) return;
    try {
      chart.applyOptions({
        height: containerRef.current.clientHeight || height,
        width: containerRef.current.clientWidth,
      });
    } catch {
      // ignore disposed edge cases
    }
  }, [height]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    try {
      series.applyOptions({
        priceFormat: {
          type: 'price',
          precision: pricePrecision,
          minMove: Math.pow(10, -pricePrecision),
        },
      });
    } catch {
      // ignore disposed edge cases
    }
  }, [pricePrecision]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!series || !chart) return;
    if (!market) return;

    let cancelled = false;
    setIsLoading(true);
    loadingMoreRef.current = false;
    hasMoreHistoryRef.current = true;
    let unsubscribeWs: (() => void) | null = null;

    const loadOlderCandles = async () => {
      if (cancelled || loadingMoreRef.current || !hasMoreHistoryRef.current) {
        return;
      }
      const s = seriesRef.current;
      const ch = chartRef.current;
      if (!s || !ch) return;

      const rows = s.data();
      if (!rows.length) return;

      const first = rows[0];
      const oldestSec = first.time as number;
      if (!Number.isFinite(oldestSec)) return;

      const chunkMs = CandleChartHelper.rangeFromResolution(resolution);
      const toMs = oldestSec * 1000 - 1;
      const fromMs = Math.max(0, toMs - chunkMs);
      if (fromMs >= toMs) {
        hasMoreHistoryRef.current = false;
        return;
      }

      loadingMoreRef.current = true;
      const beforeLogical = ch.timeScale().getVisibleLogicalRange();
      const prevCount = rows.length;

      try {
        const older = await PacificaHelper.getCandles({
          market,
          resolution,
          from: fromMs,
          to: toMs,
        });
        if (cancelled) return;

        if (!older.length) {
          hasMoreHistoryRef.current = false;
          return;
        }

        const map = new Map<number, CandlestickData>();
        for (const row of rows) {
          if (!row || !('open' in row)) continue;
          const bar = row as CandlestickData;
          map.set(bar.time as number, {
            time: bar.time,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          });
        }
        for (const c of older) {
          if (!map.has(c.time)) {
            map.set(c.time, candleToBar(c));
          }
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => (a.time as number) - (b.time as number),
        );

        if (merged.length === prevCount) {
          hasMoreHistoryRef.current = false;
          return;
        }

        s.setData(merged);

        const added = merged.length - prevCount;
        if (beforeLogical && added > 0) {
          ch.timeScale().setVisibleLogicalRange({
            from: beforeLogical.from + added,
            to: beforeLogical.to + added,
          });
        }
      } catch (e) {
        console.warn('load older candles failed', e);
      } finally {
        loadingMoreRef.current = false;
      }
    };

    const onVisibleLogicalRangeChange = (range: LogicalRange | null) => {
      if (cancelled || range === null) return;
      if (range.from === undefined) return;
      if (range.from > LOAD_MORE_LOGICAL_THRESHOLD) return;
      void loadOlderCandles();
    };

    (async () => {
      try {
        const candles = await PacificaHelper.getCandles({
          market,
          resolution,
          from: timeRange.from,
          to: timeRange.to,
        });
        if (cancelled) return;
        series.setData(candles.map(candleToBar));

        chart
          .timeScale()
          .subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChange);

        // Live updates via websocket candle stream
        unsubscribeWs = PacificaHelper.subscribeCandles({
          market,
          interval: resolution,
          onCandle: (c) => {
            if (cancelled) return;
            series.update({
              time: c.time as UTCTimestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            });
          },
          onError: (e) => {
            // Non-fatal: we still have historical candles displayed
            console.warn('candle websocket error', e);
          },
        });
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        series.setData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeWs?.();
      try {
        chart
          .timeScale()
          .unsubscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChange);
      } catch {
        // chart may already be disposed
      }
    };
  }, [market, resolution, timeRange.from, timeRange.to]);

  return (
    <div className="candle-chart">
      <div className="chart" ref={containerRef} />
      {isLoading && (
        <div className="loading">
          <div className="loading-text">{'Loading candles…'}</div>
        </div>
      )}
    </div>
  );
};

export default CandleChart;
