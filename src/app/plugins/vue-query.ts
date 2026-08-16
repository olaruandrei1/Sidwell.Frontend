import { VueQueryPlugin, type VueQueryPluginOptions } from '@tanstack/vue-query';
import type { App } from 'vue';

export const vueQueryOptions: VueQueryPluginOptions = {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 60 * 1000 // 1 minute default stale time
      },
      mutations: {
        retry: 0
      }
    }
  }
};

export function setupVueQuery(app: App) {
  app.use(VueQueryPlugin, vueQueryOptions);
}

export { VueQueryPlugin as vueQueryPlugin };
