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
import { useUser } from '@/utils/contexts/UserContext';

import './CreateSquadDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type CreateSquadDialogType = {
  close: () => void;
};

const CreateSquadDialog = ({ close }: CreateSquadDialogType) => {
  const { snackbar } = useNotification();
  const { refreshUser } = useUser();

  const [squadName, setSquadName] = useState('');
  const [squadColor, setSquadColor] = useState('#8ff5ff');
  const [squadAvatar, setSquadAvatar] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disableCreate = useMemo(() => {
    return squadName === '' || isSubmitting;
  }, [squadName, isSubmitting]);

  const handleCreateSquad = () => {
    if (isSubmitting) return;

    const formData = new FormData();
    formData.append('squad_name', squadName);
    formData.append('squad_color', squadColor);

    if (squadAvatar) {
      formData.append('avatar_file', squadAvatar);
    }

    setIsSubmitting(true);
    ApiService.squad
      .createSquad(formData)
      .then(async () => {
        await refreshUser();
        snackbar.success('Squad created!');
        close();
      })
      .catch((err) => {
        snackbar.error('Something went wrong, please try again.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <dialog
      className={`create-squad-dialog${
        isSubmitting ? ' create-squad-dialog--submitting' : ''
      }`}
      open
      aria-busy={isSubmitting}
      onClick={(e) => {
        if (isSubmitting) return;
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
          title={'Squad_Avatar'}
          value={squadAvatar}
          setValue={setSquadAvatar}
          placeholder={'Upload_Image'}
          accept={'image/*'}
        />

        <ButtonDiv
          className={`create-button ${isSubmitting ? ' loading' : ''}`}
          onClick={handleCreateSquad}
          disabled={disableCreate}
        >
          {isSubmitting ? '> Creating_Squad...' : '<Create>'}
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

export default CreateSquadDialog;
