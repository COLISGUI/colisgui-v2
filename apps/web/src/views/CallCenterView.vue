<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, apiError } from '../api/client';
const queue = ref<any[]>([]); const motifs = ref<any[]>([]);
const loading = ref(true); const error = ref('');
async function load() {
  loading.value = true; error.value='';
  try {
    const [q, m] = await Promise.all([api.get('/call-center/queue'), api.get('/motifs')]);
    queue.value = q.data; motifs.value = m.data;
  } catch (e) { error.value = apiError(e); } finally { loading.value = false; }
}
async function log(c: any, resultat: string) {
  const payload: any = { commandeId: c.id, resultat };
  if (resultat === 'REFUSEE') payload.motifId = motifs.value.find(x=>x.categorie==='REFUS')?.id ?? motifs.value[0]?.id;
  try { await api.post('/call-logs', payload); await load(); } catch (e) { error.value = apiError(e); }
}
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Exploitation</div><h1 class="page-title">Call Center</h1><p class="page-sub">Confirmation des commandes créées</p></div></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="card table-wrap">
      <table class="tbl">
        <thead><tr><th>Référence</th><th>Client</th><th>Téléphone</th><th>Partenaire</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in queue" :key="c.id">
            <td class="mono">{{ c.reference }}</td><td>{{ c.clientNom }}</td>
            <td class="mono muted">{{ c.clientTelephone }}</td><td class="muted">{{ c.partenaire?.nom }}</td>
            <td><div class="row" style="gap:6px; justify-content:flex-end">
              <button class="btn btn-primary btn-sm" @click="log(c,'CONFIRMEE')">Confirmer</button>
              <button class="btn btn-ghost btn-sm" @click="log(c,'INJOIGNABLE')">Injoignable</button>
              <button class="btn btn-ghost btn-sm" @click="log(c,'REFUSEE')">Refuser</button>
            </div></td>
          </tr>
          <tr v-if="!queue.length"><td colspan="5"><div class="empty"><div class="empty-title">File vide</div>Aucune commande à confirmer.</div></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
