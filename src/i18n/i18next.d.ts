import 'i18next';

import type { Translation } from './locales/pt-PT';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: Translation;
    };
  }
}
