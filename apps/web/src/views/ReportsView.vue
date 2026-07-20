<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api, apiError } from '../api/client';
import { gnf } from '../api/format';
import StatusBadge from '../components/StatusBadge.vue';
const period = ref<'daily'|'weekly'|'monthly'|'annual'>('daily');
const data = ref<any>(null); const loading = ref(true); const error = ref('');
const statusOrder = ['CREEE','CONFIRMEE','ASSIGNEE','EN_COURS','LIVREE','REFUSEE','ANNULEE','RETOUR'];
async function load(){ loading.value=true; error.value='';
  try{ const {data:d}=await api.get(`/reports/${period.value}`); data.value=d; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
watch(period, load); onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Pilotage</div><h1 class="page-title">Rapports</h1></div></div>
    <div class="toolbar">
      <button class="btn" :class="period==='daily'?'btn-primary':'btn-ghost'" @click="period='daily'">Journalier</button>
      <button class="btn" :class="period==='weekly'?'btn-primary':'btn-ghost'" @click="period='weekly'">Hebdomadaire</button>
      <button class="btn" :class="period==='monthly'?'btn-primary':'btn-ghost'" @click="period='monthly'">Mensuel</button>
      <button class="btn" :class="period==='annual'?'btn-primary':'btn-ghost'" @click="period='annual'">Annuel</button>
    </div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <template v-else-if="data">
      <div class="grid stat-grid" style="margin-bottom:16px">
        <div class="card stat"><div class="stat-label">Livraisons</div><div class="stat-value stat-accent">{{ data.livraisons }}</div></div>
        <div class="card stat"><div class="stat-label">Encaissements</div><div class="stat-value money">{{ gnf(data.finances.encaissements) }}</div></div>
        <div class="card stat"><div class="stat-label">Commissions</div><div class="stat-value money">{{ gnf(data.finances.commissions) }}</div></div>
        <div class="card stat"><div class="stat-label">Reversements</div><div class="stat-value money">{{ gnf(data.finances.reversements) }}</div></div>
        <div class="card stat"><div class="stat-label">Dépenses</div><div class="stat-value money">{{ gnf(data.finances.depenses) }}</div></div>
        <div class="card stat"><div class="stat-label">Résultat net</div><div class="stat-value money">{{ gnf(data.finances.resultatNet) }}</div></div>
      </div>
      <div class="card card-pad">
        <h3 style="font-size:15px; margin-bottom:14px">Commandes par statut</h3>
        <div class="row wrap" style="gap:16px">
          <div v-for="s in statusOrder" :key="s" class="row" style="gap:8px">
            <StatusBadge :statut="s" /><span class="mono" style="font-weight:600">{{ data.commandes?.[s] ?? 0 }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
