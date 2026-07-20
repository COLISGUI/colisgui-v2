<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { api, apiError } from '../api/client';
import StatusBadge from '../components/StatusBadge.vue';
const rows = ref<any[]>([]); const loading = ref(true); const error = ref('');
const show = ref(false); const saving = ref(false); const formError = ref('');
const form = reactive({ nom:'', telephone:'', adresse:'', email:'' });
async function load(){ loading.value=true; error.value='';
  try{ const {data}=await api.get('/partners',{params:{limit:100}}); rows.value=data.data; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
async function create(){ saving.value=true; formError.value='';
  try{ await api.post('/partners', {...form}); show.value=false; Object.assign(form,{nom:'',telephone:'',adresse:'',email:''}); await load(); }
  catch(e){ formError.value=apiError(e);} finally{ saving.value=false; } }
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Commercial</div><h1 class="page-title">Partenaires</h1></div>
      <button class="btn btn-primary" @click="show=true">Nouveau partenaire</button></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="card table-wrap">
      <table class="tbl">
        <thead><tr><th>Code</th><th>Nom</th><th>Téléphone</th><th>Type</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td class="mono muted">{{ p.code }}</td><td style="font-weight:600">{{ p.nom }}</td>
            <td class="mono muted">{{ p.telephone }}</td>
            <td><span class="tag-type" :class="{non: p.type!=='ABONNE'}">{{ p.type==='ABONNE'?'Abonné':'Non abonné' }}</span></td>
            <td><StatusBadge :statut="p.statut" /></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5"><div class="empty"><div class="empty-title">Aucun partenaire</div>Ajoutez votre premier partenaire.</div></td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="show" class="modal-backdrop" @click.self="show=false">
      <div class="modal">
        <div class="modal-head"><h3 style="font-size:16px">Nouveau partenaire</h3><button class="btn btn-ghost btn-sm" @click="show=false">✕</button></div>
        <div class="modal-body">
          <div v-if="formError" class="alert alert-error">{{ formError }}</div>
          <div class="form-grid">
            <div class="field"><label>Nom</label><input v-model="form.nom" class="input" /></div>
            <div class="field"><label>Téléphone</label><input v-model="form.telephone" class="input" /></div>
            <div class="field full"><label>Adresse</label><input v-model="form.adresse" class="input" /></div>
            <div class="field full"><label>Email (optionnel)</label><input v-model="form.email" class="input" /></div>
          </div>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" @click="show=false">Annuler</button>
          <button class="btn btn-primary" :disabled="saving || !form.nom || !form.telephone" @click="create">{{ saving?'…':'Créer' }}</button></div>
      </div>
    </div>
  </div>
</template>
