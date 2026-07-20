<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from '../stores/auth';
import { apiError } from '../api/client';

const router = useRouter();
const route = useRoute();
const auth = useAuth();

const identifiant = ref('627159898');
const password = ref('Admin@2026');
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(identifiant.value, password.value);
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  } catch (e) {
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <div class="login-brand">
      <div class="lb-inner">
        <div class="lb-mark">C</div>
        <h1 class="lb-name">Colis<span>Gui</span></h1>
        <p class="lb-tag">Vous vendez, nous livrons.</p>
        <div class="lb-flow">
          <span>Réception</span><i>→</i><span>Stockage</span><i>→</i><span>Livraison</span><i>→</i><span>Suivi</span>
        </div>
      </div>
      <div class="lb-foot mono">Conakry · Dubréka · Coyah</div>
    </div>

    <div class="login-form">
      <div class="lf-card">
        <div class="page-eyebrow">Console opérateur</div>
        <h2 class="lf-title">Connexion</h2>
        <p class="page-sub" style="margin-bottom:22px">Accédez à votre espace de gestion.</p>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="submit">
          <div class="field">
            <label>Téléphone ou email</label>
            <input v-model="identifiant" class="input" autocomplete="username" placeholder="627 15 98 98" />
          </div>
          <div class="field">
            <label>Mot de passe</label>
            <input v-model="password" type="password" class="input" autocomplete="current-password" placeholder="••••••••" />
          </div>
          <button class="btn btn-primary" style="width:100%; justify-content:center; margin-top:6px" :disabled="loading">
            {{ loading ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login { display: grid; grid-template-columns: 1.1fr 1fr; min-height: 100vh; }
.login-brand {
  background: var(--cg-ink); color: #fff; padding: 48px; display: flex; flex-direction: column; justify-content: space-between;
  background-image: radial-gradient(circle at 80% 20%, rgba(242,106,31,0.22), transparent 45%);
}
.lb-inner { margin-top: auto; margin-bottom: auto; }
.lb-mark { width: 54px; height: 54px; border-radius: 14px; background: var(--cg-orange); display: grid; place-items: center; font-family: var(--font-display); font-weight: 700; font-size: 30px; }
.lb-name { font-size: 44px; font-weight: 700; margin-top: 26px; letter-spacing: -0.03em; }
.lb-name span { color: var(--cg-orange); }
.lb-tag { font-size: 18px; color: #c7c2bc; margin-top: 8px; }
.lb-flow { display: flex; align-items: center; gap: 10px; margin-top: 40px; flex-wrap: wrap; }
.lb-flow span { font-size: 12.5px; font-weight: 600; padding: 6px 12px; border: 1px solid rgba(255,255,255,0.16); border-radius: 999px; }
.lb-flow i { color: var(--cg-orange); font-style: normal; }
.lb-foot { color: #8a847d; font-size: 12px; letter-spacing: 0.05em; }
.login-form { display: grid; place-items: center; padding: 24px; }
.lf-card { width: 100%; max-width: 380px; }
.lf-title { font-size: 30px; font-weight: 700; margin-top: 2px; }
@media (max-width: 820px) { .login { grid-template-columns: 1fr; } .login-brand { display: none; } }
</style>
