<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, apiError } from '../api/client';
const tab = ref<'zones'|'motifs'|'params'>('zones');
const zones = ref<any[]>([]); const motifs = ref<any[]>([]); const params = ref<any[]>([]);
const loading = ref(true); const error = ref('');
async function load(){ loading.value=true; error.value='';
  try{ const [z,m,p]=await Promise.all([api.get('/zones'),api.get('/motifs'),api.get('/settings').catch(()=>({data:[]}))]);
    zones.value=z.data; motifs.value=m.data; params.value=p.data; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Configuration</div><h1 class="page-title">Paramètres</h1></div></div>
    <div class="toolbar">
      <button class="btn" :class="tab==='zones'?'btn-primary':'btn-ghost'" @click="tab='zones'">Zones</button>
      <button class="btn" :class="tab==='motifs'?'btn-primary':'btn-ghost'" @click="tab='motifs'">Motifs</button>
      <button class="btn" :class="tab==='params'?'btn-primary':'btn-ghost'" @click="tab='params'">Réglages</button>
    </div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <template v-else>
      <div v-if="tab==='zones'" class="card table-wrap"><table class="tbl">
        <thead><tr><th>Zone</th><th>Type</th><th>Statut</th></tr></thead>
        <tbody><tr v-for="z in zones" :key="z.id"><td style="font-weight:600">{{ z.nom }}</td>
          <td><span class="tag-type" :class="{non: z.type!=='STANDARD'}">{{ z.type }}</span></td>
          <td class="muted">{{ z.actif?'Actif':'Inactif' }}</td></tr></tbody></table></div>
      <div v-else-if="tab==='motifs'" class="card table-wrap"><table class="tbl">
        <thead><tr><th>Code</th><th>Libellé</th><th>Catégorie</th></tr></thead>
        <tbody><tr v-for="m in motifs" :key="m.id"><td class="mono muted">{{ m.code }}</td><td>{{ m.libelle }}</td>
          <td><span class="tag-type">{{ m.categorie }}</span></td></tr></tbody></table></div>
      <div v-else class="card table-wrap"><table class="tbl">
        <thead><tr><th>Clé</th><th>Valeur</th><th>Catégorie</th></tr></thead>
        <tbody><tr v-for="p in params" :key="p.id"><td class="mono">{{ p.cle }}</td>
          <td class="mono">{{ JSON.stringify(p.valeur) }}</td><td class="muted">{{ p.categorie }}</td></tr>
          <tr v-if="!params.length"><td colspan="3" class="muted" style="padding:20px">Réservé au Directeur / Admin.</td></tr>
        </tbody></table></div>
    </template>
  </div>
</template>
