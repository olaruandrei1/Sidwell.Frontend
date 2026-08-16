import { computed } from 'vue';
import type { Decimal } from '../api/types';
import {
  parseDecimal,
  toDecimalString,
  addDecimals,
  subDecimals,
  mulDecimals,
  divDecimals,
  isPositiveDecimal,
  isNegativeDecimal
} from '../utils/decimal';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

export function useMoney() {
  return {
    parse: parseDecimal,
    toString: toDecimalString,
    add: addDecimals,
    sub: subDecimals,
    mul: mulDecimals,
    div: divDecimals,
    isPositive: isPositiveDecimal,
    isNegative: isNegativeDecimal,
    formatCurrency: formatMoney,
    formatNum: formatNumber,
    formatPct: formatPercent,
    getColorClass: (val: Decimal | null | undefined) => {
      if (isPositiveDecimal(val)) return 'text-terminal-up';
      if (isNegativeDecimal(val)) return 'text-terminal-down';
      return 'text-gray-400';
    }
  };
}
