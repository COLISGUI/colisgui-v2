<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { api, apiError } from '../api/client';
import StatusBadge from '../components/StatusBadge.vue';
const rows = ref<any[]>([]); const loading = ref(true); const error = ref('');
const show = ref(false); const saving = ref(false); const formError = ref('');
const form = reactive({ nom:'', prenom:'', telephone:'', motoImmatriculation:'' });
async function load(){ loading.value=true; error.value='';
  try{ const {data}=await api.get('/drivers',{params:{limit:100}}); rows.value=data.data; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
async function create(){ saving.value=true; formError.value='';
  try{ await api.post('/drivers',{...form}); show.value=false; Object.assign(form,{nom:'',prenom:'',telephone:'',motoImmatriculation:''}); await load(); }
  catch(e){ formError.value=apiError(e);} finally{ saving.value=false; } }
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Commercial</div><h1 class="page-title">Livreurs</h1></div>
      <button class="btn btn-primary" @click="show=true">Nouveau livreur</button></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="card table-wrap">
      <table class="tbl">
        <thead><tr><th>Nom</th><th>Téléphone</th><th>Moto</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="l in rows" :key="l.id">
            <td style="font-weight:600">{{ l.prenom }} {{ l.nom }}</td><td class="mono muted">{{ l.telephone }}</td>
            <td class="muted">{{ l.motoImmatriculation ?? '—' }}</td><td><StatusBadge :statut="l.statut" /></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="4"><div class="empty"><div class="empty-title">Aucun livreur</div></div></td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="show" class="modal-backdrop" @click.self="show=false">
      <div class="modal"><div class="modal-head"><h3 style="font-size:16px">Nouveau livreur</h3><button class="btn btn-ghost btn-sm" @click="show=false">✕</button></div>
        <div class="modal-body"><div v-if="formError" class="alert alert-error">{{ formError }}</div>
          <div class="form-grid">
            <div class="field"><label>Prénom</label><input v-model="form.prenom" class="input" /></div>
            <div class="field"><label>Nom</label><input v-model="form.nom" class="input" /></div>
            <div class="field"><label>Téléphone</label><input v-model="form.telephone" class="input" /></div>
            <div class="field"><label>Immatriculation moto</label><input v-model="form.motoImmatriculation" class="input" /></div>
          </div>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" @click="show=false">Annuler</button>
          <button class="btn btn-primary" :disabled="saving || !form.nom || !form.telephone" @click="create">{{ saving?'…':'Créer' }}</button></div>
      </div>
    </div>
  </div>
</template>
