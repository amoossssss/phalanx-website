import bs58 from 'bs58';

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

type AccountInfoSubscriptionArgs = {
  account: string;
  onInfo: (info: PacificaAccountInfo) => void;
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
        const key =
          data && typeof data.s === 'string' && typeof data.i === 'string'
            ? this.subKey('candle', data.s, data.i)
            : null;
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
        const symbol = first && typeof first.s === 'string' ? first.s : null;
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

      // Orderbook stream messages use channel="book"
      if (channel === 'book') {
        const data = env.data as OrderbookStreamData | undefined;
        const key =
          data &&
          typeof data.s === 'string' &&
          typeof data.t === 'number' &&
          data.l &&
          Array.isArray(data.l)
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

    const candidates = [row.mid, row.mark, row.oracle];
    for (const c of candidates) {
      if (typeof c !== 'string') continue;
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
    return null;
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
   * Subscribe to the latest traded price via websocket trades stream.
   * Docs: `source=prices` which streams all symbols; we filter by symbol.
   * See `https://pacifica.gitbook.io/docs/api-documentation/api/websocket/subscriptions/prices`.
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
        const candidates = [row.mid, row.mark, row.oracle];
        for (const c of candidates) {
          if (typeof c !== 'string') continue;
          const n = Number(c);
          if (Number.isFinite(n)) {
            args.onPrice(n);
            return;
          }
        }
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
}

export default PacificaHelper;
