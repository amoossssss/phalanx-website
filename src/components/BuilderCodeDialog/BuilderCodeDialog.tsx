import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import Media from '@/utils/constants/Media';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import './BuilderCodeDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type BuilderCodeDialogProps = {
  builderCode: string;
  maxFeeRate: string;
  onAuthorize: () => void;
  isAuthorizing?: boolean;
  onClose: () => void;
};

const BuilderCodeDialog = ({
  builderCode,
  maxFeeRate,
  onAuthorize,
  isAuthorizing,
  onClose,
}: BuilderCodeDialogProps) => {
  return (
    <dialog className="builder-code-dialog" open>
      <div className="dialog-content">
        <div className="dialog-title">{'<Builder_Code_Auth>'}</div>

        <div className="dialog-text">
          {'To trade through this app,\nplease authorize our builder code:'}
        </div>

        <div className="code-block">
          <div className="code-row">
            <div className="label">{'builder_code'}</div>
            <div className="value">{builderCode}</div>
          </div>
          <div className="code-row">
            <div className="label">{'max_fee_rate'}</div>
            <div className="value">{maxFeeRate}</div>
          </div>
        </div>

        <div className="dialog-hint">
          {
            'Click <Authorize> to approve the builder code.\n(Approval is a one-time action per wallet.)'
          }
        </div>

        <div className="action-row">
          <ButtonDiv
            className="recheck-button"
            onClick={onAuthorize}
            disabled={isAuthorizing}
          >
            {isAuthorizing ? '<Authorizing…>' : '<Authorize>'}
          </ButtonDiv>
        </div>

        <ButtonDiv className="close-button" onClick={onClose}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default BuilderCodeDialog;
