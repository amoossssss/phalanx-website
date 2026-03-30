import { useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import TextInput from '@/lib/TextInput/TextInput';

import ApiService from '@/utils/api/ApiService';
import Media from '@/utils/constants/Media';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';
import useNotification from '@/utils/hooks/useNotification';
import { useUser } from '@/utils/contexts/UserContext';

import './UpdateAliasDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type UpdateAliasDialogType = {
  close: () => void;
};

const UpdateAliasDialog = ({ close }: UpdateAliasDialogType) => {
  const { alias, setAlias } = useUser();
  const { snackbar } = useNotification();

  const [aliasValue, setAliasValue] = useState(alias ?? '');

  const handleCreateSquad = () => {
    if (!alias) return;
    ApiService.wallet
      .updateAlias({ alias: aliasValue })
      .then(() => {
        setAlias(aliasValue);
        snackbar.success('Alias updated!');
        close();
      })
      .catch((err) => {
        snackbar.error('Something went wrong, please try again.');
      });
  };

  return (
    <dialog className="update-alias-dialog" open>
      <div className="dialog-content">
        <div className="dialog-title">{'<Update_Alias>'}</div>

        <TextInput
          title={'Wallet_Alias'}
          type={'text'}
          value={aliasValue}
          setValue={setAliasValue}
          placeholder={'Your_Wallet_Alias'}
        />

        <ButtonDiv
          className="update-button"
          onClick={handleCreateSquad}
          disabled={!alias}
        >
          {'<Update>'}
        </ButtonDiv>

        <ButtonDiv className="close-button" onClick={close}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default UpdateAliasDialog;
