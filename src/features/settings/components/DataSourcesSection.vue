<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../../../shared/api/client';
import { useToast } from '../../../shared/composables/useToast';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';

const toast = useToast();

const discoveringUs = ref(false);
const discoveringEu = ref(false);
const discoveringBvb = ref(false);

const usResult = ref<number | null>(null);
const euResult = ref<number | null>(null);
const bvbResult = ref<number | null>(null);

const EU_EXCHANGES = ['XETR', 'XAMS', 'XPAR', 'XMIL', 'XMAD', 'XLIS', 'XSTO', 'XSWX', 'XLON'];

async function discoverUs() {
  discoveringUs.value = true;
  usResult.value = null;
  try {
    const data = await api.post<{ upserted: number }>('/tickers/discover/us');
    usResult.value = data.upserted;
    toast.success('US Tickers', `${data.upserted.toLocaleString()} tickers sincronizați din SEC EDGAR.`);
  } catch (e: unknown) {
    toast.error('Discovery Failed', e instanceof Error ? e.message : 'Error discovering US tickers');
  } finally {
    discoveringUs.value = false;
  }
}

async function discoverEu() {
  discoveringEu.value = true;
  euResult.value = null;
  try {
    const data = await api.post<{ upserted: number }>('/tickers/discover/eu', { exchanges: EU_EXCHANGES });
    euResult.value = data.upserted;
    toast.success('EU Tickers', `${data.upserted.toLocaleString()} tickers sincronizați din Twelve Data.`);
  } catch (e: unknown) {
    toast.error('Discovery Failed', e instanceof Error ? e.message : 'Error discovering EU tickers');
  } finally {
    discoveringEu.value = false;
  }
}

async function discoverBvb() {
  discoveringBvb.value = true;
  bvbResult.value = null;
  try {
    const data = await api.post<{ upserted: number }>('/tickers/discover/bvb');
    bvbResult.value = data.upserted;
    toast.success('BVB Tickers', `${data.upserted.toLocaleString()} tickers sincronizați din Bursa de Valori București (BVB).`);
  } catch (e: unknown) {
    toast.error('Discovery Failed', e instanceof Error ? e.message : 'Error discovering BVB tickers');
  } finally {
    discoveringBvb.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-sm font-bold font-mono text-gray-200 uppercase tracking-wider">
        Registru Ticker — Data Sources
      </h2>
      <p class="text-xs text-gray-400 font-sans mt-0.5">
        Populează universul de tickers din surse externe. On-demand — apasă butonul pentru fiecare piață.
      </p>
    </div>

    <div class="sw-glass-card border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- US (SEC) -->
        <div class="border border-white/10 rounded-xl p-4 space-y-3 bg-terminal-bg/40">
          <div class="flex items-center gap-2.5">
            <svg class="w-7 h-5 rounded-sm shadow-sm shrink-0 overflow-hidden border border-white/10" viewBox="0 0 640 480">
              <g fill-rule="evenodd">
                <path fill="#bd3d44" d="M0 0h640v480H0z"/>
                <path stroke="#fff" stroke-width="37" d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"/>
                <path fill="#192f5d" d="M0 0h258.5v258.5H0z"/>
                <path fill="#fff" d="M22 22h10v10H22zM62 22h10v10H62zM102 22h10v10h-10zM142 22h10v10h-10zM182 22h10v10h-10zM222 22h10v10h-10zM42 42h10v10H42zM82 42h10v10H82zM122 42h10v10h-10zM162 42h10v10h-10zM202 42h10v10h-10z"/>
              </g>
            </svg>
            <div>
              <h3 class="text-xs font-mono font-bold text-gray-200 uppercase">US Tickers</h3>
              <p class="text-[10px] font-mono text-gray-500">SEC EDGAR · ~10k equities</p>
            </div>
          </div>
          <AppButton
            variant="outline"
            size="sm"
            class="w-full"
            @click="discoverUs"
            :loading="discoveringUs"
          >
            Discover US
          </AppButton>
          <div v-if="usResult !== null" class="text-[11px] font-mono text-emerald-400 font-bold text-center">
            {{ usResult.toLocaleString() }} tickers synced
          </div>
        </div>

        <!-- EU (Twelve Data) -->
        <div class="border border-white/10 rounded-xl p-4 space-y-3 bg-terminal-bg/40">
          <div class="flex items-center gap-2.5">
            <svg class="w-7 h-5 rounded-sm shadow-sm shrink-0 overflow-hidden border border-white/10" viewBox="0 0 640 480">
              <path fill="#003399" d="M0 0h640v480H0z"/>
              <g fill="#ffcc00">
                <circle cx="320" cy="90" r="14"/>
                <circle cx="395" cy="110" r="14"/>
                <circle cx="450" cy="165" r="14"/>
                <circle cx="470" cy="240" r="14"/>
                <circle cx="450" cy="315" r="14"/>
                <circle cx="395" cy="370" r="14"/>
                <circle cx="320" cy="390" r="14"/>
                <circle cx="245" cy="370" r="14"/>
                <circle cx="190" cy="315" r="14"/>
                <circle cx="170" cy="240" r="14"/>
                <circle cx="190" cy="165" r="14"/>
                <circle cx="245" cy="110" r="14"/>
              </g>
            </svg>
            <div>
              <h3 class="text-xs font-mono font-bold text-gray-200 uppercase">EU Tickers</h3>
              <p class="text-[10px] font-mono text-gray-500">Twelve Data · XETRA, Euronext, LSE+</p>
            </div>
          </div>
          <AppButton
            variant="outline"
            size="sm"
            class="w-full"
            @click="discoverEu"
            :loading="discoveringEu"
          >
            Discover EU
          </AppButton>
          <div v-if="euResult !== null" class="text-[11px] font-mono text-emerald-400 font-bold text-center">
            {{ euResult.toLocaleString() }} tickers synced
          </div>
        </div>

        <!-- BVB (Twelve Data / Curated) -->
        <div class="border border-white/10 rounded-xl p-4 space-y-3 bg-terminal-bg/40">
          <div class="flex items-center gap-2.5">
            <svg class="w-7 h-5 rounded-sm shadow-sm shrink-0 overflow-hidden border border-white/10" viewBox="0 0 640 480">
              <path fill="#002b7f" d="M0 0h213.3v480H0z"/>
              <path fill="#fcd116" d="M213.3 0h213.4v480H213.3z"/>
              <path fill="#ce1126" d="M426.7 0H640v480H426.7z"/>
            </svg>
            <div>
              <h3 class="text-xs font-mono font-bold text-gray-200 uppercase">BVB Tickers</h3>
              <p class="text-[10px] font-mono text-gray-500">Twelve Data · Bursa de Valori București</p>
            </div>
          </div>
          <AppButton
            variant="outline"
            size="sm"
            class="w-full"
            @click="discoverBvb"
            :loading="discoveringBvb"
          >
            Discover BVB
          </AppButton>
          <div v-if="bvbResult !== null" class="text-[11px] font-mono text-emerald-400 font-bold text-center">
            {{ bvbResult.toLocaleString() }} tickers synced
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
