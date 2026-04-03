import bs58 from 'bs58';

import PositionHelper from '@/utils/helpers/PositionHelper';

export type BuilderApprovalRow = {
  builder_code?: string;
  max_fee_rate?: string;
};

export type PacificaMarketInfo = {
  symbol?: string;
  tick_size?: string | number;
  lot_size?: string | number;
  max_leverage?: string | number;
  [key: string]: unknown;
};

export type PacificaMarketPriceRow = {
  symbol: string;
  mid?: string;
  mark?: string;
  oracle?: string;
  timestamp?: number;
  [key: string]: unknown;
};

export type PacificaCandle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

export type PacificaOrderbookLevel = {
  price: number;
  amount: number;
  orders: number;
};

export type PacificaOrderbook = {
  symbol: string;
  bids: PacificaOrderbookLevel[];
  asks: PacificaOrderbookLevel[];
  timestampMs: number;
  aggLevel?: number;
};

export type PacificaPosition = {
  symbol: string;
  side: 'bid' | 'ask';
  amount: number;
  entryPrice: number;
  margin: number;
  funding: number;
  isolated: boolean;
  liquidationPrice: number | null;
  updatedAtMs: number;
  // Some APIs may include a builder code for the position; keep it if present.
  builder_code?: string;
};

const PACIFICA_API_BASE = 'https://api.pacifica.fi/api/v1';
const PACIFICA_WS_URL = 'wss://ws.pacifica.fi/ws';

type WsEnvelope<T> = {
  channel?: string;
  data?: T;
  [key: string]: unknown;
};

type CandleStreamData = {
  t: number; // start time ms
  T?: number; // end time ms
  s: string; // symbol
  i: string; // interval
  o: string; // open
  c: string; // close
  h: string; // high
  l: string; // low
  v?: string; // volume
  n?: number; // trade count
};

type TradesStreamRow = {
  s: string; // symbol
  p: string; // price
  t: number; // timestamp in ms
  [key: string]: unknown;
};

type PricesStreamRow = {
  symbol: string;
  mid?: string;
  mark?: string;
  oracle?: string;
  timestamp?: number;
  [key: string]: unknown;
};

type AccountPositionsStreamRow = {
  s: string;
  d: string;
  a: string;
  p: string;
  m: string;
  f: string;
  i: boolean;
  l: string | null;
  t: number;
  [key: string]: unknown;
};

type AccountInfoStreamData = {
  ae?: string;
  as?: string;
  aw?: string;
  b?: string;
  f?: number;
  mu?: string;
  cm?: string;
  oc?: number;
  pb?: string;
  pc?: number;
  sc?: number;
  t?: number;
};

type OrderbookStreamLevel = {
  p: string;
  a: string;
  n: number;
};

type OrderbookStreamData = {
  l: [OrderbookStreamLevel[], OrderbookStreamLevel[]];
  s: string;
  t: number;
  li?: number;
};

type CandleSubscriptionArgs = {
  /** Pacifica websocket uses `symbol` (docs). We accept `market` for caller convenience. */
  market: string;
  interval: string;
  onCandle: (candle: PacificaCandle) => void;
  onError?: (err: unknown) => void;
};

type LastPriceSubscriptionArgs = {
  market: string;
  onPrice: (price: number) => void;
  onError?: (err: unknown) => void;
};

type PricesSubscriptionArgs = {
  onPrices: (rows: PacificaMarketPriceRow[]) => void;
  onError?: (err: unknown) => void;
};

type OrderbookSubscriptionArgs = {
  market: string;
  aggLevel?: 1 | 10 | 100 | 1000 | 10000;
  onBook: (book: PacificaOrderbook) => void;
  onError?: (err: unknown) => void;
};

export type PacificaAccountInfo = {
  balance: number;
  feeLevel: number;
  makerFee: number;
  takerFee: number;
  accountEquity: number;
  availableToSpend: number;
  availableToWithdraw: number;
  pendingBalance: number;
  totalMarginUsed: number;
  crossMmr: number;
  positionsCount: number;
  ordersCount: number;
  stopOrdersCount: number;
  updatedAtMs: number;
};

/** Per-market margin + leverage from `GET /account/settings`. */
export type PacificaMarginSetting = {
  symbol: string;
  isolated: boolean;
  leverage: number;
  createdAtMs: number;
  updatedAtMs: number;
};

export type PacificaAccountSettings = {
  autoLendDisabled: boolean | null;
  marginSettings: PacificaMarginSetting[];
  spotSettings: unknown[];
};

/** `account_leverage` websocket payload (normalized). */
export type PacificaAccountLeverageUpdate = {
  account: string;
  symbol: string;
  leverage: number;
  updatedAtMs: number;
};

type AccountInfoSubscriptionArgs = {
  account: string;
  onInfo: (info: PacificaAccountInfo) => void;
  onError?: (err: unknown) => void;
};

type AccountPositionsSubscriptionArgs = {
  account: string;
  onPositions: (positions: PacificaPosition[]) => void;
  onError?: (err: unknown) => void;
};

type AccountLeverageStreamData = {
  u?: string;
  s?: string;
  l?: string | number;
  t?: number;
};

type AccountLeverageSubscriptionArgs = {
  account: string;
  onLeverage: (update: PacificaAccountLeverageUpdate) => void;
  onError?: (err: unknown) => void;
};

function toPacificaCandleFromStream(
  d: CandleStreamData,
): PacificaCandle | null {
  const timeMs = Number(d.t);
  if (!Number.isFinite(timeMs)) return null;

  const open = Number(d.o);
  const high = Number(d.h);
  const low = Number(d.l);
  const close = Number(d.c);
  if (
    !Number.isFinite(open) ||
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    !Number.isFinite(close)
  ) {
    return null;
  }

  return {
    time: Math.floor(timeMs / 1000),
    open,
    high,
    low,
    close,
  };
}

