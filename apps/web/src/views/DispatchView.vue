<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, apiError } from '../api/client';
const queue = ref<any[]>([]); const load_ = ref<any[]>([]); const drivers = ref<any[]>([]);
const loading = ref(true); const error = ref('');
const picked = ref<Record<string,string>>({});
async function load() {
  loading.value=true; error.value='';
  try {
    const [q, l, d] = await Promise.all([api.get('/dispatch/queue'), api.get('/dispatch/drivers-load'), api.get('/drivers',{params:{limit:100}})]);
    queue.value=q.data; load_.value=l.data; drivers.value=d.data.data;
  } catch(e){ error.value=apiError(e);} finally{ loading.value=false; }
}
async function assign(c:any){
  const livreurId = picked.value[c.id];
  if(!livreurId){ error.value='Choisissez un livreur'; return; }
  try{ await api.post('/dispatch/assign',{commandeId:c.id, livreurId}); await load(); }catch(e){ error.value=apiError(e);}
}
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Exploitation</div><h1 class="page-title">Dispatch</h1><p class="page-sub">Affectation des commandes confirmées</p></div></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="grid" style="grid-template-columns: 2fr 1fr">
      <div class="card table-wrap">
        <table class="tbl">
          <thead><tr><th>Référence</th><th>Client</th><th>Zone</th><th>Livreur</th><th></th></tr></thead>
          <tbody>
            <tr v-for="c in queue" :key="c.id">
              <td class="mono">{{ c.reference }}</td><td>{{ c.clientNom }}</td><td class="muted">{{ c.zone?.nom ?? '—' }}</td>
              <td><select v-model="picked[c.id]" class="select" style="padding:5px 8px"><option value="">Choisir…</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.prenom }} {{ d.nom }}</option></select></td>
              <td><button class="btn btn-primary btn-sm" @click="assign(c)">Affecter</button></td>
            </tr>
            <tr v-if="!queue.length"><td colspan="5"><div class="empty"><div class="empty-title">File vide</div>Aucune commande à affecter.</div></td></tr>
          </tbody>
        </table>
      </div>
      <div class="card card-pad">
        <h3 style="font-size:15px; margin-bottom:12px">Charge des livreurs</h3>
        <div v-for="l in load_" :key="l.livreurId" class="row between" style="padding:8px 0; border-bottom:1px solid var(--cg-line)">
          <span>{{ l.nom }}</span><span class="mono" style="font-weight:600">{{ l.charge }}</span>
        </div>
        <div v-if="!load_.length" class="muted" style="padding:12px 0">Aucun livreur actif.</div>
      </div>
    </div>
  </div>
</template>
