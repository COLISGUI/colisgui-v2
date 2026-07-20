import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { getAccess } from '../api/client';

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Tableau de bord' } },
      { path: 'director', name: 'director', component: () => import('../views/DirectorView.vue'), meta: { title: 'Tableau de bord Directeur' } },
      { path: 'orders', name: 'orders', component: () => import('../views/OrdersView.vue'), meta: { title: 'Commandes' } },
      { path: 'call-center', name: 'call-center', component: () => import('../views/CallCenterView.vue'), meta: { title: 'Call Center' } },
      { path: 'dispatch', name: 'dispatch', component: () => import('../views/DispatchView.vue'), meta: { title: 'Dispatch' } },
      { path: 'partners', name: 'partners', component: () => import('../views/PartnersView.vue'), meta: { title: 'Partenaires' } },
      { path: 'subscriptions', name: 'subscriptions', component: () => import('../views/SubscriptionsView.vue'), meta: { title: 'Abonnements' } },
      { path: 'pricing', name: 'pricing', component: () => import('../views/PricingView.vue'), meta: { title: 'Grille tarifaire' } },
      { path: 'drivers', name: 'drivers', component: () => import('../views/DriversView.vue'), meta: { title: 'Livreurs' } },
      { path: 'accounting', name: 'accounting', component: () => import('../views/AccountingView.vue'), meta: { title: 'Comptabilité' } },
      { path: 'reports', name: 'reports', component: () => import('../views/ReportsView.vue'), meta: { title: 'Rapports' } },
      { path: 'audit', name: 'audit', component: () => import('../views/AuditView.vue'), meta: { title: 'Audit' } },
      { path: 'decisions', name: 'decisions', component: () => import('../views/DecisionsView.vue'), meta: { title: 'Journal des décisions' } },
      { path: 'settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: 'Paramètres' } },
      { path: 'system', name: 'system', component: () => import('../views/SystemHealthView.vue'), meta: { title: 'Santé du système' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  const authed = !!getAccess();
  if (!to.meta.public && !authed) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && authed) return { name: 'dashboard' };
  return true;
});

export default router;
