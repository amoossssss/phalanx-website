import { CompactPicker } from 'react-color';

import './ColorInput.scss';

type ColorInputType = {
  title: string;
  placeholder?: string;
  value: string;
  setValue: (value: string) => void;
};

const ColorInput = ({
  title,
  placeholder,
  value,
  setValue,
}: ColorInputType) => {
  return (
    <div className="color-input">
      <div className="input-title-block">
        <div className="input-title">{title}</div>
      </div>
      <div className="input-block">
        <CompactPicker
          className="color-picker"
          color={value}
          onChangeComplete={(color) => setValue(color.hex)}
        />
      </div>
    </div>
  );
};

export default ColorInput;
