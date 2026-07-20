<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { api, apiError } from '../api/client';
import { gnf, dt } from '../api/format';
import StatusBadge from '../components/StatusBadge.vue';

const loading = ref(true);
const error = ref('');
const orders = ref<any[]>([]);
const partners = ref<any[]>([]);
const motifs = ref<any[]>([]);
const filterStatut = ref('');
const showCreate = ref(false);
const saving = ref(false);
const formError = ref('');

const form = reactive({
  partenaireId: '', clientNom: '', clientTelephone: '', clientAdresse: '',
  prixProduit: 0, pointDepart: '', destination: '', observations: '',
});

const statuts = ['','CREEE','CONFIRMEE','ASSIGNEE','EN_COURS','LIVREE','REFUSEE','ANNULEE','RETOUR'];

async function load() {
  loading.value = true; error.value = '';
  try {
    const params = filterStatut.value ? { statut: filterStatut.value } : {};
    const [o, p, m] = await Promise.all([
      api.get('/orders', { params }),
      api.get('/partners', { params: { limit: 100 } }),
      api.get('/motifs'),
    ]);
    orders.value = o.data.data;
    partners.value = p.data.data;
    motifs.value = m.data;
  } catch (e) { error.value = apiError(e); } finally { loading.value = false; }
}

function selectedPartner() { return partners.value.find((x) => x.id === form.partenaireId); }
function isAbonne() { return selectedPartner()?.type === 'ABONNE'; }

async function create() {
  saving.value = true; formError.value = '';
  try {
    const payload: any = {
      partenaireId: form.partenaireId, clientNom: form.clientNom, clientTelephone: form.clientTelephone,
      clientAdresse: form.clientAdresse, prixProduit: Number(form.prixProduit), observations: form.observations,
    };
    if (!isAbonne()) { payload.pointDepart = form.pointDepart; payload.destination = form.destination; }
    await api.post('/orders', payload);
    showCreate.value = false;
    Object.assign(form, { partenaireId:'', clientNom:'', clientTelephone:'', clientAdresse:'', prixProduit:0, pointDepart:'', destination:'', observations:'' });
    await load();
  } catch (e) { formError.value = apiError(e); } finally { saving.value = false; }
}

function onStatusChange(o: any, ev: Event) {
  const value = (ev.target as HTMLSelectElement).value;
  if (value) setStatus(o, value);
}

// --- Encaissement (espèces / Orange Money) ---
const showPay = ref(false);
const payTarget = ref<any>(null);
const payMode = ref<'ESPECES' | 'ORANGE_MONEY'>('ESPECES');
const payAmount = ref(0);
const payInfo = ref('');
const paySaving = ref(false);

function openPay(o: any) {
  payTarget.value = o;
  payMode.value = 'ESPECES';
  payAmount.value = Number(o.prixProduit) + Number(o.fraisLivraison);
  payInfo.value = '';
  showPay.value = true;
}
async function pay() {
  paySaving.value = true; payInfo.value = '';
  try {
    const { data } = await api.post('/payments', {
      commandeId: payTarget.value.id, mode: payMode.value,
      montant: Number(payAmount.value), clientTelephone: payTarget.value.clientTelephone,
    });
    if (data?.paymentUrl) payInfo.value = 'Lien de paiement Orange Money généré.';
    else if (data?.simulation) payInfo.value = 'Orange Money (mode simulé) — paiement enregistré.';
    else payInfo.value = 'Paiement enregistré.';
    setTimeout(() => { showPay.value = false; }, 900);
  } catch (e) { payInfo.value = apiError(e); } finally { paySaving.value = false; }
}

// --- Timeline (#1) ---
const showTimeline = ref(false);
const timeline = ref<any[]>([]);
const timelineRef = ref('');
const timelineLoading = ref(false);
async function openTimeline(o: any) {
  showTimeline.value = true; timelineRef.value = o.reference; timeline.value = []; timelineLoading.value = true;
  try { const { data } = await api.get(`/orders/${o.id}/timeline`); timeline.value = data; }
  catch (e) { error.value = apiError(e); } finally { timelineLoading.value = false; }
}
const evColor: Record<string,string> = {
  CREATION: 'var(--st-CREEE)', CONFIRMATION: 'var(--st-CONFIRMEE)', AFFECTATION: 'var(--st-ASSIGNEE)',
  PRISE_EN_CHARGE: 'var(--st-EN_COURS)', LIVRAISON: 'var(--st-LIVREE)', PAIEMENT: 'var(--cg-orange)',
  ECRITURE_COMPTABLE: 'var(--cg-ink-2)', COMMISSION: 'var(--cg-orange-600)', REVERSEMENT: 'var(--st-RETOUR)',
  DECREMENT_ABONNEMENT: 'var(--st-CONFIRMEE)', NOTIFICATION: 'var(--cg-muted)',
  REFUS: 'var(--st-REFUSEE)', ANNULATION: 'var(--st-ANNULEE)', RETOUR: 'var(--st-RETOUR)',
};

