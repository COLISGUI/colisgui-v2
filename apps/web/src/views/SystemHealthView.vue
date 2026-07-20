<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, apiError } from '../api/client';
const status = ref<any>(null); const loading = ref(true); const error = ref(''); const toggling = ref(false);
async function load() {
  loading.value = true; error.value = '';
  try { const { data } = await api.get('/system/status'); status.value = data; }
  catch (e) { error.value = apiError(e); } finally { loading.value = false; }
}
async function toggleMaintenance() {
  toggling.value = true;
  try { await api.put('/system/maintenance', { on: !status.value.maintenance }); await load(); }
  catch (e) { error.value = apiError(e); } finally { toggling.value = false; }
}
function dot(ok: boolean) { return ok ? 'var(--st-LIVREE)' : 'var(--st-REFUSEE)'; }
onMounted(load);
</script>

<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Administration</div><h1 class="page-title">Santé du système</h1></div>
      <button class="btn btn-ghost" @click="load">Rafraîchir</button></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Vérification…</div>
    <template v-else-if="status">
      <div class="grid stat-grid" style="margin-bottom:16px">
        <div class="card stat">
          <div class="stat-label">État général</div>
          <div class="row" style="gap:8px; margin-top:8px"><span class="pill" :style="{ color: dot(status.status==='healthy'), background:'transparent' }">{{ status.status }}</span></div>
        </div>
        <div class="card stat">
          <div class="stat-label">PostgreSQL</div>
          <div class="row" style="gap:8px; margin-top:8px"><span class="pill" :style="{ color: dot(status.db==='ok'), background:'transparent' }">{{ status.db }}</span></div>
        </div>
        <div class="card stat"><div class="stat-label">Disponibilité (uptime)</div><div class="stat-value">{{ Math.floor(status.uptimeSeconds/60) }}<span style="font-size:14px"> min</span></div></div>
        <div class="card stat"><div class="stat-label">Mémoire</div><div class="stat-value">{{ status.memoryMb }}<span style="font-size:14px"> Mo</span></div></div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="card card-pad">
          <h3 style="font-size:15px; margin-bottom:12px">Statistiques</h3>
          <div class="row between" style="padding:7px 0; border-bottom:1px solid var(--cg-line)"><span class="muted">Utilisateurs</span><span class="mono">{{ status.stats.users }}</span></div>
          <div class="row between" style="padding:7px 0; border-bottom:1px solid var(--cg-line)"><span class="muted">Commandes</span><span class="mono">{{ status.stats.commandes }}</span></div>
          <div class="row between" style="padding:7px 0"><span class="muted">Notifications en attente</span><span class="mono">{{ status.stats.notifsEnAttente }}</span></div>
        </div>
        <div class="card card-pad">
          <h3 style="font-size:15px; margin-bottom:6px">Mode maintenance</h3>
          <p class="muted" style="font-size:13px; margin-bottom:14px">Bloque l'accès à tous les utilisateurs sauf Directeur et Admin.</p>
          <div class="row between">
            <span class="pill" :style="{ color: status.maintenance ? 'var(--st-EN_COURS)' : 'var(--st-LIVREE)', background:'transparent' }">
              {{ status.maintenance ? 'Activé' : 'Désactivé' }}
            </span>
            <button class="btn" :class="status.maintenance ? 'btn-ghost' : 'btn-primary'" :disabled="toggling" @click="toggleMaintenance">
              {{ toggling ? '…' : (status.maintenance ? 'Désactiver' : 'Activer la maintenance') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
