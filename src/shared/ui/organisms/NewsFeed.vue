<script setup lang="ts">
import type { NewsItem } from '../../api/types';
import { formatDateTime } from '../../utils/format';
import TagBadge from '../atoms/TagBadge.vue';
import EmptyState from '../molecules/EmptyState.vue';

defineProps<{
  news: NewsItem[];
  loading?: boolean;
}>();

const getSentimentVariant = (val: string | null) => {
  if (!val) return 'default';
  const num = parseFloat(val);
  if (isNaN(num)) return 'default';
  if (num > 0.2) return 'up';
  if (num < -0.2) return 'down';
  return 'default';
};

const formatSentiment = (val: string | null) => {
  if (!val) return 'Neutral';
  const num = parseFloat(val);
  if (isNaN(num)) return 'Neutral';
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}`;
};
</script>

<template>
  <div class="space-y-3.5 select-none">
    <div v-if="loading" class="py-6 text-center text-xs text-gray-400 font-mono animate-pulse">
      Loading latest news &amp; sentiment...
    </div>
    <EmptyState
      v-else-if="news.length === 0"
      title="No news available"
      description="There are no recent articles for this ticker."
      compact
    />
    <div
      v-else
      v-for="(item, idx) in news"
      :key="`${item.url}-${idx}`"
      class="border border-white/15 rounded-3xl sw-glass-card p-5 hover:border-terminal-accent/60 transition-all duration-200 card-hover shadow-md"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <a
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-lg font-black text-white hover:text-terminal-accent transition-colors leading-snug font-sans"
          >
            {{ item.title }}
          </a>
          <div class="mt-2.5 flex items-center space-x-2.5 text-sm text-gray-300 font-mono">
            <span class="font-bold text-white">{{ item.source }}</span>
            <span>•</span>
            <span>{{ formatDateTime(item.publishedAt) }}</span>
          </div>
        </div>
        <div class="flex-shrink-0">
          <TagBadge :variant="getSentimentVariant(item.sentiment)" size="sm">
            Sentiment: {{ formatSentiment(item.sentiment) }}
          </TagBadge>
        </div>
      </div>
    </div>
  </div>
</template>
