import { Logger } from '@nestjs/common';

const logger = new Logger('Config');

/**
 * Valide la configuration au démarrage. En production, l'absence d'un secret
 * critique fait échouer le démarrage (fail-fast) plutôt que d'utiliser une
 * valeur par défaut dangereuse.
 */
export function validateEnv() {
  const prod = process.env.NODE_ENV === 'production';
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((k) => !process.env[k]);

  const weak = ['JWT_SECRET', 'JWT_REFRESH_SECRET'].filter(
    (k) => (process.env[k] ?? '').startsWith('change-me'),
  );

  if (prod && missing.length) {
    throw new Error(`Variables d'environnement manquantes en production : ${missing.join(', ')}`);
  }
  if (prod && weak.length) {
    throw new Error(`Secrets par défaut interdits en production : ${weak.join(', ')}`);
  }
  // Cookies d'authentification (credentials) => CORS ne doit pas être ouvert en production.
  const cors = process.env.CORS_ORIGINS ?? '*';
  if (prod && cors.split(',').map((s) => s.trim()).includes('*')) {
    throw new Error("CORS_ORIGINS ne peut pas valoir '*' en production (cookies d'authentification). Indiquez les domaines autorisés.");
  }
  if (!prod && (missing.length || weak.length)) {
    logger.warn(`Configuration de développement : ${[...missing, ...weak].join(', ')} à définir avant la prod.`);
  }
}
