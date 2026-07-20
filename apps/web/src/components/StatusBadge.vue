<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ statut: string }>();
const labels: Record<string, string> = {
  CREEE: 'Créée', CONFIRMEE: 'Confirmée', ASSIGNEE: 'Assignée', EN_COURS: 'En cours',
  LIVREE: 'Livrée', REFUSEE: 'Refusée', ANNULEE: 'Annulée', RETOUR: 'Retour',
  ACTIVE: 'Actif', ACTIF: 'Actif', INACTIF: 'Inactif', SUSPENDU: 'Suspendu',
  SUSPENDUE: 'Suspendue', EXPIREE: 'Expirée', EPUISEE: 'Épuisée',
};
const color = computed(() => `var(--st-${props.statut}, var(--cg-muted))`);
const label = computed(() => labels[props.statut] ?? props.statut);
</script>
<template>
  <span class="pill" :style="{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }">{{ label }}</span>
</template>
