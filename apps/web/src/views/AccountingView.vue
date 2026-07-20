<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { api, apiError } from '../api/client';
import { gnf, dt } from '../api/format';
const tab = ref<'transactions'|'ledger'|'dettes'>('transactions');
const ledger = ref<any[]>([]);
const accounts = ref<any[]>([]); const transactions = ref<any[]>([]); const debts = ref<any[]>([]);
const loading = ref(true); const error = ref('');
const showExpense = ref(false); const saving = ref(false); const formError = ref('');
const expense = reactive({ categorie:'', montant:0, modePaiement:'ESPECES', compteId:'', description:'' });
async function load(){ loading.value=true; error.value='';
  try{ const [a,t,d,l]=await Promise.all([api.get('/accounts'),api.get('/transactions'),api.get('/debts'),api.get('/accounting/ledger')]);
    accounts.value=a.data; transactions.value=t.data; debts.value=d.data; ledger.value=l.data;
    if(a.data[0]) expense.compteId=a.data[0].id; }
  catch(e){ error.value=apiError(e);} finally{ loading.value=false; } }
async function createExpense(){ saving.value=true; formError.value='';
  try{ await api.post('/expenses',{...expense, montant:Number(expense.montant)}); showExpense.value=false;
    Object.assign(expense,{categorie:'',montant:0,description:''}); await load(); }
  catch(e){ formError.value=apiError(e);} finally{ saving.value=false; } }
async function settle(id:string){
  const raison = prompt('Motif du règlement de la dette :');
  if(!raison || !raison.trim()){ error.value='Motif obligatoire.'; return; }
  try{ await api.patch(`/debts/${id}/settle`, { raison }); await load(); }catch(e){ error.value=apiError(e);}
}
const typeLabel:Record<string,string>={COLLECTE:'Collecte',COMMISSION:'Commission',REVERSEMENT:'Reversement',DEPENSE:'Dépense',DETTE:'Dette',RECETTE:'Recette'};
onMounted(load);
</script>
<template>
  <div>
    <div class="page-head"><div><div class="page-eyebrow">Finance</div><h1 class="page-title">Comptabilité</h1></div>
      <button class="btn btn-primary" @click="showExpense=true">Nouvelle dépense</button></div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>
    <template v-else>
      <div class="grid stat-grid" style="margin-bottom:16px">
        <div v-for="a in accounts" :key="a.id" class="card stat">
          <div class="stat-label">{{ a.nom }} · {{ a.type }}</div>
          <div class="stat-value money">{{ gnf(a.solde) }}</div>
        </div>
      </div>
      <div class="toolbar">
        <button class="btn" :class="tab==='transactions'?'btn-primary':'btn-ghost'" @click="tab='transactions'">Transactions</button>
        <button class="btn" :class="tab==='ledger'?'btn-primary':'btn-ghost'" @click="tab='ledger'">Livre de caisse</button>
        <button class="btn" :class="tab==='dettes'?'btn-primary':'btn-ghost'" @click="tab='dettes'">Dettes / Créances</button>
      </div>
      <div v-if="tab==='transactions'" class="card table-wrap">
        <table class="tbl">
          <thead><tr><th>Type</th><th>Sens</th><th class="num">Montant</th><th>Description</th><th>Date</th></tr></thead>
          <tbody>
            <tr v-for="t in transactions" :key="t.id">
              <td style="font-weight:600">{{ typeLabel[t.type] ?? t.type }}</td>
              <td><span class="pill" :style="{color: t.sens==='ENTREE'?'var(--st-LIVREE)':'var(--st-REFUSEE)', background:'transparent'}">{{ t.sens }}</span></td>
              <td class="num">{{ gnf(t.montant) }}</td><td class="muted">{{ t.description }}</td>
              <td class="muted" style="font-size:12px">{{ dt(t.createdAt) }}</td>
            </tr>
            <tr v-if="!transactions.length"><td colspan="5"><div class="empty"><div class="empty-title">Aucune transaction</div></div></td></tr>
          </tbody>
        </table>
      </div>
      <div v-if="tab==='ledger'" class="card table-wrap">
        <table class="tbl">
          <thead><tr><th>Date</th><th>Opération</th><th>Description</th><th class="num">Entrée</th><th class="num">Sortie</th><th class="num">Solde</th></tr></thead>
          <tbody>
            <tr v-for="r in ledger" :key="r.id">
              <td class="muted" style="font-size:12px">{{ dt(r.date) }}</td>
              <td style="font-weight:600">{{ r.type }}</td><td class="muted">{{ r.description }}</td>
              <td class="num" :style="{color: r.entree ? 'var(--st-LIVREE)' : 'var(--cg-line)'}">{{ r.entree ? gnf(r.entree) : '—' }}</td>
              <td class="num" :style="{color: r.sortie ? 'var(--st-REFUSEE)' : 'var(--cg-line)'}">{{ r.sortie ? gnf(r.sortie) : '—' }}</td>
              <td class="num" style="font-weight:700">{{ gnf(r.solde) }}</td>
            </tr>
            <tr v-if="!ledger.length"><td colspan="6"><div class="empty"><div class="empty-title">Livre vide</div>Les mouvements apparaîtront ici.</div></td></tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="tab==='dettes'" class="card table-wrap">
        <table class="tbl">
          <thead><tr><th>Type</th><th class="num">Montant</th><th>Statut</th><th>Description</th><th></th></tr></thead>
          <tbody>
            <tr v-for="d in debts" :key="d.id">
              <td>{{ d.type }}</td><td class="num">{{ gnf(d.montant) }}</td><td>{{ d.statut }}</td><td class="muted">{{ d.description }}</td>
              <td><button v-if="d.statut!=='REGLEE'" class="btn btn-ghost btn-sm" @click="settle(d.id)">Régler</button></td>
            </tr>
            <tr v-if="!debts.length"><td colspan="5"><div class="empty"><div class="empty-title">Aucune dette / créance</div></div></td></tr>
          </tbody>
        </table>
      </div>
    </template>
    <div v-if="showExpense" class="modal-backdrop" @click.self="showExpense=false">
      <div class="modal"><div class="modal-head"><h3 style="font-size:16px">Nouvelle dépense</h3><button class="btn btn-ghost btn-sm" @click="showExpense=false">✕</button></div>
        <div class="modal-body"><div v-if="formError" class="alert alert-error">{{ formError }}</div>
          <div class="form-grid">
            <div class="field"><label>Catégorie</label><input v-model="expense.categorie" class="input" placeholder="Carburant" /></div>
            <div class="field"><label>Montant (GNF)</label><input v-model.number="expense.montant" type="number" class="input" /></div>
            <div class="field"><label>Mode</label><select v-model="expense.modePaiement" class="select">
              <option value="ESPECES">Espèces</option><option value="ORANGE_MONEY">Orange Money</option></select></div>
            <div class="field"><label>Compte</label><select v-model="expense.compteId" class="select">
              <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.nom }}</option></select></div>
            <div class="field full"><label>Description</label><input v-model="expense.description" class="input" /></div>
          </div>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" @click="showExpense=false">Annuler</button>
          <button class="btn btn-primary" :disabled="saving || !expense.categorie || !expense.montant" @click="createExpense">{{ saving?'…':'Enregistrer' }}</button></div>
      </div>
    </div>
  </div>
</template>
