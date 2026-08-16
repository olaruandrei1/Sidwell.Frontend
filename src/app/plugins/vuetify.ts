import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { darkTerminalTheme } from '../styles/vuetify-theme';

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'darkTerminalTheme',
    themes: {
      darkTerminalTheme
    }
  },
  defaults: {
    VDialog: {
      transition: 'dialog-transition'
    },
    VBottomSheet: {
      transition: 'bottom-sheet-transition'
    },
    VBtn: {
      style: [{ textTransform: 'none' }]
    }
  }
});
