class StringHelper {
  static truncateAddress = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  static truncateName = (name: string) => {
    // Check if the name looks like a Solana address: 32+ base58 chars (no 0, O, I, l), usually 32-44
    // See: https://docs.solana.com/cli/transfer-tokens#solana-addresses
    const SOL_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (SOL_ADDRESS_REGEX.test(name)) {
      return StringHelper.truncateAddress(name);
    }
    return name;
  };

  static formatStat = (value: number | null, suffix = '') => {
    if (value === null || Number.isNaN(value)) {
      return '—';
    }
    return `${value}${suffix}`;
  };

  /**
   * Compact display: two decimals, then `K` / `M` for thousands and millions.
   * Negative values use the same tiers on the absolute value.
   */
  static formatCompactNumber = (value: number): string => {
    if (!Number.isFinite(value)) {
      return '—';
    }
    const sign = value < 0 ? '-' : '';
    const n = Math.abs(value);
    if (n < 1000) {
      return `${sign}${n.toFixed(2)}`;
    }
    if (n < 1_000_000) {
      return `${sign}${(n / 1000).toFixed(2)} K`;
    }
    return `${sign}${(n / 1_000_000).toFixed(2)} M`;
  };

  static parseNumber = (value: string): number | null => {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  static sanitizeDecimalInput = (value: string): string => {
    // Keep only digits and at most one dot.
    const filtered = value.replace(/[^0-9.]/g, '');
    const firstDot = filtered.indexOf('.');
    if (firstDot === -1) return filtered;
    return (
      filtered.slice(0, firstDot + 1) +
      filtered.slice(firstDot + 1).replace(/\./g, '')
    );
  };
}

export default StringHelper;
