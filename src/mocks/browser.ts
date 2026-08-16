import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function setupMocks() {
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
  if (useMocks) {
    await worker.start({
      onUnhandledRequest: 'bypass'
    });
    console.info('[MSW] Mock Service Worker running in STANDALONE mode.');
  }
}
