<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import MoneyText from '../../../shared/ui/atoms/MoneyText.vue';
import { useFinancesStore } from '../../../stores/finances';
import { useExpenseByIdQuery } from '../../../queries/useFinancesQuery';

const { t } = useI18n();
const financesStore = useFinancesStore();

const expenseIdRef = computed(() => financesStore.selectedExpenseId);
const { data: expense, isLoading, isError } = useExpenseByIdQuery(expenseIdRef);

function handleClose() {
  financesStore.closeExpenseDetailModal();
}
</script>

<template>
  <AdaptiveOverlay
    :model-value="Boolean(financesStore.selectedExpenseId)"
    title="Expense Details"
    @update:model-value="(val) => !val && handleClose()"
    @close="handleClose"
  >
    <div class="space-y-6 select-none">
      <div v-if="isLoading" class="p-8 text-center space-y-3">
        <div class="inline-block w-8 h-8 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs font-mono text-gray-400">Loading expense details...</p>
      </div>

      <div v-else-if="isError || !expense" class="p-6 text-center text-terminal-down font-mono text-xs">
        Failed to load expense details.
      </div>

      <div v-else class="space-y-6">
        <div class="p-4 rounded-xl bg-terminal-surface border border-terminal-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-terminal-surface-light text-gray-300 border border-terminal-border">
                {{ expense.category }}
              </span>
              <span
                v-if="expense.isRecurring"
                class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
              >
                Recurring
              </span>
            </div>
            <h4 class="text-lg font-bold text-gray-100">{{ expense.name }}</h4>
            <div class="text-xs font-mono text-gray-400 flex items-center gap-3">
              <span>Date: {{ expense.month || expense.createdAt.slice(0, 10) }}</span>
              <span v-if="expense.dueDate">Due: {{ expense.dueDate }}</span>
              <span v-if="expense.interestRatePct">Interest: {{ expense.interestRatePct }}%</span>
            </div>
          </div>

          <div class="text-left sm:text-right">
            <div class="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Total Amount</div>
            <div class="text-xl font-mono font-bold text-terminal-down">
              -<MoneyText :value="expense.amount" /> {{ expense.currency }}
            </div>
          </div>
        </div>

        <div v-if="expense.lineItems && expense.lineItems.length > 0" class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <h5 class="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
              Receipt Line Items
            </h5>
            <span class="text-xs font-mono text-gray-500">
              {{ expense.lineItems.length }} items
            </span>
          </div>

          <div class="overflow-x-auto border border-terminal-border rounded-xl bg-terminal-surface/40">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-terminal-border bg-terminal-surface-light/40 text-gray-400 font-mono">
                  <th class="py-2.5 px-3">Item Name</th>
                  <th class="py-2.5 px-3 text-right">Qty</th>
                  <th class="py-2.5 px-3 text-right">Unit Price</th>
                  <th class="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-terminal-border/50 font-mono">
                <tr
                  v-for="(item, idx) in expense.lineItems"
                  :key="idx"
                  class="hover:bg-terminal-surface-light/20 transition-colors"
                >
                  <td class="py-2.5 px-3 font-sans text-gray-200">{{ item.name }}</td>
                  <td class="py-2.5 px-3 text-right text-gray-400">{{ item.qty }}</td>
                  <td class="py-2.5 px-3 text-right text-gray-400">{{ item.unitPrice }}</td>
                  <td class="py-2.5 px-3 text-right font-bold text-gray-200">{{ item.amount }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-terminal-border bg-terminal-surface-light/20 font-mono">
                  <td colspan="3" class="py-2.5 px-3 text-right font-bold text-gray-300 uppercase">
                    Total
                  </td>
                  <td class="py-2.5 px-3 text-right font-bold text-terminal-down">
                    {{ expense.amount }} {{ expense.currency }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div v-else class="p-4 rounded-xl bg-terminal-surface/30 border border-terminal-border/50 text-center">
          <p class="text-xs font-mono text-gray-400">
            Manual expense summary — no receipt product lines attached.
          </p>
        </div>

        <div class="flex justify-end pt-2">
          <AppButton variant="secondary" size="sm" @click="handleClose">
            Close
          </AppButton>
        </div>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
