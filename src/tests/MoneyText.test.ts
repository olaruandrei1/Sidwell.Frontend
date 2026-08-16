import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MoneyText from '../shared/ui/atoms/MoneyText.vue';

describe('MoneyText.vue', () => {
  it('renders tabular monospaced numbers with currency formatting', () => {
    const wrapper = mount(MoneyText, {
      props: {
        value: '14500.50',
        mode: 'currency',
        currency: 'RON'
      }
    });

    expect(wrapper.classes()).toContain('font-mono');
    expect(wrapper.classes()).toContain('tabular-nums');
    expect(wrapper.text()).toContain('14,500.50');
    expect(wrapper.text()).toContain('RON');
  });

  it('renders positive values with up color class and plus sign', () => {
    const wrapper = mount(MoneyText, {
      props: {
        value: '200.00',
        mode: 'currency',
        currency: 'USD',
        showSign: true,
        color: true
      }
    });

    expect(wrapper.classes()).toContain('text-terminal-up');
    expect(wrapper.text()).toContain('200.00');
    expect(wrapper.text()).toContain('+');
  });

  it('renders negative values with down color class', () => {
    const wrapper = mount(MoneyText, {
      props: {
        value: '-45.20',
        mode: 'currency',
        currency: 'EUR',
        color: true
      }
    });

    expect(wrapper.classes()).toContain('text-terminal-down');
    expect(wrapper.text()).toContain('45.20');
    expect(wrapper.text()).toContain('-');
  });

  it('renders percentage format correctly', () => {
    const wrapper = mount(MoneyText, {
      props: {
        value: '8.40',
        mode: 'percent',
        showSign: true
      }
    });

    expect(wrapper.text()).toContain('+8.40%');
  });
});
