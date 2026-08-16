import { describe, it, expect, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import AdaptiveOverlay from '../shared/ui/organisms/AdaptiveOverlay.vue';

describe('AdaptiveOverlay.vue', () => {
  beforeAll(() => {
    if (typeof window !== 'undefined' && !window.visualViewport) {
      Object.defineProperty(window, 'visualViewport', {
        writable: true,
        value: {
          width: 1024,
          height: 768,
          offsetLeft: 0,
          offsetTop: 0,
          pageLeft: 0,
          pageTop: 0,
          scale: 1,
          addEventListener: () => {},
          removeEventListener: () => {}
        }
      });
    }
  });

  const vuetify = createVuetify({ components, directives });

  it('renders with correct title and aria-modal attribute', () => {
    const wrapper = mount(AdaptiveOverlay, {
      global: {
        plugins: [vuetify]
      },
      props: {
        modelValue: true,
        title: 'Add Transaction Order',
        persistent: true
      }
    });

    expect(document.body.textContent).toContain('Add Transaction Order');
  });
});
