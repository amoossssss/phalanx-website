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