function toOrderbookLevels(
  lvls: OrderbookStreamLevel[],
): PacificaOrderbookLevel[] {
  const out: PacificaOrderbookLevel[] = [];
  for (const l of lvls) {
    const price = Number(l.p);
    const amount = Number(l.a);
    const orders = Number(l.n);
    if (
      !Number.isFinite(price) ||
      !Number.isFinite(amount) ||
      !Number.isFinite(orders)
    ) {
      continue;
    }
    out.push({ price, amount, orders });
  }
  return out;
}

class PacificaWsManager {
  private ws: WebSocket | null = null;
  private isOpen = false;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private reconnectBackoffMs = 500;
  private readonly maxReconnectBackoffMs = 15000;

  private readonly subs = new Map<
    string,
    {
      /** Serialized subscribe payload we can replay on reconnect */
      subscribeMsg: string;
      /** Parsed params, used for clean unsubscribe */
      params: Record<string, unknown>;
      handlers: Set<(env: WsEnvelope<unknown>) => void>;
      errorHandlers: Set<(err: unknown) => void>;
    }
  >();

  private ensureConnected() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(PACIFICA_WS_URL);
    this.ws = ws;
    this.isOpen = false;

    ws.onopen = () => {
      this.isOpen = true;
      this.reconnectBackoffMs = 500;
      this.startPing();
      // Resubscribe everything after reconnect
      this.subs.forEach((sub) => {
        try {
          ws.send(sub.subscribeMsg);
        } catch {
          // ignore; reconnect loop will retry
        }
      });
    };

    ws.onmessage = (evt) => {
      let env: WsEnvelope<unknown> | null = null;
      try {
        env = JSON.parse(String(evt.data)) as WsEnvelope<unknown>;
      } catch {
        return;
      }

      const channel = typeof env.channel === 'string' ? env.channel : '';
      if (channel === 'pong') return;

      // Candle stream messages use channel="candle"
      if (channel === 'candle') {
        const data = env.data as CandleStreamData | undefined;
        const key = data ? this.subKey('candle', data.s, data.i) : null;
        if (!key) return;
        const sub = this.subs.get(key);
        if (!sub) return;
        sub.handlers.forEach((h) => h(env));
        return;
      }

      // Trades stream messages use channel="trades"
      if (channel === 'trades') {
        const rows = env.data as TradesStreamRow[] | undefined;
        if (!Array.isArray(rows) || rows.length === 0) return;
        const first = rows[0];
        const symbol = first ? first.s : null;
        if (!symbol) return;
        const key = this.subKey('trades', symbol);
        const sub = this.subs.get(key);
        if (!sub) return;
        sub.handlers.forEach((h) => h(env));
        return;
      }

      // Prices stream messages use channel="prices"
      if (channel === 'prices') {
        const key = this.subKey('prices', '*');
        const sub = this.subs.get(key);
        if (!sub) return;
        sub.handlers.forEach((h) => h(env));
        return;
      }

      // Account info stream messages use channel="account_info"
      if (channel === 'account_info') {
        const key = this.subKey('account_info', '*');
        const sub = this.subs.get(key);
        if (!sub) return;
        sub.handlers.forEach((h) => h(env));
        return;
      }

      // Account positions stream messages use channel="account_positions"
      if (channel === 'account_positions') {
        const key = this.subKey('account_positions', '*');
        const sub = this.subs.get(key);
        if (!sub) return;
        sub.handlers.forEach((h) => h(env));
        return;
      }

      // Account leverage stream messages use channel="account_leverage"
      if (channel === 'account_leverage') {
        const key = this.subKey('account_leverage', '*');
        const sub = this.subs.get(key);
        if (!sub) return;
        sub.handlers.forEach((h) => h(env));
        return;
      }

      // Orderbook stream messages use channel="book"
      if (channel === 'book') {
        const data = env.data as OrderbookStreamData | undefined;
        const key =
          data && data.l && Array.isArray(data.l)
            ? this.subKey('book', data.s)
            : null;
        if (!key) return;
        const sub = this.subs.get(key);
        if (!sub) return;
        sub.handlers.forEach((h) => h(env));
        return;
      }
    };

    const handleCloseOrError = (err?: unknown) => {
      this.isOpen = false;
      this.stopPing();
      this.scheduleReconnect();
      if (err) {
        this.subs.forEach((sub) => {
          sub.errorHandlers.forEach((eh) => eh(err));
        });
      }
    };

