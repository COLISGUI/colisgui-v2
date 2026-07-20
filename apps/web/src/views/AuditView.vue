<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, apiError } from '../api/client';
import { dt } from '../api/format';
const rows = ref<any[]>([]); const loading = ref(true); const error = ref('');
async function load(){ loading.value=true; error.value='';
  try{ const {data}=await api.get('/audit',{params:{limit:50}}); rows.value=data.data; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Pilotage</div><h1 class="page-title">Audit</h1>
      <p class="page-sub">Qui, quand, avant, après — sur les actions sensibles</p></div></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="card table-wrap">
      <table class="tbl">
        <thead><tr><th>Date</th><th>Action</th><th>Entité</th><th>Réf. entité</th><th>Utilisateur</th></tr></thead>
        <tbody>
          <tr v-for="a in rows" :key="a.id">
            <td class="muted" style="font-size:12px">{{ dt(a.createdAt) }}</td>
            <td><span class="tag-type">{{ a.action }}</span></td>
            <td>{{ a.entite }}</td><td class="mono muted" style="font-size:11px">{{ a.entiteId?.slice(0,8) ?? '—' }}</td>
            <td class="mono muted" style="font-size:11px">{{ a.userId?.slice(0,8) ?? 'système' }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5"><div class="empty"><div class="empty-title">Journal vide</div>Les actions apparaîtront ici.</div></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
