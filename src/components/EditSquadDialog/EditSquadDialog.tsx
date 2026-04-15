import { useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import ColorInput from '@/lib/ColorInput/ColorInput';
import TextInput from '@/lib/TextInput/TextInput';
import ImageInput from '@/lib/ImageInput/ImageInput';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import ApiService from '@/utils/api/ApiService';
import Constants from '@/utils/constants/Constants';
import Media from '@/utils/constants/Media';
import useNotification from '@/utils/hooks/useNotification';
import { SquadType } from '@/utils/constants/Types';

import './EditSquadDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type EditSquadDialogProps = {
  squad: SquadType;
  close: () => void;
  onSaved?: () => void;
};

const EditSquadDialog = ({ squad, close, onSaved }: EditSquadDialogProps) => {
  const { snackbar } = useNotification();

  const [squadName, setSquadName] = useState(squad.name);
  const [squadColor, setSquadColor] = useState(squad.color);
  const [squadAvatar, setSquadAvatar] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disableSave = useMemo(() => {
    const nameTrimmed = squadName.trim();
    if (nameTrimmed.length === 0 || isSubmitting) return true;

    const nameChanged = nameTrimmed !== squad.name;
    const colorChanged = squadColor !== squad.color;
    const avatarChanged = squadAvatar !== null;
    return !(nameChanged || colorChanged || avatarChanged);
  }, [
    squadName,
    squadColor,
    squadAvatar,
    squad.name,
    squad.color,
    isSubmitting,
  ]);

  const handleSave = () => {
    if (isSubmitting) return;

    const formData = new FormData();
    formData.append('name', squadName.trim());
    formData.append('color', squadColor);
    if (squadAvatar) {
      formData.append('avatar_file', squadAvatar);
    }

    setIsSubmitting(true);
    ApiService.squad
      .editSquad(squad.squadId, formData)
      .then(() => {
        snackbar.success('Squad updated!');
        onSaved?.();
        close();
      })
      .catch(() => {
        snackbar.error('Something went wrong, please try again.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <dialog
      className={`edit-squad-dialog${
        isSubmitting ? ' edit-squad-dialog--submitting' : ''
      }`}
      open
      aria-busy={isSubmitting}
      onClick={(e) => {
        if (isSubmitting) return;
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Edit_Squad>'}</div>

        <TextInput
          title={'Squad_Name*'}
          type={'text'}
          value={squadName}
          setValue={setSquadName}
          placeholder={'Your_Squad_Name'}
          maxLength={Constants.MAX_SQUAD_NAME_LENGTH}
          filterInput={(v) => v.slice(0, Constants.MAX_SQUAD_NAME_LENGTH)}
          disabled={isSubmitting}
        />

        <ColorInput
          title={'Squad_Color*'}
          value={squadColor}
          setValue={setSquadColor}
        />

        <ImageInput
          title={'New_Squad_Avatar'}
          value={squadAvatar}
          setValue={setSquadAvatar}
          placeholder={'Upload_Image'}
          accept={'image/*'}
        />

        <ButtonDiv
          className={`save-button ${isSubmitting ? ' loading' : ''}`}
          onClick={handleSave}
          disabled={disableSave}
        >
          {isSubmitting ? '> Saving_Squad...' : '<Save>'}
        </ButtonDiv>

        <ButtonDiv
          className="close-button"
          onClick={close}
          disabled={isSubmitting}
        >
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default EditSquadDialog;
