import { OptionsWithExtraProps, VariantType } from 'notistack';

const snackbarConfig: OptionsWithExtraProps<VariantType> = {
  anchorOrigin: { horizontal: 'center', vertical: 'bottom' },
  autoHideDuration: 4000,
  preventDuplicate: true,
  variant: 'success',
};

export default snackbarConfig;
