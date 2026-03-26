class StringHelper {
  static truncateAddress = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };
}

export default StringHelper;
