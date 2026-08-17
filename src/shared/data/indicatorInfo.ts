export interface IndicatorInfo {
  name: string;
  definition: string;
  formula: string;
  category: 'overlay' | 'oscillator' | 'volatility' | 'volume';
}

export const INDICATOR_INFO: Record<string, IndicatorInfo> = {
  sma: {
    name: 'Simple Moving Average',
    definition: 'The unweighted average closing price over the last N sessions. Smooths out day-to-day noise to reveal the underlying trend direction.',
    formula: 'SMA(n) = (P₁ + P₂ + … + Pₙ) / n',
    category: 'overlay'
  },
  ema: {
    name: 'Exponential Moving Average',
    definition: 'Like the SMA, but weights recent prices more heavily, so it reacts faster to new information and lags less behind sudden moves.',
    formula: 'EMA(t) = P(t)·k + EMA(t-1)·(1-k), where k = 2 / (n+1)',
    category: 'overlay'
  },
  bb: {
    name: 'Bollinger Bands',
    definition: 'A moving average with two bands plotted a fixed number of standard deviations above and below it. Bands widen in volatile markets and narrow when price is quiet.',
    formula: 'Upper = SMA(n) + k·σ · Lower = SMA(n) - k·σ (k = 2)',
    category: 'overlay'
  },
  rsi: {
    name: 'Relative Strength Index',
    definition: 'Momentum oscillator (0–100) comparing the size of recent gains to recent losses. Above 70 traditionally signals overbought, below 30 signals oversold.',
    formula: 'RSI = 100 - 100 / (1 + avgGain / avgLoss)',
    category: 'oscillator'
  },
  macd: {
    name: 'Moving Average Convergence Divergence',
    definition: "Tracks the relationship between two EMAs of different speeds. When the fast line crosses above the slow signal line, momentum is turning bullish; below, bearish.",
    formula: 'MACD = EMA(12) - EMA(26) · Signal = EMA(9) of MACD · Histogram = MACD - Signal',
    category: 'oscillator'
  },
  adx: {
    name: 'Average Directional Index',
    definition: "Measures trend strength (not direction) on a 0–100 scale. Above 25 usually means a real, tradeable trend is in place. +DI/-DI show which direction currently dominates.",
    formula: 'ADX = smoothed average of |(+DI) − (−DI)| / ((+DI) + (−DI)) × 100',
    category: 'oscillator'
  },
  atr: {
    name: 'Average True Range',
    definition: "A pure volatility gauge — the average size of a session's true trading range. Doesn't predict direction, but a rising ATR means bigger swings.",
    formula: 'TR = max(H-L, |H-PrevClose|, |L-PrevClose|) · ATR = rolling average of TR',
    category: 'volatility'
  },
  obv: {
    name: 'On-Balance Volume',
    definition: 'A running total of volume, added on up days and subtracted on down days. Rising OBV alongside rising price is read as confirmation of the trend.',
    formula: 'OBV(t) = OBV(t-1) ± Volume(t), sign follows whether price closed up or down',
    category: 'volume'
  }
};

export interface TrendCall {
  label: string;
  action: string;
  verdict: string;
  color: string;
}

export const TREND_READ: Record<string, TrendCall> = {
  above: {
    label: 'Price is trading above this line.',
    action: 'Consistent with a short-term uptrend.',
    verdict: "Hold them — or open a long CFD position if you're not in yet.",
    color: '#34D399'
  },
  below: {
    label: 'Price is trading below this line.',
    action: 'Consistent with a short-term downtrend.',
    verdict: "Sell and wait for a better entry near the average — or open a short CFD if that's your play.",
    color: '#F87171'
  },
  at: {
    label: 'Price is sitting right at this line.',
    action: 'No clear lean either way.',
    verdict: "Hold them boy — don't chase, don't dump.",
    color: '#94A3B8'
  },
  overbought: {
    label: 'RSI is in overbought territory (≥70).',
    action: 'Momentum may be stretched — some pullback risk.',
    verdict: 'Trim on strength or wait — a short CFD is a play if you have appetite for it.',
    color: '#F87171'
  },
  oversold: {
    label: 'RSI is in oversold territory (≤30).',
    action: 'Selling may be exhausted — watch for a bounce.',
    verdict: 'Consider a long entry or CFD — bounce probability elevated but not certain.',
    color: '#34D399'
  },
  neutral: {
    label: 'RSI is in the neutral zone.',
    action: 'No extreme reading either way.',
    verdict: 'Hold them boy — no strong signal to trade on.',
    color: '#94A3B8'
  },
  'above-upper-band': {
    label: 'Price has pushed above the upper band.',
    action: 'Stretched to the upside — often mean-reverts short term.',
    verdict: 'Consider trimming; a short CFD play is possible for mean-reversion traders.',
    color: '#FBBF24'
  },
  'below-lower-band': {
    label: 'Price has dropped below the lower band.',
    action: 'Stretched to the downside — often mean-reverts short term.',
    verdict: 'Consider a long entry or CFD for a bounce back into the bands.',
    color: '#FBBF24'
  },
  'within-bands': {
    label: 'Price is trading within the bands.',
    action: 'Normal volatility range, no extreme.',
    verdict: 'Hold them boy — no volatility signal to trade on.',
    color: '#94A3B8'
  },
  'bullish-crossover': {
    label: 'MACD line is above the signal line.',
    action: 'Momentum is turning positive.',
    verdict: 'Hold them — momentum favors long CFDs.',
    color: '#34D399'
  },
  'bearish-crossover': {
    label: 'MACD line is below the signal line.',
    action: 'Momentum is turning negative.',
    verdict: 'Sell or open a short CFD — momentum has flipped down.',
    color: '#F87171'
  },
  'strong-trend': {
    label: 'ADX ≥ 25 — a real trend is in place.',
    action: 'Trend-following favored over range-trading here.',
    verdict: "Ride the trend with the position/CFD direction — don't fade it.",
    color: '#34D399'
  },
  'weak-trend': {
    label: 'ADX < 25 — no strong trend.',
    action: 'Choppy/range-bound — directional signals are less reliable.',
    verdict: 'Hold them boy — mean-reversion strategies fit better than trend-following.',
    color: '#94A3B8'
  }
};
