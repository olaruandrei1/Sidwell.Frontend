import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CompositeGauge from '../shared/ui/organisms/CompositeGauge.vue';
import type { CompositeScore } from '../shared/api/types';

describe('CompositeGauge.vue', () => {
  it('renders exact server-provided label and color without recomputing buckets client-side', () => {
    const mockComposite: CompositeScore = {
      philosophy: 'BALANCED',
      score: '84.00',
      label: 'Strong Buy',
      color: '#34d399',
      overridden: false
    };

    const wrapper = mount(CompositeGauge, {
      props: {
        composite: mockComposite
      }
    });

    expect(wrapper.text()).toContain('84.00');
    expect(wrapper.text()).toContain('Strong Buy');
    expect(wrapper.html()).toContain('#34d399');
  });

  it('displays Beneish Veto Override flag when overridden is true', () => {
    const mockComposite: CompositeScore = {
      philosophy: 'BALANCED',
      score: '-45.00',
      label: 'Avoid (Beneish Veto)',
      color: '#f87171',
      overridden: true
    };

    const wrapper = mount(CompositeGauge, {
      props: {
        composite: mockComposite
      }
    });

    expect(wrapper.text()).toContain('Avoid (Beneish Veto)');
    expect(wrapper.text()).toContain('BENEISH VETO OVERRIDE');
  });
});
