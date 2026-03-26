import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-TW'],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
    resources: {
      en: {
        common: require('../../../public/locales/en/common.json'),
      },
      'zh-TW': {
        common: require('../../../public/locales/zh-TW/common.json'),
      },
    },
    defaultNS: 'common',
    ns: ['common'],
  });

export default i18n;
