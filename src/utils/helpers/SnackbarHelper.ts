import { EnqueueSnackbar } from 'notistack';

import snackbarConfig from '@/utils/configs/snackbarConfig';

class SnackbarHelper {
  constructor(enqueueSnackbar: EnqueueSnackbar) {
    this.addMessage = enqueueSnackbar;
  }

  private readonly addMessage: EnqueueSnackbar;

  success(msg: string) {
    this.addMessage(msg, snackbarConfig);
  }

  error(msg: string) {
    console.error(msg);
    this.addMessage(msg, {
      ...snackbarConfig,
      variant: 'error',
    });
  }
}

export default SnackbarHelper;
