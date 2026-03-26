import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Media from '@/utils/constants/Media';

import './TextInput.scss';
import { useMemo, useState } from 'react';
import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

type TextInputType = {
  title: string;
  placeholder?: string;
  type: 'text' | 'password';
  value: string;
  setValue: (value: string) => void;
  isError?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  filterInput?: (value: string) => string;
};

const ErrorIcon = withColoredSvg(Media.icons.errorIcon);
const ShowIcon = withColoredSvg(Media.icons.showIcon);
const HideIcon = withColoredSvg(Media.icons.hideIcon);

const TextInput = ({
  title,
  placeholder,
  type,
  value,
  setValue,
  isError,
  errorMessage,
  disabled,
  filterInput,
}: TextInputType) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = useMemo(() => {
    if (type !== 'password') {
      return type;
    }
    return showPassword ? 'text' : 'password';
  }, [type, showPassword]);

  return (
    <div className="text-input">
      <div className="input-title-block">
        <div className="input-title">{title}</div>
        {isError && (
          <div className="error-block">
            <ErrorIcon color={'#F23333'} size={16} />
            <div>{errorMessage}</div>
          </div>
        )}
      </div>
      <div className="input-block">
        <input
          className={`input-element ${isError ? 'error' : ''}`}
          type={inputType}
          value={value}
          onChange={(event) => {
            const raw = event.target.value;
            setValue(filterInput ? filterInput(raw) : raw);
          }}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={disabled}
        />
        {type === 'password' && (
          <ButtonDiv
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <HideIcon color={'rgba(255,255,255,0.5)'} size={24} />
            ) : (
              <ShowIcon color={'rgba(255,255,255,0.5)'} size={24} />
            )}
          </ButtonDiv>
        )}
      </div>
    </div>
  );
};

export default TextInput;