    ws.onerror = (evt) => handleCloseOrError(evt);
    ws.onclose = () => handleCloseOrError();
  }

  private startPing() {
    this.stopPing();
    // Docs: server closes if no message sent for 60s. Ping every 25s.
    this.pingTimer = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try {
        this.ws.send(JSON.stringify({ method: 'ping' }));
      } catch {
        // ignore
      }
    }, 25000);
  }

  private stopPing() {
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (this.subs.size === 0) return;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectBackoffMs = Math.min(
        this.maxReconnectBackoffMs,
        Math.floor(this.reconnectBackoffMs * 1.7),
      );
      this.ensureConnected();
    }, this.reconnectBackoffMs);
  }

  private cleanupIfIdle() {
    if (this.subs.size > 0) return;
    this.stopPing();
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
    this.ws = null;
    this.isOpen = false;
  }

  private subKey(source: string, symbol: string, interval?: string) {
    return interval ? `${source}:${symbol}:${interval}` : `${source}:${symbol}`;
  }

  subscribeCandle(args: CandleSubscriptionArgs): () => void {
    const symbol = args.market;
    const interval = args.interval;
    const key = this.subKey('candle', symbol, interval);

    const params = {
      source: 'candle',
      symbol,
      interval,
    };
    const subscribeMsg = JSON.stringify({ method: 'subscribe', params });
    const unsubscribeMsg = JSON.stringify({ method: 'unsubscribe', params });

    let sub = this.subs.get(key);
    if (!sub) {
      sub = {
        subscribeMsg,
        params,
        handlers: new Set(),
        errorHandlers: new Set(),
      };
      this.subs.set(key, sub);
    }

    const handler = (env: WsEnvelope<unknown>) => {
      const d = env.data as CandleStreamData | undefined;
      if (!d) return;
      if (d.s !== symbol || d.i !== interval) return;
      const candle = toPacificaCandleFromStream(d);
      if (!candle) return;
      args.onCandle(candle);
    };
    sub.handlers.add(handler);
    if (args.onError) sub.errorHandlers.add(args.onError);

    this.ensureConnected();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isOpen) {
      try {
        this.ws.send(subscribeMsg);
      } catch {
        // ignore; reconnect loop will replay
      }
    }

    return () => {
      const cur = this.subs.get(key);
      if (!cur) return;
      cur.handlers.delete(handler);
      if (args.onError) cur.errorHandlers.delete(args.onError);
      if (cur.handlers.size === 0) {
        this.subs.delete(key);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(unsubscribeMsg);
          } catch {
            // ignore
          }
        }
      }
      this.cleanupIfIdle();
    };
  }

  subscribeTrades(args: {
    market: string;
    onTrades: (trades: TradesStreamRow[]) => void;
    onError?: (err: unknown) => void;
  }): () => void {
    const symbol = args.market;
    const key = this.subKey('trades', symbol);

    const params = {
      source: 'trades',
      symbol,
    };
    const subscribeMsg = JSON.stringify({ method: 'subscribe', params });
    const unsubscribeMsg = JSON.stringify({ method: 'unsubscribe', params });

    let sub = this.subs.get(key);
    if (!sub) {
      sub = {
        subscribeMsg,
        params,
        handlers: new Set(),
        errorHandlers: new Set(),
      };
      this.subs.set(key, sub);
    }

    const handler = (env: WsEnvelope<unknown>) => {
      const rows = env.data as TradesStreamRow[] | undefined;
      if (!Array.isArray(rows) || rows.length === 0) return;
      const filtered = rows.filter((r) => r && typeof r.s === 'string');
      if (filtered.length === 0) return;
      const forSymbol = filtered.filter((r) => r.s === symbol);
      if (forSymbol.length === 0) return;
      args.onTrades(forSymbol);
    };

    sub.handlers.add(handler);
    if (args.onError) sub.errorHandlers.add(args.onError);

    this.ensureConnected();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isOpen) {
      try {
        this.ws.send(subscribeMsg);
      } catch {
        // ignore; reconnect loop will replay
      }
    }

    return () => {
      const cur = this.subs.get(key);
      if (!cur) return;
      cur.handlers.delete(handler);
      if (args.onError) cur.errorHandlers.delete(args.onError);
      if (cur.handlers.size === 0) {
        this.subs.delete(key);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(unsubscribeMsg);
          } catch {
            // ignore
          }
        }
      }
      this.cleanupIfIdle();
    };
  }

  subscribePrices(args: {
    onPrices: (rows: PricesStreamRow[]) => void;
    onError?: (err: unknown) => void;
  }): () => void {
    const key = this.subKey('prices', '*');

    const params = {
      source: 'prices',
    };
    const subscribeMsg = JSON.stringify({ method: 'subscribe', params });
    const unsubscribeMsg = JSON.stringify({ method: 'unsubscribe', params });

    let sub = this.subs.get(key);
    if (!sub) {
      sub = {
        subscribeMsg,
        params,
        handlers: new Set(),
        errorHandlers: new Set(),
      };
      this.subs.set(key, sub);
    }

    const handler = (env: WsEnvelope<unknown>) => {
      const rows = env.data as PricesStreamRow[] | undefined;
      if (!Array.isArray(rows) || rows.length === 0) return;
      args.onPrices(rows);
    };

    sub.handlers.add(handler);
    if (args.onError) sub.errorHandlers.add(args.onError);

    this.ensureConnected();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isOpen) {
      try {
        this.ws.send(subscribeMsg);
      } catch {
        // ignore; reconnect loop will replay
      }
    }

    return () => {
      const cur = this.subs.get(key);
      if (!cur) return;
      cur.handlers.delete(handler);
      if (args.onError) cur.errorHandlers.delete(args.onError);
      if (cur.handlers.size === 0) {
        this.subs.delete(key);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(unsubscribeMsg);
          } catch {
            // ignore
          }
        }
      }
      this.cleanupIfIdle();
    };
  }

  subscribeOrderbook(args: {
    market: string;
    aggLevel: number;
    onBook: (book: PacificaOrderbook) => void;
    onError?: (err: unknown) => void;
  }): () => void {
    const symbol = args.market;
    const aggLevel = args.aggLevel;
    // WS "book" channel doesn't echo agg_level, so we key by symbol only.
    // In our UI we only subscribe to one agg level at a time per symbol.
    const key = this.subKey('book', symbol);

    const params = {
      source: 'book',
      symbol,
      agg_level: aggLevel,
    };
    const subscribeMsg = JSON.stringify({ method: 'subscribe', params });
    const unsubscribeMsg = JSON.stringify({ method: 'unsubscribe', params });

    let sub = this.subs.get(key);
    if (!sub) {
      sub = {
        subscribeMsg,
        params,
        handlers: new Set(),
        errorHandlers: new Set(),
      };
      this.subs.set(key, sub);
    } else {
      // If agg level changes for the same symbol key, actively resubscribe.
      const prevAgg = Number((sub.params as { agg_level?: unknown }).agg_level);
      if (
        Number.isFinite(prevAgg) &&
        prevAgg !== aggLevel &&
        this.ws &&
        this.ws.readyState === WebSocket.OPEN &&
        this.isOpen
      ) {
        try {
          this.ws.send(
            JSON.stringify({ method: 'unsubscribe', params: sub.params }),
          );
        } catch {
          // ignore
        }
        try {
          this.ws.send(subscribeMsg);
        } catch {
          // ignore
        }
      }
      sub.subscribeMsg = subscribeMsg;
      sub.params = params;
    }

    const handler = (env: WsEnvelope<unknown>) => {
      const data = env.data as OrderbookStreamData | undefined;
      if (!data) return;
      if (data.s !== symbol) return;
      const bidsRaw = Array.isArray(data.l?.[0]) ? data.l[0] : [];
      const asksRaw = Array.isArray(data.l?.[1]) ? data.l[1] : [];
      args.onBook({
        symbol,
        bids: toOrderbookLevels(bidsRaw),
        asks: toOrderbookLevels(asksRaw),
        timestampMs: Number(data.t) || Date.now(),
        aggLevel,
      });
    };

    sub.handlers.add(handler);
    if (args.onError) sub.errorHandlers.add(args.onError);

    this.ensureConnected();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isOpen) {
      try {
        this.ws.send(subscribeMsg);
      } catch {
        // ignore; reconnect loop will replay
      }
    }

    return () => {
      const cur = this.subs.get(key);
      if (!cur) return;
      cur.handlers.delete(handler);
      if (args.onError) cur.errorHandlers.delete(args.onError);
      if (cur.handlers.size === 0) {
        this.subs.delete(key);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(unsubscribeMsg);
          } catch {
            // ignore
          }
        }
      }
      this.cleanupIfIdle();
    };
  }

  subscribeAccountInfo(args: {
    account: string;
    onInfo: (data: AccountInfoStreamData) => void;
    onError?: (err: unknown) => void;
  }): () => void {
    const key = this.subKey('account_info', '*');

    const params = {
      source: 'account_info',
      account: args.account,
    };
    const subscribeMsg = JSON.stringify({ method: 'subscribe', params });
    const unsubscribeMsg = JSON.stringify({ method: 'unsubscribe', params });

    let sub = this.subs.get(key);
    if (!sub) {
      sub = {
        subscribeMsg,
        params,
        handlers: new Set(),
        errorHandlers: new Set(),
      };
      this.subs.set(key, sub);
    }

    const handler = (env: WsEnvelope<unknown>) => {
      const data = env.data as AccountInfoStreamData | undefined;
      if (!data) return;
      args.onInfo(data);
    };

    sub.handlers.add(handler);
    if (args.onError) sub.errorHandlers.add(args.onError);

    this.ensureConnected();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isOpen) {
      try {
        this.ws.send(subscribeMsg);
      } catch {
        // ignore; reconnect loop will replay
      }
    }

    return () => {
      const cur = this.subs.get(key);
      if (!cur) return;
      cur.handlers.delete(handler);
      if (args.onError) cur.errorHandlers.delete(args.onError);
      if (cur.handlers.size === 0) {
        this.subs.delete(key);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(unsubscribeMsg);
          } catch {
            // ignore
          }
        }
      }
      this.cleanupIfIdle();
    };
  }

  subscribeAccountPositions(args: {
    account: string;
    onPositions: (rows: AccountPositionsStreamRow[]) => void;
    onError?: (err: unknown) => void;
  }): () => void {
    const key = this.subKey('account_positions', '*');

    const params = {
      source: 'account_positions',
      account: args.account,
    };
    const subscribeMsg = JSON.stringify({ method: 'subscribe', params });
    const unsubscribeMsg = JSON.stringify({ method: 'unsubscribe', params });

    let sub = this.subs.get(key);
    if (!sub) {
      sub = {
        subscribeMsg,
        params,
        handlers: new Set(),
        errorHandlers: new Set(),
      };
      this.subs.set(key, sub);
    }

    const handler = (env: WsEnvelope<unknown>) => {
      const rows = env.data as AccountPositionsStreamRow[] | undefined;
      if (!Array.isArray(rows)) return;
      args.onPositions(rows);
    };

    sub.handlers.add(handler);
    if (args.onError) sub.errorHandlers.add(args.onError);

    this.ensureConnected();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isOpen) {
      try {
        this.ws.send(subscribeMsg);
      } catch {
        // ignore
      }
    }

    return () => {
      const cur = this.subs.get(key);
      if (!cur) return;
      cur.handlers.delete(handler);
      if (args.onError) cur.errorHandlers.delete(args.onError);
      if (cur.handlers.size === 0) {
        this.subs.delete(key);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(unsubscribeMsg);
          } catch {
            // ignore
          }
        }
      }
      this.cleanupIfIdle();
    };
  }

  subscribeAccountLeverage(args: {
    account: string;
    onLeverage: (data: AccountLeverageStreamData) => void;
    onError?: (err: unknown) => void;
  }): () => void {
    const key = this.subKey('account_leverage', '*');

    const params = {
      source: 'account_leverage',
      account: args.account,
    };
    const subscribeMsg = JSON.stringify({ method: 'subscribe', params });
    const unsubscribeMsg = JSON.stringify({ method: 'unsubscribe', params });

    let sub = this.subs.get(key);
    if (!sub) {
      sub = {
        subscribeMsg,
        params,
        handlers: new Set(),
        errorHandlers: new Set(),
      };
      this.subs.set(key, sub);
    }

    const handler = (env: WsEnvelope<unknown>) => {
      const data = env.data as AccountLeverageStreamData | undefined;
      if (!data || typeof data.s !== 'string') return;
      args.onLeverage(data);
    };

    sub.handlers.add(handler);
    if (args.onError) sub.errorHandlers.add(args.onError);

    this.ensureConnected();
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isOpen) {
      try {
        this.ws.send(subscribeMsg);
      } catch {
        // ignore
      }
    }

    return () => {
      const cur = this.subs.get(key);
      if (!cur) return;
      cur.handlers.delete(handler);
      if (args.onError) cur.errorHandlers.delete(args.onError);
      if (cur.handlers.size === 0) {
        this.subs.delete(key);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(unsubscribeMsg);
          } catch {
            // ignore
          }
        }
      }
      this.cleanupIfIdle();
    };
  }
}

