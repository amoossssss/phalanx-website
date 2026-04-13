import { useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import TextInput from '@/lib/TextInput/TextInput';

import ApiService from '@/utils/api/ApiService';
import Constants from '@/utils/constants/Constants';
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
  const { alias, setAlias, refreshUser } = useUser();
  const { snackbar } = useNotification();

  const [aliasValue, setAliasValue] = useState(alias ?? '');

  const handleUpdateAlias = () => {
    if (!aliasValue) return;
    ApiService.wallet
      .updateAlias({ alias: aliasValue })
      .then(async () => {
        setAlias(aliasValue);
        await refreshUser();
        snackbar.success('Alias updated!');
        close();
      })
      .catch((err) => {
        snackbar.error('Something went wrong, please try again.');
      });
  };

  return (
    <dialog
      className="update-alias-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Update_Alias>'}</div>

        <TextInput
          title={'Wallet_Alias'}
          type={'text'}
          value={aliasValue}
          setValue={setAliasValue}
          placeholder={'Your_Wallet_Alias'}
          maxLength={Constants.MAX_ALIAS_LENGTH}
        />

        <ButtonDiv
          className="update-button"
          onClick={handleUpdateAlias}
          disabled={!aliasValue}
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
