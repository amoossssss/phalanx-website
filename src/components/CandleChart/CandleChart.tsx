'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type Time,
  TickMarkType,
} from 'lightweight-charts';

import PacificaHelper from '@/utils/helpers/PacificaHelper';

import './CandleChart.scss';

type CandleChartProps = {
  market: string;
  resolution?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  height?: number;
  /** Decimals shown on price scale/crosshair (derived from tick size in parent). */
  pricePrecision?: number;
};

const nowMilliseconds = () => {
  return Date.now();
};

function timeToMs(t: Time): number | null {
  if (typeof t === 'number') return t * 1000;
  if (typeof t === 'string') {
    const d = new Date(t);
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (t && typeof t === 'object') {
    const bd = t as { year?: number; month?: number; day?: number };
    if (
      typeof bd.year === 'number' &&
      typeof bd.month === 'number' &&
      typeof bd.day === 'number'
    ) {
      return Date.UTC(bd.year, bd.month - 1, bd.day);
    }
  }
  return null;
}

function rangeFromResolution(resolution: CandleChartProps['resolution']) {
  // Simple defaults: enough candles for a decent view.
  switch (resolution) {
    case '1m':
      return 1000 * 60 * 60 * 6; // 6h
    case '5m':
      return 1000 * 60 * 60 * 24 * 3; // 3d
    case '15m':
      return 1000 * 60 * 60 * 24 * 7; // 7d
    case '4h':
      return 1000 * 60 * 60 * 24 * 90; // 90d
    case '1d':
      return 1000 * 60 * 60 * 24 * 365; // 1y
    // case '1w':
    //   return 1000 * 60 * 60 * 24 * 365 * 3; // 3y
    case '1h':
    default:
      return 1000 * 60 * 60 * 24 * 30; // 30d
  }
}

const CandleChart = ({
  market,
  resolution = '1h',
  height = 420,
  pricePrecision = 2,
}: CandleChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const timeRange = useMemo(() => {
    const to = nowMilliseconds();
    const from = to - rangeFromResolution(resolution);
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
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.7)',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.08)' },
        horzLines: { color: 'rgba(255,255,255,0.08)' },
      },
      timeScale: { borderColor: 'rgba(255,255,255,0.12)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.12)' },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#8eff71',
      downColor: '#ff51fa',
      borderUpColor: '#8eff71',
      borderDownColor: '#ff51fa',
      wickUpColor: '#8eff71',
      wickDownColor: '#ff51fa',
    });

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
            const ms = timeToMs(t);
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
    const series = seriesRef.current;
    if (!series) return;
    if (!market) return;

    let cancelled = false;
    setIsLoading(true);
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const candles = await PacificaHelper.getCandles({
          market,
          resolution,
          from: timeRange.from,
          to: timeRange.to,
        });
        if (cancelled) return;
        series.setData(
          candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );

        // Live updates via websocket candle stream
        unsubscribe = PacificaHelper.subscribeCandles({
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
      unsubscribe?.();
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
