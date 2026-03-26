import { useMemo } from 'react';
import { useSnackbar } from 'notistack';

import SnackbarHelper from '@/utils/helpers/SnackbarHelper';

export default function useNotification() {
  const { enqueueSnackbar } = useSnackbar();

  const Snackbar = useMemo(() => {
    return new SnackbarHelper(enqueueSnackbar);
  }, [enqueueSnackbar]);

  return { snackbar: Snackbar };
}
