<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, apiError } from '../api/client';
import { gnf } from '../api/format';
const kpi = ref<any>(null); const topP = ref<any[]>([]); const topD = ref<any[]>([]);
const loading = ref(true); const error = ref('');
onMounted(async () => {
  try {
    const [k, p, d] = await Promise.all([
      api.get('/dashboard/director'), api.get('/analytics/top-partners'), api.get('/analytics/top-drivers'),
    ]);
    kpi.value = k.data; topP.value = p.data; topD.value = d.data;
  } catch (e) { error.value = apiError(e); } finally { loading.value = false; }
});
function scoreColor(s: number) { return s >= 75 ? 'var(--st-LIVREE)' : s >= 50 ? 'var(--st-EN_COURS)' : 'var(--st-REFUSEE)'; }
</script>

<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Pilotage stratégique</div><h1 class="page-title">Tableau de bord Directeur</h1>
      <p class="page-sub">30 derniers jours</p></div></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <template v-else-if="kpi">
      <div class="grid stat-grid" style="margin-bottom:16px">
        <div class="card stat"><div class="stat-label">Bénéfice net</div><div class="stat-value money stat-accent">{{ gnf(kpi.beneficeNet) }}</div></div>
        <div class="card stat"><div class="stat-label">Coût moyen / livraison</div><div class="stat-value money">{{ gnf(kpi.coutMoyenLivraison) }}</div></div>
        <div class="card stat"><div class="stat-label">Temps moyen livraison</div><div class="stat-value">{{ kpi.tempsMoyenLivraisonMinutes }}<span style="font-size:14px"> min</span></div></div>
        <div class="card stat"><div class="stat-label">Taux de réussite</div><div class="stat-value">{{ kpi.tauxReussite }}<span style="font-size:14px">%</span></div></div>
        <div class="card stat"><div class="stat-label">Commandes / heure</div><div class="stat-value">{{ kpi.commandesParHeure }}</div></div>
        <div class="card stat"><div class="stat-label">Livraisons</div><div class="stat-value stat-accent">{{ kpi.livrees }}</div></div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr; margin-bottom:16px">
        <div class="card card-pad">
          <h3 style="font-size:15px; margin-bottom:12px">Marge par partenaire (commissions)</h3>
          <div v-for="m in kpi.margeParPartenaire" :key="m.partenaireId" class="row between" style="padding:7px 0; border-bottom:1px solid var(--cg-line)">
            <span>{{ m.nom }}</span><span class="mono" style="font-weight:600">{{ gnf(m.marge) }}</span>
          </div>
          <div v-if="!kpi.margeParPartenaire.length" class="muted" style="padding:8px 0">Aucune donnée.</div>
        </div>
        <div class="card card-pad">
          <h3 style="font-size:15px; margin-bottom:12px">Marge par livreur (frais livrés)</h3>
          <div v-for="m in kpi.margeParLivreur" :key="m.livreurId" class="row between" style="padding:7px 0; border-bottom:1px solid var(--cg-line)">
            <span>{{ m.nom }} <span class="muted">· {{ m.livraisons }} liv.</span></span><span class="mono" style="font-weight:600">{{ gnf(m.marge) }}</span>
          </div>
          <div v-if="!kpi.margeParLivreur.length" class="muted" style="padding:8px 0">Aucune donnée.</div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="card card-pad">
          <h3 style="font-size:15px; margin-bottom:12px">Meilleurs partenaires (score)</h3>
          <div v-for="p in topP" :key="p.partenaireId" class="row between" style="padding:8px 0; border-bottom:1px solid var(--cg-line)">
            <span class="muted">Réussite {{ p.tauxReussite }}% · {{ p.total }} cmd</span>
            <span class="pill" :style="{ color: scoreColor(p.score), background: 'transparent', fontFamily: 'var(--font-mono)' }">{{ p.score }}/100</span>
          </div>
          <div v-if="!topP.length" class="muted" style="padding:8px 0">Aucune donnée.</div>
        </div>
        <div class="card card-pad">
          <h3 style="font-size:15px; margin-bottom:12px">Meilleurs livreurs (score)</h3>
          <div v-for="l in topD" :key="l.livreurId" class="row between" style="padding:8px 0; border-bottom:1px solid var(--cg-line)">
            <span>{{ l.nom }} <span class="muted">· {{ l.livrees }}/{{ l.affectees }}</span></span>
            <span class="pill" :style="{ color: scoreColor(l.score), background: 'transparent', fontFamily: 'var(--font-mono)' }">{{ l.score }}/100</span>
          </div>
          <div v-if="!topD.length" class="muted" style="padding:8px 0">Aucune donnée.</div>
        </div>
      </div>
    </template>
  </div>
</template>