async function confirm(o: any) {
  try { await api.patch(`/orders/${o.id}/confirm`); await load(); } catch (e) { error.value = apiError(e); }
}
async function setStatus(o: any, statut: string) {
  const motifRequis = ['REFUSEE','ANNULEE','RETOUR'].includes(statut);
  let motifId: string | undefined;
  if (motifRequis) {
    const dispo = motifs.value;
    motifId = dispo[0]?.id;
    if (!motifId) { error.value = 'Aucun motif configuré'; return; }
  }
  try { await api.patch(`/orders/${o.id}/status`, { statut, motifId }); await load(); }
  catch (e) { error.value = apiError(e); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <div class="page-eyebrow">Exploitation</div>
        <h1 class="page-title">Commandes</h1>
      </div>
      <button class="btn btn-primary" @click="showCreate = true">Nouvelle commande</button>
    </div>

    <div class="toolbar">
      <select v-model="filterStatut" class="select" style="width:auto" @change="load">
        <option v-for="s in statuts" :key="s" :value="s">{{ s || 'Tous les statuts' }}</option>
      </select>
      <div class="spacer" />
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading" class="loading">Chargement…</div>

    <div v-else class="card table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Référence</th><th>Client</th><th>Téléphone</th><th>Partenaire</th>
            <th class="num">Produit</th><th class="num">Livraison</th><th>Statut</th><th>Créée</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td class="mono">{{ o.reference }}</td>
            <td>{{ o.clientNom }}</td>
            <td class="mono muted">{{ o.clientTelephone }}</td>
            <td class="muted">{{ o.partenaire?.nom }}</td>
            <td class="num">{{ gnf(o.prixProduit) }}</td>
            <td class="num">{{ gnf(o.fraisLivraison) }}</td>
            <td><StatusBadge :statut="o.statut" /></td>
            <td class="muted" style="font-size:12px">{{ dt(o.createdAt) }}</td>
            <td>
              <div class="row" style="gap:6px">
                <button v-if="o.statut==='CREEE'" class="btn btn-ghost btn-sm" @click="confirm(o)">Confirmer</button>
                <button v-if="o.statut==='EN_COURS'" class="btn btn-primary btn-sm" @click="setStatus(o,'LIVREE')">Livrer</button>
                <button v-if="o.statut==='LIVREE'" class="btn btn-ghost btn-sm" @click="openPay(o)">Encaisser</button>
                <button class="btn btn-ghost btn-sm" @click="openTimeline(o)">Suivi</button>
                <select v-if="['ASSIGNEE','EN_COURS'].includes(o.statut)" class="select btn-sm" style="width:auto; padding:4px 8px"
                  @change="onStatusChange(o, $event)">
                  <option value="">…</option>
                  <option v-if="o.statut==='ASSIGNEE'" value="EN_COURS">Démarrer</option>
                  <option value="REFUSEE">Refuser</option>
                  <option v-if="o.statut==='EN_COURS'" value="RETOUR">Retour</option>
                </select>
              </div>
            </td>
          </tr>
          <tr v-if="!orders.length"><td colspan="9"><div class="empty"><div class="empty-title">Aucune commande</div>Créez la première commande.</div></td></tr>
        </tbody>
      </table>
    </div>

    <!-- Modal création -->
    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate=false">
      <div class="modal">
        <div class="modal-head"><h3 style="font-size:16px">Nouvelle commande</h3><button class="btn btn-ghost btn-sm" @click="showCreate=false">✕</button></div>
        <div class="modal-body">
          <div v-if="formError" class="alert alert-error">{{ formError }}</div>
          <div class="field">
            <label>Partenaire</label>
            <select v-model="form.partenaireId" class="select">
              <option value="">Sélectionner…</option>
              <option v-for="p in partners" :key="p.id" :value="p.id">{{ p.nom }} — {{ p.type === 'ABONNE' ? 'Abonné' : 'Non abonné' }}</option>
            </select>
          </div>
          <div class="form-grid">
            <div class="field"><label>Nom du client</label><input v-model="form.clientNom" class="input" /></div>
            <div class="field"><label>Téléphone client</label><input v-model="form.clientTelephone" class="input" /></div>
            <div class="field full"><label>Adresse de livraison</label><input v-model="form.clientAdresse" class="input" /></div>
            <div class="field"><label>Prix produit (GNF)</label><input v-model.number="form.prixProduit" type="number" class="input" /></div>
          </div>

          <div v-if="form.partenaireId && !isAbonne()" class="card card-pad" style="background:var(--cg-orange-tint); border:none; margin-bottom:14px">
            <div class="muted" style="font-size:12px; margin-bottom:10px">Partenaire non abonné — tarification via la grille.</div>
            <div class="form-grid">
              <div class="field" style="margin-bottom:0"><label>Point de départ</label><input v-model="form.pointDepart" class="input" placeholder="Sonfonia T7" /></div>
              <div class="field" style="margin-bottom:0"><label>Destination</label><input v-model="form.destination" class="input" placeholder="Kaloum" /></div>
            </div>
          </div>
          <div v-else-if="form.partenaireId" class="muted" style="font-size:12px; margin-bottom:10px">Partenaire abonné — la livraison sera décomptée du forfait.</div>

          <div class="field"><label>Observations</label><textarea v-model="form.observations" class="input" rows="2" /></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showCreate=false">Annuler</button>
          <button class="btn btn-primary" :disabled="saving || !form.partenaireId" @click="create">{{ saving ? 'Création…' : 'Créer la commande' }}</button>
        </div>
      </div>
    </div>
    <!-- Modal encaissement -->
    <div v-if="showPay" class="modal-backdrop" @click.self="showPay=false">
      <div class="modal" style="max-width:440px">
        <div class="modal-head"><h3 style="font-size:16px">Encaisser — {{ payTarget?.reference }}</h3><button class="btn btn-ghost btn-sm" @click="showPay=false">✕</button></div>
        <div class="modal-body">
          <div v-if="payInfo" class="alert" :class="payInfo.includes('erreur')||payInfo.includes('Erreur')?'alert-error':''" style="background:var(--cg-orange-tint); color:var(--cg-orange-600)">{{ payInfo }}</div>
          <div class="field"><label>Mode de paiement</label>
            <select v-model="payMode" class="select">
              <option value="ESPECES">Espèces</option>
              <option value="ORANGE_MONEY">Orange Money</option>
            </select>
          </div>
          <div class="field"><label>Montant (GNF)</label><input v-model.number="payAmount" type="number" class="input" /></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showPay=false">Annuler</button>
          <button class="btn btn-primary" :disabled="paySaving || !payAmount" @click="pay">{{ paySaving ? '…' : 'Encaisser' }}</button>
        </div>
      </div>
    </div>
    <!-- Timeline commande (#1) -->
    <div v-if="showTimeline" class="modal-backdrop" @click.self="showTimeline=false">
      <div class="modal">
        <div class="modal-head"><h3 style="font-size:16px">Suivi — <span class="mono">{{ timelineRef }}</span></h3><button class="btn btn-ghost btn-sm" @click="showTimeline=false">✕</button></div>
        <div class="modal-body">
          <div v-if="timelineLoading" class="loading">Chargement…</div>
          <div v-else-if="!timeline.length" class="muted" style="padding:16px 0">Aucun évènement.</div>
          <ol v-else class="timeline">
            <li v-for="e in timeline" :key="e.id" class="tl-item">
              <span class="tl-dot" :style="{ background: evColor[e.type] || 'var(--cg-muted)' }" />
              <div class="tl-body">
                <div class="tl-label">{{ e.libelle }}</div>
                <div class="tl-time mono">{{ dt(e.createdAt) }}</div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline { list-style: none; margin: 0; padding: 0; position: relative; }
.timeline::before { content: ""; position: absolute; left: 6px; top: 6px; bottom: 6px; width: 2px; background: var(--cg-line); }
.tl-item { display: flex; gap: 14px; padding: 8px 0; position: relative; }
.tl-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; box-shadow: 0 0 0 3px var(--cg-surface); z-index: 1; }
.tl-label { font-weight: 600; font-size: 13.5px; }
.tl-time { font-size: 11.5px; color: var(--cg-muted); margin-top: 2px; }
</style>
