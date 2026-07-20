<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useAuth } from '../stores/auth';
import { api } from '../api/client';

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const open = ref(false);

// Recherche globale (#10)
const q = ref('');
const results = ref<any>(null);
const searching = ref(false);
let timer: any;
function onSearch() {
  clearTimeout(timer);
  if (q.value.trim().length < 2) { results.value = null; return; }
  timer = setTimeout(async () => {
    searching.value = true;
    try { const { data } = await api.get('/search', { params: { q: q.value.trim() } }); results.value = data; }
    catch { results.value = null; } finally { searching.value = false; }
  }, 250);
}
function go(path: string) { q.value = ''; results.value = null; router.push(path); }
const hasResults = computed(() => results.value && (results.value.commandes.length || results.value.partenaires.length || results.value.livreurs.length));

interface NavLink { to: string; label: string; roles?: string[]; }
interface NavGroup { label: string; links: NavLink[]; }

const groups: NavGroup[] = [
  { label: 'Exploitation', links: [
    { to: '/dashboard', label: 'Tableau de bord' },
    { to: '/orders', label: 'Commandes' },
    { to: '/call-center', label: 'Call Center', roles: ['DIRECTEUR','ADMIN','AGENT_CALL_CENTER'] },
    { to: '/dispatch', label: 'Dispatch', roles: ['DIRECTEUR','ADMIN','DISPATCHER'] },
  ]},
  { label: 'Commercial', links: [
    { to: '/partners', label: 'Partenaires' },
    { to: '/subscriptions', label: 'Abonnements' },
    { to: '/pricing', label: 'Grille tarifaire' },
    { to: '/drivers', label: 'Livreurs', roles: ['DIRECTEUR','ADMIN','DISPATCHER'] },
  ]},
  { label: 'Finance & pilotage', links: [
    { to: '/director', label: 'Direction', roles: ['DIRECTEUR','ADMIN'] },
    { to: '/accounting', label: 'Comptabilité', roles: ['DIRECTEUR','ADMIN','COMPTABLE'] },
    { to: '/reports', label: 'Rapports', roles: ['DIRECTEUR','ADMIN','COMPTABLE'] },
    { to: '/audit', label: 'Audit', roles: ['DIRECTEUR','ADMIN','COMPTABLE'] },
    { to: '/decisions', label: 'Décisions', roles: ['DIRECTEUR','ADMIN','COMPTABLE'] },
    { to: '/settings', label: 'Paramètres', roles: ['DIRECTEUR','ADMIN'] },
    { to: '/system', label: 'Système', roles: ['DIRECTEUR','ADMIN'] },
  ]},
];

const visibleGroups = computed(() =>
  groups
    .map((g) => ({ ...g, links: g.links.filter((l) => !l.roles || l.roles.includes(auth.role)) }))
    .filter((g) => g.links.length),
);

const title = computed(() => (route.meta.title as string) ?? 'ColisGui');

const dot = '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="3" fill="currentColor"/></svg>';

async function logout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar" :class="{ open }">
      <div class="brand">
        <div class="brand-mark">C</div>
        <div class="brand-name">Colis<span>Gui</span></div>
      </div>
      <nav class="nav">
        <template v-for="g in visibleGroups" :key="g.label">
          <div class="nav-group-label">{{ g.label }}</div>
          <RouterLink
            v-for="l in g.links" :key="l.to" :to="l.to"
            class="nav-item" :class="{ active: route.path === l.to }" @click="open = false"
          >
            <span class="nav-ico" v-html="dot" />
            {{ l.label }}
          </RouterLink>
        </template>
      </nav>
      <div class="sidebar-foot">v2.0 · Console opérateur</div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="row">
          <button class="btn btn-ghost btn-sm" style="display:none" @click="open = !open">☰</button>
          <div class="topbar-title">{{ title }}</div>
        </div>
        <div v-if="auth.role !== 'LIVREUR'" class="global-search">
          <input v-model="q" class="input search-input" placeholder="Rechercher commande, partenaire, client, téléphone…" @input="onSearch" />
          <div v-if="hasResults" class="search-drop">
            <template v-if="results.commandes.length">
              <div class="search-cat">Commandes</div>
              <button v-for="c in results.commandes" :key="c.id" class="search-item" @click="go('/orders')">
                <span class="mono">{{ c.reference }}</span><span class="muted">· {{ c.clientNom }}</span>
              </button>
            </template>
            <template v-if="results.partenaires.length">
              <div class="search-cat">Partenaires</div>
              <button v-for="p in results.partenaires" :key="p.id" class="search-item" @click="go('/partners')">
                {{ p.nom }} <span class="mono muted">· {{ p.telephone }}</span>
              </button>
            </template>
            <template v-if="results.livreurs.length">
              <div class="search-cat">Livreurs</div>
              <button v-for="l in results.livreurs" :key="l.id" class="search-item" @click="go('/drivers')">
                {{ l.prenom }} {{ l.nom }} <span class="mono muted">· {{ l.telephone }}</span>
              </button>
            </template>
          </div>
        </div>
        <div class="topbar-user">
          <div class="row" style="gap:8px">
            <div class="avatar">{{ auth.initials }}</div>
            <div>
              <div style="font-weight:600">{{ auth.user?.prenom }} {{ auth.user?.nom }}</div>
              <div class="muted" style="font-size:11px">{{ auth.role }}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" @click="logout">Se déconnecter</button>
        </div>
      </header>
      <div class="content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
.global-search { position: relative; flex: 1; max-width: 440px; margin: 0 24px; }
.search-input { padding: 8px 12px; font-size: 13px; }
.search-drop {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: var(--cg-surface);
  border: 1px solid var(--cg-line); border-radius: var(--radius); box-shadow: 0 8px 28px rgba(23,19,15,0.14);
  padding: 6px; z-index: 20; max-height: 380px; overflow-y: auto;
}
.search-cat { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--cg-muted); font-weight: 600; padding: 8px 10px 4px; }
.search-item { display: block; width: 100%; text-align: left; padding: 7px 10px; border-radius: var(--radius-sm); background: transparent; border: none; font-size: 13px; color: var(--cg-text); }
.search-item:hover { background: var(--cg-surface-2); }
@media (max-width: 820px) { .global-search { display: none; } }
</style>
