class ColorHelper {
  static borderColor = (squadColor: string) => {
    return squadColor
      ? squadColor.startsWith('#')
        ? `${squadColor}99`
        : squadColor.includes('rgb(')
        ? squadColor.replace('rgb(', 'rgba(').replace(')', ',0.6)')
        : squadColor
      : undefined;
  };
}

export default ColorHelper;
