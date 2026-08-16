import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FinanceCategoryType, ExpenseItemDto } from '../shared/api/types';

function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const useFinancesStore = defineStore('finances', () => {
  const selectedMonth = ref(getCurrentYearMonth());
  const filterType = ref<'ALL' | FinanceCategoryType>('ALL');

  const isAddExpenseModalOpen = ref(false);
  const editingExpense = ref<ExpenseItemDto | null>(null);
  const isGeminiModalOpen = ref(false);
  const isAddWealthModalOpen = ref(false);
  const pendingScanFile = ref<File | null>(null);

  const selectedExpenseId = ref<string | null>(null);

  function setSelectedMonth(month: string) {
    selectedMonth.value = month;
  }

  function setFilterType(type: 'ALL' | FinanceCategoryType) {
    filterType.value = type;
  }

  function openAddExpenseModal() {
    editingExpense.value = null;
    isAddExpenseModalOpen.value = true;
  }

  function openEditExpenseModal(expense: ExpenseItemDto) {
    editingExpense.value = expense;
    isAddExpenseModalOpen.value = true;
  }

  function closeAddExpenseModal() {
    editingExpense.value = null;
    isAddExpenseModalOpen.value = false;
  }

  function openGeminiModal(file?: File) {
    if (file) {
      pendingScanFile.value = file;
    }
    isGeminiModalOpen.value = true;
  }

  function closeGeminiModal() {
    pendingScanFile.value = null;
    isGeminiModalOpen.value = false;
  }

  function openAddWealthModal() {
    isAddWealthModalOpen.value = true;
  }

  function closeAddWealthModal() {
    isAddWealthModalOpen.value = false;
  }

  function openExpenseDetailModal(id: string) {
    selectedExpenseId.value = id;
  }

  function closeExpenseDetailModal() {
    selectedExpenseId.value = null;
  }

  return {
    selectedMonth,
    filterType,
    isAddExpenseModalOpen,
    editingExpense,
    isGeminiModalOpen,
    isAddWealthModalOpen,
    pendingScanFile,
    selectedExpenseId,
    setSelectedMonth,
    setFilterType,
    openAddExpenseModal,
    openEditExpenseModal,
    closeAddExpenseModal,
    openGeminiModal,
    closeGeminiModal,
    openAddWealthModal,
    closeAddWealthModal,
    openExpenseDetailModal,
    closeExpenseDetailModal
  };
});

