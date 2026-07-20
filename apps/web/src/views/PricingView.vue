<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { api, apiError } from '../api/client';
import { gnf } from '../api/format';
import { useAuth } from '../stores/auth';
const auth = useAuth();
const rows = ref<any[]>([]); const loading = ref(true); const error = ref('');
const show = ref(false); const saving = ref(false); const formError = ref('');
const form = reactive({ pointDepart:'', destination:'', prix:0 });
const isDirecteur = () => auth.role === 'DIRECTEUR';
async function load(){ loading.value=true; error.value='';
  try{ const {data}=await api.get('/pricing-grid'); rows.value=data; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
async function create(){ saving.value=true; formError.value='';
  try{ await api.post('/pricing-grid',{...form, prix:Number(form.prix)}); show.value=false; Object.assign(form,{pointDepart:'',destination:'',prix:0}); await load(); }
  catch(e){ formError.value=apiError(e);} finally{ saving.value=false; } }
async function editPrix(r:any){
  const v = prompt(`Nouveau prix pour ${r.pointDepart} → ${r.destination} (actuel ${r.prix}) :`, String(r.prix));
  if(v===null) return;
  const motif = prompt('Motif de la modification (obligatoire) :');
  if(!motif || !motif.trim()){ error.value='Motif obligatoire pour modifier un prix.'; return; }
  try{ await api.put(`/pricing-grid/${r.id}`,{prix:Number(v), motif}); await load(); }catch(e){ error.value=apiError(e);} }
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Commercial</div><h1 class="page-title">Grille tarifaire</h1>
      <p class="page-sub">Tarification point à point — modification réservée au Directeur, historique conservé</p></div>
      <button v-if="isDirecteur()" class="btn btn-primary" @click="show=true">Ajouter une ligne</button></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="card table-wrap">
      <table class="tbl">
        <thead><tr><th>Point de départ</th><th>Destination</th><th class="num">Prix</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.pointDepart }}</td><td>{{ r.destination }}</td><td class="num" style="font-weight:600">{{ gnf(r.prix) }}</td>
            <td><button v-if="isDirecteur()" class="btn btn-ghost btn-sm" @click="editPrix(r)">Modifier le prix</button></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="4"><div class="empty"><div class="empty-title">Grille vide</div>Ajoutez vos trajets et tarifs.</div></td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="show" class="modal-backdrop" @click.self="show=false">
      <div class="modal"><div class="modal-head"><h3 style="font-size:16px">Ajouter un tarif</h3><button class="btn btn-ghost btn-sm" @click="show=false">✕</button></div>
        <div class="modal-body"><div v-if="formError" class="alert alert-error">{{ formError }}</div>
          <div class="form-grid">
            <div class="field"><label>Point de départ</label><input v-model="form.pointDepart" class="input" placeholder="Sonfonia T7" /></div>
            <div class="field"><label>Destination</label><input v-model="form.destination" class="input" placeholder="Kaloum" /></div>
            <div class="field full"><label>Prix (GNF)</label><input v-model.number="form.prix" type="number" class="input" /></div>
          </div>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" @click="show=false">Annuler</button>
          <button class="btn btn-primary" :disabled="saving" @click="create">{{ saving?'…':'Ajouter' }}</button></div>
      </div>
    </div>
  </div>
</template>
