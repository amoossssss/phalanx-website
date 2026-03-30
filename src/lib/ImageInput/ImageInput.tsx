import { useEffect, useRef, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import './ImageInput.scss';

type ImageInputType = {
  title: string;
  value: File | null;
  setValue: (value: File | null) => void;
  placeholder?: string;
  accept?: string;
};

const ImageInput = ({
  title,
  value,
  setValue,
  placeholder = 'Upload_Image',
  accept = 'image/*',
}: ImageInputType) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(value);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  return (
    <div className="image-input">
      <div className="input-title-block">
        <div className="input-title">{title}</div>
      </div>

      <div className="input-block">
        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept={accept}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setValue(file);
          }}
        />

        {!objectUrl && (
          <ButtonDiv
            className={'input-element'}
            onClick={() => {
              inputRef.current?.click();
            }}
          >
            <div className="placeholder">{placeholder}</div>
          </ButtonDiv>
        )}

        {objectUrl && (
          <div className="preview-block">
            <img className="preview" src={objectUrl} alt="preview" />
            <div className="action-button-row">
              <ButtonDiv
                className="change-button"
                onClick={() => {
                  inputRef.current?.click();
                }}
              >
                {'<Change>'}
              </ButtonDiv>
              <ButtonDiv
                className="clear-button"
                onClick={() => {
                  setValue(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
              >
                {'<Remove>'}
              </ButtonDiv>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageInput;
