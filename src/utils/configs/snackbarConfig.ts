import { OptionsWithExtraProps, VariantType } from 'notistack';

const snackbarConfig: OptionsWithExtraProps<VariantType> = {
  anchorOrigin: { horizontal: 'center', vertical: 'bottom' },
  autoHideDuration: 4000,
  preventDuplicate: true,
  variant: 'success',
  style: {
    backgroundColor: '#8eff71',
    color: '#1a1b26',
  },
};

export default snackbarConfig;
