import { useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import ColorInput from '@/lib/ColorInput/ColorInput';
import TextInput from '@/lib/TextInput/TextInput';
import ImageInput from '@/lib/ImageInput/ImageInput';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import ApiService from '@/utils/api/ApiService';
import Media from '@/utils/constants/Media';
import useNotification from '@/utils/hooks/useNotification';

import './CreateSquadDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type CreateSquadDialogType = {
  close: () => void;
};

const CreateSquadDialog = ({ close }: CreateSquadDialogType) => {
  const { snackbar } = useNotification();

  const [squadName, setSquadName] = useState('');
  const [squadColor, setSquadColor] = useState('#8ff5ff');
  const [squadAvatar, setSquadAvatar] = useState<File | null>(null);

  const disableCreate = useMemo(() => {
    return squadName === '';
  }, [squadName]);

  const handleCreateSquad = () => {
    const formData = new FormData();
    formData.append('squad_name', squadName);
    formData.append('squad_color', squadColor);

    if (squadAvatar) {
      formData.append('avatar_file', squadAvatar);
    }

    ApiService.squad
      .createSquad(formData)
      .then(() => {
        snackbar.success('Squad created!');
        close();
      })
      .catch((err) => {
        snackbar.error('Something went wrong, please try again.');
      });
  };

  return (
    <dialog
      className="create-squad-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Create_Squad>'}</div>

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
          title={'Squad_Avatar'}
          value={squadAvatar}
          setValue={setSquadAvatar}
          placeholder={'Upload_Image'}
          accept={'image/*'}
        />

        <ButtonDiv
          className="create-button"
          onClick={handleCreateSquad}
          disabled={disableCreate}
        >
          {'<Create>'}
        </ButtonDiv>

        <ButtonDiv className="close-button" onClick={close}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default CreateSquadDialog;
