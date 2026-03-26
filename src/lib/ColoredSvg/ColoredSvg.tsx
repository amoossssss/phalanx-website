import React from 'react';

type WithColoredSvgProps = {
  color: string;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
};

const withColoredSvg = (src: string) => {
  const ColoredSvg = ({
    color,
    size,
    width = 24,
    height = 24,
    className,
  }: WithColoredSvgProps) => {
    const w = size !== undefined ? size : width;
    const h = size !== undefined ? size : height;
    return (
      <span
        className={className}
        style={{
          display: 'inline-block',
          width: w,
          height: h,
          backgroundColor: color,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    );
  };

  ColoredSvg.displayName = 'ColoredSvg';

  return ColoredSvg;
};

export type { WithColoredSvgProps };
export default withColoredSvg;