type PacificaWsGlobal = { __pacificaWs?: PacificaWsManager };

const wsManager =
  typeof window === 'undefined'
    ? null
    : (() => {
        const g = globalThis as unknown as PacificaWsGlobal;
        if (!g.__pacificaWs) g.__pacificaWs = new PacificaWsManager();
        return g.__pacificaWs;
      })();

function sortJsonKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortJsonKeys);
  }
  if (obj && typeof obj === 'object') {
    const rec = obj as Record<string, unknown>;
    return Object.keys(rec)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortJsonKeys(rec[key]);
        return acc;
      }, {});
  }
  return obj;
}

class PacificaHelper {
  static getMarkets = async () => {
    const res = await fetch(`${PACIFICA_API_BASE}/info`);
    if (!res.ok) {
      throw new Error(`get markets failed: ${res.status}`);
    }

    const data = (await res.json()) as unknown;

    // Pacifica docs commonly return an object containing a list of markets.
    // Be defensive and normalize into an array.
    if (Array.isArray(data)) {
      return data as PacificaMarketInfo[];
    }
    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>;
      const maybe = rec.markets ?? rec.data ?? rec.items;
      if (Array.isArray(maybe)) {
        return maybe as PacificaMarketInfo[];
      }
    }
    return [];
  };

  static fetchBuilderApprovals = async (account: string) => {
    const res = await fetch(
      `${PACIFICA_API_BASE}/account/builder_codes/approvals?account=${encodeURIComponent(
        account,
      )}`,
    )
      .then((res) => res.json())
      .catch(() => {
        throw new Error('approval check failed');
      });
    const data = res.data;
    return Array.isArray(data) ? (data as BuilderApprovalRow[]) : [];
  };

  static approveBuilderCode = async (args: {
    account: string;
    builderCode: string;
    maxFeeRate: string;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  }) => {
    const timestamp = Date.now();
    const expiry_window = 5000;

    const toSign = sortJsonKeys({
      timestamp,
      expiry_window,
      type: 'approve_builder_code',
      data: {
        builder_code: args.builderCode,
        max_fee_rate: Number(args.maxFeeRate),
      },
    });

    const compact = JSON.stringify(toSign);
    const messageBytes = new TextEncoder().encode(compact);
    const signatureBytes = await args.signMessage(messageBytes);
    const signature = bs58.encode(signatureBytes);

    const payload = {
      account: args.account,
      agent_wallet: null,
      signature,
      timestamp,
      expiry_window,
      builder_code: args.builderCode,
      max_fee_rate: Number(args.maxFeeRate),
    };

    const res = await fetch(
      `${PACIFICA_API_BASE}/account/builder_codes/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`approve failed: ${res.status} ${text}`);
    }

    return res.json().catch(() => null);
  };

  static getTokenImage = (ticker: string) =>
    `https://app.pacifica.fi/imgs/tokens/${ticker}.svg`;

  static getAccountInfo = async (args: {
    account: string;
  }): Promise<PacificaAccountInfo> => {
    const url = new URL(`${PACIFICA_API_BASE}/account`);
    url.searchParams.set('account', args.account);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`get account info failed: ${res.status}`);
    }

    const json = (await res.json()) as unknown;
    const data = (() => {
      if (json && typeof json === 'object') {
        const rec = json as Record<string, unknown>;
        return rec.data;
      }
      return null;
    })();

    const d = (data ?? {}) as Record<string, unknown>;

    const num = (key: string): number => {
      const v = d[key];
      const n =
        typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
      return Number.isFinite(n) ? n : 0;
    };

    return {
      balance: num('balance'),
      feeLevel: num('fee_level'),
      makerFee: num('maker_fee'),
      takerFee: num('taker_fee'),
      accountEquity: num('account_equity'),
      availableToSpend: num('available_to_spend'),
      availableToWithdraw: num('available_to_withdraw'),
      pendingBalance: num('pending_balance'),
      totalMarginUsed: num('total_margin_used'),
      crossMmr: num('cross_mmr'),
      positionsCount: num('positions_count'),
      ordersCount: num('orders_count'),
      stopOrdersCount: num('stop_orders_count'),
      updatedAtMs: num('updated_at'),
    };
  };

  /**
   * Account margin mode + leverage per symbol (REST).
   * Docs: `GET /api/v1/account/settings`.
   * See `https://pacifica.gitbook.io/docs/api-documentation/api/rest-api/account/get-account-settings`.
   */
  static getAccountSettings = async (args: {
    account: string;
  }): Promise<PacificaAccountSettings> => {
    const url = new URL(`${PACIFICA_API_BASE}/account/settings`);
    url.searchParams.set('account', args.account);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`get account settings failed: ${res.status}`);
    }

    const json = (await res.json()) as unknown;
    const data = (() => {
      if (json && typeof json === 'object') {
        const rec = json as Record<string, unknown>;
        return rec.data;
      }
      return null;
    })();

    const d = (data ?? {}) as Record<string, unknown>;

    const autoRaw = d.auto_lend_disabled;
    const autoLendDisabled =
      autoRaw === null || autoRaw === undefined
        ? null
        : typeof autoRaw === 'boolean'
        ? autoRaw
        : Boolean(autoRaw);

    const marginRows = Array.isArray(d.margin_settings)
      ? (d.margin_settings as Record<string, unknown>[])
      : [];

    const marginSettings: PacificaMarginSetting[] = marginRows.map((row) => {
      const lev = row.leverage;
      const leverage =
        typeof lev === 'number'
          ? lev
          : typeof lev === 'string'
          ? Number(lev)
          : NaN;
      return {
        symbol: String(row.symbol ?? ''),
        isolated: Boolean(row.isolated),
        leverage: Number.isFinite(leverage) ? leverage : 0,
        createdAtMs: Number(row.created_at) || 0,
        updatedAtMs: Number(row.updated_at) || 0,
      };
    });

    const spotSettings = Array.isArray(d.spot_settings) ? d.spot_settings : [];

    return {
      autoLendDisabled,
      marginSettings,
      spotSettings,
    };
  };

  /**
   * Update per-symbol leverage for an account.
   * Docs: `POST /api/v1/account/leverage` with signing type `update_leverage`.
   * See `https://pacifica.gitbook.io/docs/api-documentation/api/rest-api/account/update-leverage`.
   */
  static updateLeverage = async (args: {
    account: string;
    symbol: string;
    leverage: number;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    expiryWindowMs?: number;
    agentWallet?: string | null;
  }) => {
    const timestamp = Date.now();
    const expiry_window = Math.max(0, Math.floor(args.expiryWindowMs ?? 30000));

    const toSign = sortJsonKeys({
      timestamp,
      expiry_window,
      type: 'update_leverage',
      data: {
        symbol: args.symbol,
        leverage: Math.floor(args.leverage),
      },
    });

    const compact = JSON.stringify(toSign);
    const messageBytes = new TextEncoder().encode(compact);
    const signatureBytes = await args.signMessage(messageBytes);
    const signature = bs58.encode(signatureBytes);

    const payload = {
      account: args.account,
      symbol: args.symbol,
      leverage: Math.floor(args.leverage),
      timestamp,
      expiry_window,
      agent_wallet: args.agentWallet ?? null,
      signature,
    };

    const res = await fetch(`${PACIFICA_API_BASE}/account/leverage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const result = await res.json().catch(() => null);
      const msg =
        result && typeof result === 'object' && 'error' in result
          ? String((result as { error?: unknown }).error ?? res.status)
          : `${res.status}`;
      throw new Error(`update leverage failed: ${msg}`);
    }

    return res.json().catch(() => null);
  };

  static getPositions = async (args: {
    account: string;
  }): Promise<PacificaPosition[]> => {
    const url = new URL(`${PACIFICA_API_BASE}/positions`);
    url.searchParams.set('account', args.account);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`get positions failed: ${res.status}`);
    }

    const json = (await res.json()) as unknown;
    const data = (() => {
      if (json && typeof json === 'object') {
        const rec = json as Record<string, unknown>;
        return rec.data;
      }
      return null;
    })();

    if (!Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map((row) => {
      const symbol = String(row.symbol ?? row.s ?? '');
      const side = String(row.side ?? row.d ?? '') as 'bid' | 'ask';
      const amount = Number(row.amount ?? row.a ?? 0);
      const entryPrice = Number(row.entry_price ?? row.p ?? 0);
      const margin = Number(row.margin ?? row.m ?? 0);
      const funding = Number(row.funding ?? row.f ?? 0);
      const isolated = Boolean(row.isolated ?? row.i ?? false);
      const liquidationPrice = Number(row.liquidation_price ?? row.l ?? null);
      const updatedAtMs = Number(row.updated_at ?? row.t ?? 0);

      const builder_code =
        typeof (row as { builder_code?: unknown }).builder_code === 'string'
          ? ((row as { builder_code?: unknown }).builder_code as string)
          : undefined;

      return {
        symbol,
        side,
        amount: Number.isFinite(amount) ? amount : 0,
        entryPrice: Number.isFinite(entryPrice) ? entryPrice : 0,
        margin: Number.isFinite(margin) ? margin : 0,
        funding: Number.isFinite(funding) ? funding : 0,
        isolated,
        liquidationPrice:
          liquidationPrice !== null && Number.isFinite(liquidationPrice)
            ? liquidationPrice
            : null,
        updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
        builder_code,
      } as PacificaPosition;
    });
  };

  static marketOrder = async (args: {
    account: string;
    symbol: string;
    side: 'bid' | 'ask';
    amount: string;
    slippagePercent: string;
    reduceOnly?: boolean;
    builderCode: string;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  }) => {
    const timestamp = Date.now();
    const expiry_window = 30000;

    const toSign = sortJsonKeys({
      timestamp,
      expiry_window,
      type: 'create_market_order',
      data: {
        symbol: args.symbol,
        amount: args.amount,
        side: args.side,
        slippage_percent: args.slippagePercent,
        reduce_only: !!args.reduceOnly,
        builder_code: args.builderCode,
      },
    });

    const compact = JSON.stringify(toSign);
    const messageBytes = new TextEncoder().encode(compact);
    const signatureBytes = await args.signMessage(messageBytes);
    const signature = bs58.encode(signatureBytes);

    const payload = {
      account: args.account,
      agent_wallet: null,
      signature,
      timestamp,
      expiry_window,
      symbol: args.symbol,
      side: args.side,
      amount: args.amount,
      slippage_percent: args.slippagePercent,
      reduce_only: !!args.reduceOnly,
      builder_code: args.builderCode,
    };

    const res = await fetch(`${PACIFICA_API_BASE}/orders/create_market`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const result = await res.json();
      console.error(`market order failed: ${res.status} ${result.error}`);
      throw new Error(`market order failed: ${result.error}`);
    }

    return res.json().catch(() => null);
  };

  static limitOrder = async (args: {
    account: string;
    symbol: string;
    side: 'bid' | 'ask';
    price: number;
    amount: string;
    tif: 'GTC' | 'IOC' | 'ALO' | 'TOB';
    reduceOnly?: boolean;
    builderCode: string;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  }) => {
    const timestamp = Date.now();
    const expiry_window = 5000;

    const toSign = sortJsonKeys({
      timestamp,
      expiry_window,
      type: 'create_order',
      data: {
        symbol: args.symbol,
        price: String(args.price),
        amount: String(args.amount),
        side: args.side,
        tif: args.tif,
        reduce_only: !!args.reduceOnly,
        builder_code: args.builderCode,
      },
    });

    const compact = JSON.stringify(toSign);
    const messageBytes = new TextEncoder().encode(compact);
    const signatureBytes = await args.signMessage(messageBytes);
    const signature = bs58.encode(signatureBytes);

    const payload = {
      account: args.account,
      signature,
      timestamp,
      symbol: args.symbol,
      price: String(args.price),
      amount: String(args.amount),
      side: args.side,
      tif: args.tif,
      reduce_only: !!args.reduceOnly,
      builder_code: args.builderCode,
      agent_wallet: null,
      expiry_window,
    };

    const res = await fetch(`${PACIFICA_API_BASE}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const result = await res.json();
      console.error(`limit order failed: ${res.status} ${result.error}`);
      throw new Error(`limit order failed: ${result.error}`);
    }

    return res.json().catch(() => null);
  };

  /**
   * Close (reduce) an open perp position via market or limit order with reduce_only.
   * Pass the position's side (bid = long, ask = short); the helper submits the opposite side.
   */
  static closePosition = async (args: {
    account: string;
    symbol: string;
    positionSide: 'bid' | 'ask';
    amount: string;
    /** When set, amount is floored to a multiple of this lot size before signing. */
    lotSize?: number;
    mode: 'market' | 'limit';
    limitPrice?: number;
    slippagePercent?: string;
    builderCode: string;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  }) => {
    const closeSide: 'bid' | 'ask' =
      args.positionSide === 'bid' ? 'ask' : 'bid';

    let amountStr = args.amount.trim();
    if (
      args.lotSize !== undefined &&
      Number.isFinite(args.lotSize) &&
      args.lotSize > 0
    ) {
      const n = Number(amountStr.replace(/,/g, ''));
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error('invalid close amount');
      }
      const onGrid = PositionHelper.floorToLotSize(n, args.lotSize);
      if (onGrid <= 0) {
        throw new Error('close amount must be at least one lot');
      }
      amountStr = PositionHelper.formatCloseAmountForApi(onGrid, args.lotSize);
    }

    if (args.mode === 'market') {
      return PacificaHelper.marketOrder({
        account: args.account,
        symbol: args.symbol,
        side: closeSide,
        amount: amountStr,
        slippagePercent: args.slippagePercent ?? '0.5',
        reduceOnly: true,
        builderCode: args.builderCode,
        signMessage: args.signMessage,
      });
    }

    const px = args.limitPrice;
    if (px === undefined || !Number.isFinite(px) || px <= 0) {
      throw new Error('limit close requires a positive limit price');
    }

    return PacificaHelper.limitOrder({
      account: args.account,
      symbol: args.symbol,
      side: closeSide,
      price: px,
      amount: amountStr,
      tif: 'GTC',
      reduceOnly: true,
      builderCode: args.builderCode,
      signMessage: args.signMessage,
    });
  };

  /** First available of mid / mark / oracle from a prices row (REST or WS). */
  static getPriceFromPricesRow = (
    row: PacificaMarketPriceRow,
  ): number | null => {
    const candidates = [row.mid, row.mark, row.oracle];
    for (const c of candidates) {
      if (typeof c !== 'string') continue;
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  static getMarketPrice = async (args: {
    market: string;
  }): Promise<number | null> => {
    const res = await fetch(`${PACIFICA_API_BASE}/info/prices`);
    if (!res.ok) {
      throw new Error(`get prices failed: ${res.status}`);
    }

    const json = (await res.json()) as unknown;
    const data = (() => {
      if (json && typeof json === 'object') {
        const rec = json as Record<string, unknown>;
        if (Array.isArray(rec.data)) return rec.data;
      }
      if (Array.isArray(json)) return json;
      return [];
    })();

    const rows = data as PacificaMarketPriceRow[];
    const row = rows.find((r) => r && r.symbol === args.market);
    if (!row) return null;
    return PacificaHelper.getPriceFromPricesRow(row);
  };

  static getOrderbook = async (args: {
    market: string;
    aggLevel?: 1 | 10 | 100 | 1000 | 10000;
  }): Promise<PacificaOrderbook> => {
    const aggLevel = args.aggLevel ?? 1;
    const url = new URL(`${PACIFICA_API_BASE}/book`);
    url.searchParams.set('symbol', args.market);
    url.searchParams.set('agg_level', String(aggLevel));

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`get orderbook failed: ${res.status}`);
    }

    const json = (await res.json()) as unknown;
    const data = (() => {
      if (json && typeof json === 'object') {
        const rec = json as Record<string, unknown>;
        return rec.data;
      }
      return null;
    })();

    const d = data as Partial<OrderbookStreamData> | null;
    const symbol = d && typeof d.s === 'string' && d.s ? d.s : args.market;
    const t =
      d && typeof d.t === 'number' && Number.isFinite(d.t) ? d.t : Date.now();
    const bidsRaw =
      d && d.l && Array.isArray(d.l[0])
        ? (d.l[0] as OrderbookStreamLevel[])
        : [];
    const asksRaw =
      d && d.l && Array.isArray(d.l[1])
        ? (d.l[1] as OrderbookStreamLevel[])
        : [];

    return {
      symbol,
      bids: toOrderbookLevels(bidsRaw),
      asks: toOrderbookLevels(asksRaw),
      timestampMs: t,
      aggLevel,
    };
  };

  static getCandles = async (args: {
    market: string;
    resolution: string;
    from: number; // unix seconds
    to: number; // unix seconds
  }): Promise<PacificaCandle[]> => {
    const url = new URL(`${PACIFICA_API_BASE}/kline`);
    url.searchParams.set('symbol', args.market);
    url.searchParams.set('interval', args.resolution);
    url.searchParams.set('start_time', String(args.from));
    url.searchParams.set('end_time', String(args.to));

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`get candles failed: ${res.status}`);
    }

    const data = (await res.json()) as unknown;

    // Normalize several common shapes:
    // 1) [{ time/open/high/low/close }] or [{ timestamp, o,h,l,c }]
    // 2) [[time, open, high, low, close], ...]
    // 3) { data: [...] } / { candles: [...] }
    const raw = (() => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object') {
        const rec = data as Record<string, unknown>;
        const maybe = rec.candles ?? rec.data ?? rec.items;
        if (Array.isArray(maybe)) return maybe;
      }
      return [];
    })();

    const out: PacificaCandle[] = [];
    for (const row of raw) {
      if (Array.isArray(row) && row.length >= 5) {
        const t = Number(row[0]);
        const time = t > 1e12 ? Math.floor(t / 1000) : t; // ms → s
        out.push({
          time,
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
        });
        continue;
      }

      if (row && typeof row === 'object') {
        const r = row as Record<string, unknown>;
        const t =
          (r.time as number | undefined) ??
          (r.timestamp as number | undefined) ??
          (r.t as number | undefined);
        const timeNum = Number(t);
        if (!Number.isFinite(timeNum)) continue;
        const time = timeNum > 1e12 ? Math.floor(timeNum / 1000) : timeNum;

        const open = Number(r.open ?? r.o);
        const high = Number(r.high ?? r.h);
        const low = Number(r.low ?? r.l);
        const close = Number(r.close ?? r.c);
        if (
          !Number.isFinite(open) ||
          !Number.isFinite(high) ||
          !Number.isFinite(low) ||
          !Number.isFinite(close)
        ) {
          continue;
        }

        out.push({ time, open, high, low, close });
      }
    }

    out.sort((a, b) => a.time - b.time);
    return out;
  };

  /**
   * Subscribe to live candle updates via websocket.
   * Docs: `source=candle`, params include `symbol` and `interval`.
   * See `https://pacifica.gitbook.io/docs/api-documentation/api/websocket/subscriptions/candle`.
   */
  static subscribeCandles = (args: CandleSubscriptionArgs): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }
    return wsManager.subscribeCandle(args);
  };

  /**
   * Subscribe to all symbol price rows via websocket.
   * Docs: `source=prices` streams updates for markets.
   * See `https://pacifica.gitbook.io/docs/api-documentation/api/websocket/subscriptions/prices`.
   */
  static subscribePrices = (args: PricesSubscriptionArgs): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }

    return wsManager.subscribePrices({
      onPrices: (rows) => {
        args.onPrices(rows as PacificaMarketPriceRow[]);
      },
      onError: args.onError,
    });
  };

  /**
   * Subscribe to the latest price for one symbol (filters global `prices` stream).
   */
  static subscribeLastPrice = (
    args: LastPriceSubscriptionArgs,
  ): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }

    return wsManager.subscribePrices({
      onPrices: (rows) => {
        const row = rows.find((r) => r && r.symbol === args.market);
        if (!row) return;
        const n = PacificaHelper.getPriceFromPricesRow(
          row as PacificaMarketPriceRow,
        );
        if (n !== null) args.onPrice(n);
      },
      onError: args.onError,
    });
  };

  /**
   * Subscribe to live orderbook updates via websocket.
   * Docs: `source=book`, params include `symbol` and `agg_level`.
   * See `https://pacifica.gitbook.io/docs/api-documentation/api/websocket/subscriptions/orderbook`.
   */
  static subscribeOrderbook = (
    args: OrderbookSubscriptionArgs,
  ): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }
    return wsManager.subscribeOrderbook({
      market: args.market,
      aggLevel: args.aggLevel ?? 1,
      onBook: args.onBook,
      onError: args.onError,
    });
  };

  /**
   * Subscribe to live account info updates via websocket.
   * Docs: `source=account_info`, params include `account`.
   * See `https://pacifica.gitbook.io/docs/api-documentation/api/websocket/subscriptions/account-info`.
   */
  static subscribeAccountInfo = (
    args: AccountInfoSubscriptionArgs,
  ): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }

    return wsManager.subscribeAccountInfo({
      account: args.account,
      onInfo: (raw) => {
        const num = (v: unknown): number => {
          const n =
            typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
          return Number.isFinite(n) ? n : 0;
        };

        const info: PacificaAccountInfo = {
          balance: num(raw.b),
          feeLevel: num(raw.f),
          makerFee: 0,
          takerFee: 0,
          accountEquity: num(raw.ae),
          availableToSpend: num(raw.as),
          availableToWithdraw: num(raw.aw),
          pendingBalance: num(raw.pb),
          totalMarginUsed: num(raw.mu),
          crossMmr: num(raw.cm),
          positionsCount: num(raw.pc),
          ordersCount: num(raw.oc),
          stopOrdersCount: num(raw.sc),
          updatedAtMs: num(raw.t),
        };

        args.onInfo(info);
      },
      onError: args.onError,
    });
  };

  static subscribeAccountPositions = (
    args: AccountPositionsSubscriptionArgs,
  ): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }

    return wsManager.subscribeAccountPositions({
      account: args.account,
      onPositions: (rows) => {
        const positions: PacificaPosition[] = rows.map((row) => {
          const symbol = String(row.s ?? '');
          const side = String(row.d ?? '') as 'bid' | 'ask';
          const amount = Number(row.a ?? 0);
          const entryPrice = Number(row.p ?? 0);
          const margin = Number(row.m ?? 0);
          const funding = Number(row.f ?? 0);
          const isolated = Boolean(row.i ?? false);
          const liquidationPrice =
            typeof row.l === 'string' ? Number(row.l) : null;
          const updatedAtMs = Number(row.t ?? 0);

          const builder_code =
            typeof (row as { builder_code?: unknown }).builder_code === 'string'
              ? ((row as { builder_code?: unknown }).builder_code as string)
              : undefined;

          return {
            symbol,
            side,
            amount: Number.isFinite(amount) ? amount : 0,
            entryPrice: Number.isFinite(entryPrice) ? entryPrice : 0,
            margin: Number.isFinite(margin) ? margin : 0,
            funding: Number.isFinite(funding) ? funding : 0,
            isolated,
            liquidationPrice:
              liquidationPrice !== null && Number.isFinite(liquidationPrice)
                ? liquidationPrice
                : null,
            updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
            builder_code,
          };
        });

        args.onPositions(positions);
      },
      onError: args.onError,
    });
  };

  /**
   * Live leverage changes per symbol for an account.
   * Docs: `source=account_leverage`, params include `account`.
   * See `https://pacifica.gitbook.io/docs/api-documentation/api/websocket/subscriptions/account-leverage`.
   */
  static subscribeAccountLeverage = (
    args: AccountLeverageSubscriptionArgs,
  ): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }

    return wsManager.subscribeAccountLeverage({
      account: args.account,
      onLeverage: (raw) => {
        const account = typeof raw.u === 'string' ? raw.u : args.account;
        const symbol = raw.s;
        if (!symbol) return;
        const levRaw = raw.l;
        const leverage =
          typeof levRaw === 'number'
            ? levRaw
            : typeof levRaw === 'string'
            ? Number(levRaw)
            : NaN;
        if (!Number.isFinite(leverage)) return;
        const updatedAtMs = Number(raw.t);
        args.onLeverage({
          account,
          symbol,
          leverage,
          updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now(),
        });
      },
      onError: args.onError,
    });
  };
}

export default PacificaHelper;
