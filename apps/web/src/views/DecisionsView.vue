<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, apiError } from '../api/client';
import { dt } from '../api/format';
const rows = ref<any[]>([]); const loading = ref(true); const error = ref('');
const labels: Record<string,string> = {
  MODIF_PRIX: 'Modification de prix', SUSPENSION_ABONNEMENT: 'Suspension abonnement',
  REACTIVATION_ABONNEMENT: 'Réactivation abonnement', REGLEMENT_DETTE: 'Règlement de dette',
  REAFFECTATION: 'Réaffectation livreur', SUSPENSION_PARTENAIRE: 'Suspension partenaire',
  DELIVER: 'Livraison', UPDATE: 'Changement de statut',
};
async function load(){ loading.value=true; error.value='';
  try{ const {data}=await api.get('/audit/decisions',{params:{limit:50}}); rows.value=data.data; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Gouvernance</div><h1 class="page-title">Journal des décisions</h1>
      <p class="page-sub">Actions sensibles motivées — qui, quand, quoi, pourquoi</p></div></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="card table-wrap">
      <table class="tbl">
        <thead><tr><th>Date</th><th>Décision</th><th>Entité</th><th>Motif</th><th>Utilisateur</th></tr></thead>
        <tbody>
          <tr v-for="a in rows" :key="a.id">
            <td class="muted" style="font-size:12px">{{ dt(a.createdAt) }}</td>
            <td><span class="tag-type">{{ labels[a.action] ?? a.action }}</span></td>
            <td class="muted">{{ a.entite }} <span class="mono" style="font-size:11px">{{ a.entiteId?.slice(0,8) }}</span></td>
            <td>{{ a.raison }}</td>
            <td class="mono muted" style="font-size:11px">{{ a.userId?.slice(0,8) ?? 'système' }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5"><div class="empty"><div class="empty-title">Aucune décision enregistrée</div>Les actions sensibles motivées apparaîtront ici.</div></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
