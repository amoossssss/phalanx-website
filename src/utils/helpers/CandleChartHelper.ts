import {
  ColorType,
  type IChartApi,
  type ISeriesApi,
  Time,
} from 'lightweight-charts';
import { useEffect, useMemo, useRef, useState } from 'react';

class CandleChartHelper {
  static chartConfig = {
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
  };

  static seriesStyling = {
    upColor: '#8eff71',
    downColor: '#ff51fa',
    borderUpColor: '#8eff71',
    borderDownColor: '#ff51fa',
    wickUpColor: '#8eff71',
    wickDownColor: '#ff51fa',
  };

  static rangeFromResolution = (
    resolution: '1m' | '5m' | '15m' | '1h' | '4h' | '1d',
  ) => {
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
  };

  static nowMilliseconds = () => {
    return Date.now();
  };

  static timeToMs = (t: Time): number | null => {
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
  };
}

export default CandleChartHelper;
