import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ptPT from './pt-PT'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-PT': {
        translation: ptPT,
      },
    },
    supportedLngs: ['pt-PT', 'en'],
    fallbackLng: 'en',
    lng: 'pt-PT',
    load: 'currentOnly',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'reflab-language',
    },
    returnNull: false,
  })

export default i18n
