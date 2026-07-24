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
    logger.error('==================================================');
    logger.error("DÉMARRAGE IMPOSSIBLE — variables d'environnement manquantes :");
    missing.forEach((k) => logger.error(`   • ${k}`));
    logger.error('Ajoutez-les dans Railway → service API → onglet Variables.');
    logger.error('==================================================');
    throw new Error(`Variables manquantes : ${missing.join(', ')}`);
  }
  if (prod && weak.length) {
    logger.error('==================================================');
    logger.error('DÉMARRAGE IMPOSSIBLE — secrets encore à leur valeur par défaut :');
    weak.forEach((k) => logger.error(`   • ${k}`));
    logger.error('Générez une valeur aléatoire (openssl rand -hex 48).');
    logger.error('==================================================');
    throw new Error(`Secrets par défaut interdits : ${weak.join(', ')}`);
  }
  // Cookies d'authentification (credentials) => CORS ne doit pas être ouvert en production.
  const cors = process.env.CORS_ORIGINS ?? '*';
  // '*' est toléré (avertissement) : il permet de débloquer un déploiement,
  // mais doit être remplacé par la liste des domaines une fois la connexion validée.
  if (prod && cors.split(',').map((s) => s.trim()).includes('*')) {
    logger.warn("CORS_ORIGINS='*' : toutes les origines sont acceptées. A restreindre apres validation.");
  }
  if (!prod && (missing.length || weak.length)) {
    logger.warn(`Configuration de développement : ${[...missing, ...weak].join(', ')} à définir avant la prod.`);
  }
}
