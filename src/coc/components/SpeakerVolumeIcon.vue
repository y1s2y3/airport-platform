<script setup>
defineProps({
  muted: { type: Boolean, default: true },
})
</script>

<template>
  <svg
    class="speaker-volume-icon"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M4 9v6h4l5 5V4L8 9H4z"
    />
    <template v-if="!muted">
      <path
        fill="currentColor"
        d="M14.67 12.73c.78-.78 1.33-1.86 1.33-3.06 0-1.2-.55-2.28-1.33-3.06l1.42-1.42c1.17 1.17 1.9 2.78 1.9 4.56 0 1.78-.73 3.39-1.9 4.56l-1.42-1.42z"
      />
      <path
        fill="currentColor"
        d="M16.67 9.27l1.42-1.42C19.74 9.19 21 11.45 21 14s-1.26 4.81-2.91 6.15l-1.42-1.42c1.17-1.17 1.9-2.78 1.9-4.56 0-1.78-.73-3.39-1.9-4.56z"
      />
    </template>
    <path
      v-else
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      d="M18.5 6.5L6.5 18.5"
    />
  </svg>
</template>

<style scoped>
.speaker-volume-icon {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
