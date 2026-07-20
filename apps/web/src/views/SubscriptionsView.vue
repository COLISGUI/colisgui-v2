<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { api, apiError } from '../api/client';
import { gnf, d } from '../api/format';
import StatusBadge from '../components/StatusBadge.vue';
const rows = ref<any[]>([]); const partners = ref<any[]>([]); const packs = ref<any[]>([]);
const loading = ref(true); const error = ref(''); const show = ref(false); const saving = ref(false); const formError = ref('');
const form = reactive({ partenaireId:'', packId:'' });
async function load(){ loading.value=true; error.value='';
  try{ const [s,p,k]=await Promise.all([api.get('/subscriptions'),api.get('/partners',{params:{limit:100}}),api.get('/packs')]);
    rows.value=s.data; partners.value=p.data.data; packs.value=k.data; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
async function create(){ saving.value=true; formError.value='';
  try{ await api.post('/subscriptions',{...form}); show.value=false; Object.assign(form,{partenaireId:'',packId:''}); await load(); }
  catch(e){ formError.value=apiError(e);} finally{ saving.value=false; } }
async function act(id:string, action:string){
  let body:any = {};
  if(action==='suspend'){
    const raison = prompt('Motif de la suspension de l\'abonnement :');
    if(!raison || !raison.trim()){ error.value='Motif obligatoire pour suspendre.'; return; }
    body = { raison };
  }
  try{ await api.post(`/subscriptions/${id}/${action}`, body); await load(); }catch(e){ error.value=apiError(e);}
}
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Commercial</div><h1 class="page-title">Abonnements</h1></div>
      <button class="btn btn-primary" @click="show=true">Nouvel abonnement</button></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="card table-wrap">
      <table class="tbl">
        <thead><tr><th>Partenaire</th><th>Pack</th><th class="num">Restantes</th><th>Fin</th><th class="num">Payé</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          <tr v-for="s in rows" :key="s.id">
            <td style="font-weight:600">{{ s.partenaire?.nom }}</td><td>{{ s.pack?.libelle }}</td>
            <td class="num">{{ s.livraisonsRestantes }} / {{ s.livraisonsIncluses }}</td>
            <td class="muted">{{ d(s.dateFin) }}</td><td class="num">{{ gnf(s.prixPaye) }}</td>
            <td><StatusBadge :statut="s.statut" /></td>
            <td><div class="row" style="gap:6px; justify-content:flex-end">
              <button class="btn btn-ghost btn-sm" @click="act(s.id,'renew')">Renouveler</button>
              <button v-if="s.statut==='ACTIVE'" class="btn btn-ghost btn-sm" @click="act(s.id,'suspend')">Suspendre</button>
              <button v-else class="btn btn-ghost btn-sm" @click="act(s.id,'reactivate')">Réactiver</button>
            </div></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="7"><div class="empty"><div class="empty-title">Aucun abonnement</div></div></td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="show" class="modal-backdrop" @click.self="show=false">
      <div class="modal"><div class="modal-head"><h3 style="font-size:16px">Nouvel abonnement</h3><button class="btn btn-ghost btn-sm" @click="show=false">✕</button></div>
        <div class="modal-body"><div v-if="formError" class="alert alert-error">{{ formError }}</div>
          <div class="field"><label>Partenaire</label><select v-model="form.partenaireId" class="select"><option value="">Sélectionner…</option>
            <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.nom }}</option></select></div>
          <div class="field"><label>Pack</label><select v-model="form.packId" class="select"><option value="">Sélectionner…</option>
            <option v-for="k in packs" :key="k.id" :value="k.id">{{ k.libelle }} — {{ gnf(k.prix) }} ({{ k.nombreLivraisons }} livraisons)</option></select></div>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" @click="show=false">Annuler</button>
          <button class="btn btn-primary" :disabled="saving || !form.partenaireId || !form.packId" @click="create">{{ saving?'…':'Créer' }}</button></div>
      </div>
    </div>
  </div>
</template>
