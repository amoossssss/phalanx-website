import { useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import ColorInput from '@/lib/ColorInput/ColorInput';
import TextInput from '@/lib/TextInput/TextInput';
import ImageInput from '@/lib/ImageInput/ImageInput';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import ApiService from '@/utils/api/ApiService';
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

  const disableSave = useMemo(() => {
    const nameTrimmed = squadName.trim();
    if (nameTrimmed.length === 0) return true;

    const nameChanged = nameTrimmed !== squad.name;
    const colorChanged = squadColor !== squad.color;
    const avatarChanged = squadAvatar !== null;
    return !(nameChanged || colorChanged || avatarChanged);
  }, [squadName, squadColor, squadAvatar, squad.name, squad.color]);

  const handleSave = () => {
    const formData = new FormData();
    formData.append('name', squadName.trim());
    formData.append('color', squadColor);
    if (squadAvatar) {
      formData.append('avatar_file', squadAvatar);
    }

    ApiService.squad
      .editSquad(squad.squadId, formData)
      .then(() => {
        snackbar.success('Squad updated!');
        onSaved?.();
        close();
      })
      .catch(() => {
        snackbar.error('Something went wrong, please try again.');
      });
  };

  return (
    <dialog
      className="edit-squad-dialog"
      open
      onClick={(e) => {
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
          className="save-button"
          onClick={handleSave}
          disabled={disableSave}
        >
          {'<Save>'}
        </ButtonDiv>

        <ButtonDiv className="close-button" onClick={close}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default EditSquadDialog;
