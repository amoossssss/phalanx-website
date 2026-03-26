import React, { MouseEventHandler, RefCallback, RefObject } from 'react';

import './ButtonDiv.scss';

type ButtonDivType = Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> & {
  children?: React.ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  innerRef?: RefObject<HTMLDivElement> | RefCallback<HTMLDivElement>;
  id?: string;
  disabled?: boolean;
};

const ButtonDiv = ({
  children,
  className,
  onClick,
  innerRef,
  id,
  disabled = false,
  ...rest
}: ButtonDivType) => {
  const disabledClassname = disabled ? 'disabled' : '';

  return (
    <div
      className={`button-div ${className ?? ''} ${disabledClassname}`}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (disabled || !onClick) return;
        onClick(event);
      }}
      {...rest}
      ref={innerRef}
      id={id}
    >
      {children}
    </div>
  );
};

export default ButtonDiv;
