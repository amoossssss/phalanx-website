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

/** User trade fill from `GET /trades/history` or `account_trades` websocket. */
export type PacificaTradeHistory = {
  historyId: number;
  orderId: number;
  clientOrderId: string | null;
  symbol: string;
  amount: string;
  price: string;
  entryPrice: string;
  fee: string;
  pnl: string;
  eventType: string;
  side: string;
  cause: string;
  createdAtMs: number;
};

/** Normalized open order from REST `GET /orders` or merged with websocket `account_order_updates`. */
export type PacificaOpenOrder = {
  orderId: number;
  clientOrderId: string | null;
  symbol: string;
  side: 'bid' | 'ask';
  price: string;
  initialAmount: string;
  filledAmount: string;
  cancelledAmount: string;
  orderType: string;
  reduceOnly: boolean;
  orderStatus: string;
  createdAtMs: number;
  updatedAtMs: number;
};

/** Historical order from REST `GET /orders/history`. */
export type PacificaOrderHistory = {
  orderId: number;
  clientOrderId: string | null;
  symbol: string;
  side: 'bid' | 'ask';
  initialPrice: string;
  averageFilledPrice: string;
  amount: string;
  filledAmount: string;
  orderStatus: string;
  orderType: string;
  stopPrice: string | null;
  stopParentOrderId: number | null;
  reduceOnly: boolean;
  reason: string | null;
  createdAtMs: number;
  updatedAtMs: number;
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

/** `account_order_updates` stream row (short keys). See Pacifica websocket docs. */
export type PacificaAccountOrderStreamRow = {
  i?: number;
  I?: string | null;
  u?: string;
  s?: string;
  d?: string;
  p?: string;
  ip?: string;
  lp?: string;
  a?: string;
  f?: string;
  oe?: string;
  os?: string;
  ot?: string;
  sp?: string | null;
  si?: string | null;
  r?: boolean;
  ct?: number;
  ut?: number;
  li?: number;
  [key: string]: unknown;
};

/** `account_trades` stream row (short keys). See Pacifica websocket docs. */
export type PacificaAccountTradeStreamRow = {
  h?: number;
  i?: number;
  I?: string | null;
  u?: string;
  s?: string;
  p?: string;
  o?: string;
  a?: string;
  te?: string;
  ts?: string;
  tc?: string;
  f?: string;
  n?: string;
  t?: number;
  li?: number;
  [key: string]: unknown;
};

type AccountLeverageSubscriptionArgs = {
  account: string;
  onLeverage: (update: PacificaAccountLeverageUpdate) => void;
  onError?: (err: unknown) => void;
};

type AccountOrderUpdatesSubscriptionArgs = {
  account: string;
  onOrderEvents: (rows: PacificaAccountOrderStreamRow[]) => void;
  onError?: (err: unknown) => void;
};

type AccountTradesSubscriptionArgs = {
  account: string;
  onTrades: (rows: PacificaAccountTradeStreamRow[]) => void;
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

      // Account order updates: channel="account_order_updates"
      if (channel === 'account_order_updates') {
        const key = this.subKey('account_order_updates', '*');
        const sub = this.subs.get(key);
        if (!sub) return;
        sub.handlers.forEach((h) => h(env));
        return;
      }

      // Account trades: channel="account_trades"
      if (channel === 'account_trades') {
        const key = this.subKey('account_trades', '*');
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

  subscribeAccountOrderUpdates(
    args: AccountOrderUpdatesSubscriptionArgs,
  ): () => void {
    const key = this.subKey('account_order_updates', '*');

    const params = {
      source: 'account_order_updates',
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
      const rows = env.data as PacificaAccountOrderStreamRow[] | undefined;
      if (!Array.isArray(rows)) return;
      args.onOrderEvents(rows);
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

  subscribeAccountTrades(args: AccountTradesSubscriptionArgs): () => void {
    const key = this.subKey('account_trades', '*');

    const params = {
      source: 'account_trades',
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
      const rows = env.data as PacificaAccountTradeStreamRow[] | undefined;
      if (!Array.isArray(rows)) return;
      args.onTrades(rows);
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

  /** REST open orders: `GET /api/v1/orders?account=…`. */
  static getOpenOrders = async (args: {
    account: string;
  }): Promise<PacificaOpenOrder[]> => {
    const url = new URL(`${PACIFICA_API_BASE}/orders`);
    url.searchParams.set('account', args.account);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`get open orders failed: ${res.status}`);
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

    const out: PacificaOpenOrder[] = [];
    for (const row of data as Record<string, unknown>[]) {
      const orderId = Number(row.order_id ?? row.orderId ?? 0);
      if (!Number.isFinite(orderId) || orderId <= 0) continue;

      const clientRaw = row.client_order_id ?? row.clientOrderId;
      const clientOrderId =
        clientRaw === null || clientRaw === undefined
          ? null
          : String(clientRaw);
      const symbol = String(row.symbol ?? '');
      const side = String(row.side ?? '') === 'ask' ? 'ask' : 'bid';
      out.push({
        orderId,
        clientOrderId,
        symbol,
        side,
        price: String(row.price ?? ''),
        initialAmount: String(row.initial_amount ?? row.initialAmount ?? '0'),
        filledAmount: String(row.filled_amount ?? row.filledAmount ?? '0'),
        cancelledAmount: String(
          row.cancelled_amount ?? row.cancelledAmount ?? '0',
        ),
        orderType: String(row.order_type ?? row.orderType ?? ''),
        reduceOnly: Boolean(row.reduce_only ?? row.reduceOnly ?? false),
        orderStatus: 'open',
        createdAtMs: Number(row.created_at ?? row.createdAt ?? 0),
        updatedAtMs: Number(row.updated_at ?? row.updatedAt ?? 0),
      });
    }
    return out;
  };

  /**
   * REST trade history: `GET /api/v1/trades/history`.
   * See https://pacifica.gitbook.io/docs/api-documentation/api/rest-api/account/get-trade-history
   */
  static getTradeHistory = async (args: {
    account: string;
    symbol?: string;
    startTimeMs?: number;
    endTimeMs?: number;
    limit?: number;
    cursor?: string;
  }): Promise<{
    trades: PacificaTradeHistory[];
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const url = new URL(`${PACIFICA_API_BASE}/trades/history`);
    url.searchParams.set('account', args.account);
    if (args.symbol) url.searchParams.set('symbol', args.symbol);
    if (args.startTimeMs != null && Number.isFinite(args.startTimeMs)) {
      url.searchParams.set('start_time', String(Math.floor(args.startTimeMs)));
    }
    if (args.endTimeMs != null && Number.isFinite(args.endTimeMs)) {
      url.searchParams.set('end_time', String(Math.floor(args.endTimeMs)));
    }
    if (args.limit != null && args.limit > 0) {
      url.searchParams.set('limit', String(Math.floor(args.limit)));
    }
    if (args.cursor) url.searchParams.set('cursor', args.cursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`get trade history failed: ${res.status}`);
    }

    const json = (await res.json()) as Record<string, unknown>;
    const data = json.data;
    const trades: PacificaTradeHistory[] = [];
    if (Array.isArray(data)) {
      for (const row of data as Record<string, unknown>[]) {
        const t = PacificaHelper.tradeHistoryFromRestRow(row);
        if (t) trades.push(t);
      }
    }

    const nextRaw = json.next_cursor ?? json.nextCursor;
    const nextCursor =
      typeof nextRaw === 'string' && nextRaw.length > 0 ? nextRaw : null;
    const hasMore = Boolean(json.has_more ?? json.hasMore ?? nextCursor);

    return { trades, nextCursor, hasMore };
  };

  /**
   * REST order history: `GET /api/v1/orders/history`.
   * See https://pacifica.gitbook.io/docs/api-documentation/api/rest-api/orders/get-order-history
   */
  static getOrderHistory = async (args: {
    account: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    orders: PacificaOrderHistory[];
    nextCursor: string | null;
    hasMore: boolean;
  }> => {
    const url = new URL(`${PACIFICA_API_BASE}/orders/history`);
    url.searchParams.set('account', args.account);
    if (args.limit != null && args.limit > 0) {
      url.searchParams.set('limit', String(Math.floor(args.limit)));
    }
    if (args.cursor) url.searchParams.set('cursor', args.cursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`get order history failed: ${res.status}`);
    }

    const json = (await res.json()) as Record<string, unknown>;
    const data = json.data;
    const orders: PacificaOrderHistory[] = [];
    if (Array.isArray(data)) {
      for (const row of data as Record<string, unknown>[]) {
        const o = PacificaHelper.orderHistoryFromRestRow(row);
        if (o) orders.push(o);
      }
    }

    const nextRaw = json.next_cursor ?? json.nextCursor;
    const nextCursor =
      typeof nextRaw === 'string' && nextRaw.length > 0 ? nextRaw : null;
    const hasMore = Boolean(json.has_more ?? json.hasMore ?? nextCursor);

    return { orders, nextCursor, hasMore };
  };

  private static orderHistoryFromRestRow(
    row: Record<string, unknown>,
  ): PacificaOrderHistory | null {
    const orderId = Number(row.order_id ?? row.orderId ?? 0);
    if (!Number.isFinite(orderId) || orderId <= 0) return null;

    const clientRaw = row.client_order_id ?? row.clientOrderId;
    const clientOrderId =
      clientRaw === null || clientRaw === undefined ? null : String(clientRaw);

    const sideRaw = String(row.side ?? '').toLowerCase();
    const side: 'bid' | 'ask' = sideRaw === 'ask' ? 'ask' : 'bid';

    const initialPrice = String(
      row.initial_price ?? row.price ?? row.initialPrice ?? '',
    );
    const averageFilledPrice = String(
      row.average_filled_price ?? row.averageFilledPrice ?? '0',
    );

    const stopRaw = row.stop_price ?? row.stopPrice;
    let stopPrice: string | null = null;
    if (stopRaw !== null && stopRaw !== undefined && String(stopRaw) !== '') {
      stopPrice = String(stopRaw);
    }

    const parentRaw = row.stop_parent_order_id ?? row.stopParentOrderId;
    let stopParentOrderId: number | null = null;
    if (parentRaw !== null && parentRaw !== undefined) {
      const p = Number(parentRaw);
      if (Number.isFinite(p) && p > 0) stopParentOrderId = p;
    }

    const reasonRaw = row.reason;
    const reason =
      reasonRaw === null || reasonRaw === undefined ? null : String(reasonRaw);

    const createdAtMs = Number(row.created_at ?? row.createdAt ?? 0);
    const updatedAtMs = Number(row.updated_at ?? row.updatedAt ?? 0);

    return {
      orderId,
      clientOrderId,
      symbol: String(row.symbol ?? ''),
      side,
      initialPrice,
      averageFilledPrice,
      amount: String(row.amount ?? '0'),
      filledAmount: String(row.filled_amount ?? row.filledAmount ?? '0'),
      orderStatus: String(row.order_status ?? row.orderStatus ?? ''),
      orderType: String(row.order_type ?? row.orderType ?? ''),
      stopPrice,
      stopParentOrderId,
      reduceOnly: Boolean(row.reduce_only ?? row.reduceOnly ?? false),
      reason,
      createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
      updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
    };
  }

  /**
   * Merge REST-loaded trade history with `account_trades` websocket rows.
   * Dedupes by `historyId` and sorts newest first.
   */
  static mergeTradeHistoryAfterWs(
    prev: PacificaTradeHistory[],
    rows: PacificaAccountTradeStreamRow[],
    account: string,
  ): PacificaTradeHistory[] {
    const incoming: PacificaTradeHistory[] = [];
    for (const row of rows) {
      if (row.u && row.u !== account) continue;
      const t = PacificaHelper.tradeHistoryFromAccountTradeWsRow(row);
      if (t) incoming.push(t);
    }
    if (incoming.length === 0) return prev;

    const map = new Map<number, PacificaTradeHistory>();
    for (const t of prev) {
      map.set(t.historyId, t);
    }
    for (const t of incoming) {
      map.set(t.historyId, t);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.createdAtMs - a.createdAtMs,
    );
  }

  private static tradeHistoryFromRestRow(
    row: Record<string, unknown>,
  ): PacificaTradeHistory | null {
    const historyId = Number(row.history_id ?? 0);
    if (!Number.isFinite(historyId) || historyId <= 0) return null;

    const clientRaw = row.client_order_id ?? row.clientOrderId;
    const clientOrderId =
      clientRaw === null || clientRaw === undefined ? null : String(clientRaw);

    const createdAtMs = Number(row.created_at ?? row.createdAt ?? 0);

    return {
      historyId,
      orderId: Number(row.order_id ?? row.orderId ?? 0) || 0,
      clientOrderId,
      symbol: String(row.symbol ?? ''),
      amount: String(row.amount ?? '0'),
      price: String(row.price ?? '0'),
      entryPrice: String(row.entry_price ?? row.entryPrice ?? '0'),
      fee: String(row.fee ?? '0'),
      pnl: String(row.pnl ?? '0'),
      eventType: String(row.event_type ?? row.eventType ?? ''),
      side: String(row.side ?? ''),
      cause: String(row.cause ?? 'normal'),
      createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
    };
  }

  private static tradeHistoryFromAccountTradeWsRow(
    row: PacificaAccountTradeStreamRow,
  ): PacificaTradeHistory | null {
    const historyId = Number(row.h ?? 0);
    if (!Number.isFinite(historyId) || historyId <= 0) return null;

    const clientRaw = row.I;
    const clientOrderId =
      clientRaw === null || clientRaw === undefined ? null : String(clientRaw);

    const createdAtMs = Number(row.t ?? 0);

    return {
      historyId,
      orderId: Number(row.i ?? 0) || 0,
      clientOrderId,
      symbol: String(row.s ?? ''),
      amount: String(row.a ?? '0'),
      price: String(row.p ?? '0'),
      entryPrice: String(row.o ?? '0'),
      fee: String(row.f ?? '0'),
      pnl: String(row.n ?? '0'),
      eventType: String(row.te ?? ''),
      side: String(row.ts ?? ''),
      cause: String(row.tc ?? 'normal'),
      createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
    };
  }

  /**
   * Merge REST-loaded open orders with `account_order_updates` websocket rows.
   * Removes orders that are filled, cancelled, or rejected; upserts open / partially_filled.
   */
  static mergeOpenOrdersAfterWs(
    prev: PacificaOpenOrder[],
    rows: PacificaAccountOrderStreamRow[],
  ): PacificaOpenOrder[] {
    const map = new Map<number, PacificaOpenOrder>();
    for (const o of prev) {
      if (o.orderId > 0) map.set(o.orderId, o);
    }

    for (const row of rows) {
      const id = Number(row.i);
      if (!Number.isFinite(id)) continue;

      const status = String(row.os ?? '').toLowerCase();
      if (
        status === 'filled' ||
        status === 'cancelled' ||
        status === 'canceled' ||
        status === 'rejected'
      ) {
        map.delete(id);
        continue;
      }

      if (status === 'open' || status === 'partially_filled') {
        const merged = PacificaHelper.openOrderFromWsRow(row, map.get(id));
        if (merged) map.set(id, merged);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.updatedAtMs - a.updatedAtMs,
    );
  }

  private static openOrderFromWsRow(
    row: PacificaAccountOrderStreamRow,
    existing?: PacificaOpenOrder,
  ): PacificaOpenOrder | null {
    const orderId = Number(row.i);
    if (!Number.isFinite(orderId) || orderId <= 0) return null;

    const symbol =
      typeof row.s === 'string' && row.s.length > 0
        ? row.s
        : existing?.symbol ?? '';
    if (!symbol) return null;

    const sideRaw = String(row.d ?? existing?.side ?? 'bid');
    const side: 'bid' | 'ask' = sideRaw === 'ask' ? 'ask' : 'bid';

    const price = String(row.ip ?? row.p ?? existing?.price ?? '');
    const initialAmount = String(row.a ?? existing?.initialAmount ?? '0');
    const filledAmount = String(row.f ?? existing?.filledAmount ?? '0');
    const cancelledAmount = String(existing?.cancelledAmount ?? '0');
    const orderType = String(row.ot ?? existing?.orderType ?? 'limit');
    const reduceOnly = Boolean(
      row.r !== undefined ? row.r : existing?.reduceOnly ?? false,
    );
    const orderStatus = String(row.os ?? existing?.orderStatus ?? 'open');

    let clientOrderId: string | null = existing?.clientOrderId ?? null;
    if (row.I !== undefined) {
      clientOrderId = row.I === null ? null : String(row.I);
    }

    const createdAtMs = Number(row.ct ?? existing?.createdAtMs ?? 0);
    const updatedAtMs = Number(row.ut ?? existing?.updatedAtMs ?? Date.now());

    return {
      orderId,
      clientOrderId,
      symbol,
      side,
      price,
      initialAmount,
      filledAmount,
      cancelledAmount,
      orderType,
      reduceOnly,
      orderStatus,
      createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
      updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now(),
    };
  }

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
   * Cancel an open order (signed). `POST /api/v1/orders/cancel`
   * Docs: https://pacifica.gitbook.io/docs/api-documentation/api/rest-api/orders/cancel-order
   */
  static cancelOrder = async (args: {
    account: string;
    symbol: string;
    /** Exchange order id (use when known). */
    orderId?: number;
    /** Client order UUID when cancelling by CLOID instead of `orderId`. */
    clientOrderId?: string | null;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    agentWallet?: string | null;
  }) => {
    const hasOid =
      args.orderId !== undefined &&
      Number.isFinite(args.orderId) &&
      args.orderId > 0;
    const cloid =
      typeof args.clientOrderId === 'string' &&
      args.clientOrderId.trim().length > 0
        ? args.clientOrderId.trim()
        : '';
    if (!hasOid && !cloid) {
      throw new Error('cancel order requires order_id or client_order_id');
    }

    const timestamp = Date.now();
    const expiry_window = 30000;

    const data: Record<string, unknown> = {
      symbol: args.symbol,
    };
    if (hasOid) {
      data.order_id = args.orderId as number;
    } else {
      data.client_order_id = cloid;
    }

    const toSign = sortJsonKeys({
      timestamp,
      expiry_window,
      type: 'cancel_order',
      data,
    });

    const compact = JSON.stringify(toSign);
    const messageBytes = new TextEncoder().encode(compact);
    const signatureBytes = await args.signMessage(messageBytes);
    const signature = bs58.encode(signatureBytes);

    const payload: Record<string, unknown> = {
      account: args.account,
      signature,
      timestamp,
      symbol: args.symbol,
      agent_wallet: args.agentWallet ?? null,
      expiry_window,
    };
    if (hasOid) {
      payload.order_id = args.orderId as number;
    } else {
      payload.client_order_id = cloid;
    }

    const res = await fetch(`${PACIFICA_API_BASE}/orders/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      const msg =
        result && typeof result === 'object' && 'error' in result
          ? String((result as { error?: unknown }).error ?? res.status)
          : `${res.status}`;
      console.error(`cancel order failed: ${res.status} ${msg}`);
      throw new Error(`cancel order failed: ${msg}`);
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

  /**
   * Live order lifecycle for an account (make, fill, cancel, …).
   * Docs: `source=account_order_updates`, params include `account`.
   * See https://pacifica.gitbook.io/docs/api-documentation/api/websocket/subscriptions/account-order-updates
   */
  static subscribeAccountOrderUpdates = (args: {
    account: string;
    onOrderEvents: (rows: PacificaAccountOrderStreamRow[]) => void;
    onError?: (err: unknown) => void;
  }): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }

    return wsManager.subscribeAccountOrderUpdates({
      account: args.account,
      onOrderEvents: (rows) => {
        const filtered = rows.filter((r) => !r.u || r.u === args.account);
        if (filtered.length === 0) return;
        args.onOrderEvents(filtered);
      },
      onError: args.onError,
    });
  };

  /**
   * Live trade fills for an account.
   * Docs: `source=account_trades`, params include `account`.
   * See https://pacifica.gitbook.io/docs/api-documentation/api/websocket/subscriptions/account-trades
   */
  static subscribeAccountTrades = (args: {
    account: string;
    onTrades: (rows: PacificaAccountTradeStreamRow[]) => void;
    onError?: (err: unknown) => void;
  }): (() => void) => {
    if (!wsManager) {
      args.onError?.(new Error('websocket unavailable (server-side)'));
      return () => {};
    }

    return wsManager.subscribeAccountTrades({
      account: args.account,
      onTrades: (rows) => {
        const filtered = rows.filter((r) => !r.u || r.u === args.account);
        if (filtered.length === 0) return;
        args.onTrades(filtered);
      },
      onError: args.onError,
    });
  };
}

export default PacificaHelper;
