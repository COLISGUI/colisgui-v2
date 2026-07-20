<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, apiError } from '../api/client';
import { gnf } from '../api/format';
import { useAuth } from '../stores/auth';
import StatusBadge from '../components/StatusBadge.vue';

const router = useRouter();
const auth = useAuth();
const loading = ref(true);
const error = ref('');
const isFinance = computed(() => ['DIRECTEUR', 'ADMIN', 'COMPTABLE'].includes(auth.role));
const report = ref<any>(null);
const pipeline = ref<any>(null);
const callQueue = ref<any[]>([]);
const dispatchQueue = ref<any[]>([]);

const statusOrder = ['CREEE','CONFIRMEE','ASSIGNEE','EN_COURS','LIVREE','REFUSEE','ANNULEE','RETOUR'];

onMounted(async () => {
  try {
    const calls: Promise<any>[] = [
      api.get('/dashboard/pipeline'),
      api.get('/call-center/queue'),
      api.get('/dispatch/queue'),
    ];
    if (isFinance.value) calls.unshift(api.get('/reports/daily'));
    const results = await Promise.allSettled(calls);
    let i = 0;
    if (isFinance.value) { const rep = results[i++]; if (rep.status === 'fulfilled') report.value = rep.value.data; }
    const pl = results[i++]; if (pl.status === 'fulfilled') pipeline.value = pl.value.data;
    const cc = results[i++]; if (cc.status === 'fulfilled') callQueue.value = cc.value.data;
    const dp = results[i++]; if (dp.status === 'fulfilled') dispatchQueue.value = dp.value.data;
  } catch (e) {
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
});
function goStatus(s: string) { router.push({ path: '/orders' }); void s; }
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <div class="page-eyebrow">Aujourd'hui</div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-sub">Activité et files d'attente du jour</p>
      </div>
      <button class="btn btn-primary" @click="router.push('/orders')">Nouvelle commande</button>
    </div>

    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <template v-else>
      <div v-if="pipeline" class="card card-pad" style="margin-bottom:16px">
        <h3 style="font-size:15px; margin-bottom:14px">Pipeline opérationnel</h3>
        <div class="pipeline">
          <button v-for="s in statusOrder" :key="s" class="pipe-stage" @click="goStatus(s)">
            <StatusBadge :statut="s" />
            <span class="pipe-count mono">{{ pipeline[s] ?? 0 }}</span>
          </button>
        </div>
      </div>

      <div v-if="report" class="grid stat-grid" style="margin-bottom:16px">
        <div class="card stat">
          <div class="stat-label">Livraisons du jour</div>
          <div class="stat-value stat-accent">{{ report?.livraisons ?? 0 }}</div>
        </div>
        <div class="card stat">
          <div class="stat-label">Encaissements</div>
          <div class="stat-value money">{{ gnf(report?.finances?.encaissements) }}</div>
        </div>
        <div class="card stat">
          <div class="stat-label">Commissions</div>
          <div class="stat-value money">{{ gnf(report?.finances?.commissions) }}</div>
        </div>
        <div class="card stat">
          <div class="stat-label">Résultat net</div>
          <div class="stat-value money">{{ gnf(report?.finances?.resultatNet) }}</div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns: 1fr; margin-bottom:16px">
        <div class="card card-pad">
          <h3 style="font-size:15px; margin-bottom:14px">Commandes par statut</h3>
          <div class="row wrap" style="gap:14px">
            <div v-for="s in statusOrder" :key="s" class="row" style="gap:8px">
              <StatusBadge :statut="s" />
              <span class="mono" style="font-weight:600">{{ report?.commandes?.[s] ?? 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns: 1fr 1fr">
        <div class="card">
          <div class="card-pad row between">
            <h3 style="font-size:15px">À confirmer (Call Center)</h3>
            <button class="btn btn-ghost btn-sm" @click="router.push('/call-center')">Ouvrir</button>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th>Réf.</th><th>Client</th><th>Partenaire</th></tr></thead>
              <tbody>
                <tr v-for="c in callQueue.slice(0,6)" :key="c.id">
                  <td class="mono">{{ c.reference }}</td>
                  <td>{{ c.clientNom }}</td>
                  <td class="muted">{{ c.partenaire?.nom }}</td>
                </tr>
                <tr v-if="!callQueue.length"><td colspan="3" class="muted" style="padding:20px">Aucune commande à confirmer.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-pad row between">
            <h3 style="font-size:15px">À affecter (Dispatch)</h3>
            <button class="btn btn-ghost btn-sm" @click="router.push('/dispatch')">Ouvrir</button>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th>Réf.</th><th>Client</th><th>Zone</th></tr></thead>
              <tbody>
                <tr v-for="c in dispatchQueue.slice(0,6)" :key="c.id">
                  <td class="mono">{{ c.reference }}</td>
                  <td>{{ c.clientNom }}</td>
                  <td class="muted">{{ c.zone?.nom ?? '—' }}</td>
                </tr>
                <tr v-if="!dispatchQueue.length"><td colspan="3" class="muted" style="padding:20px">Aucune commande à affecter.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pipeline { display: flex; gap: 10px; flex-wrap: wrap; }
.pipe-stage {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px 14px;
  border: 1px solid var(--cg-line); border-radius: var(--radius-sm); background: var(--cg-surface); min-width: 104px;
}
.pipe-stage:hover { border-color: var(--cg-orange); }
.pipe-count { font-size: 22px; font-weight: 700; font-family: var(--font-display); }
</style>
