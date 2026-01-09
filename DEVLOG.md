# Journal de développement

Historique chronologique des sessions et décisions.

---

## 8 janvier 2026

### Session 1 - Création du projet

**Objectif** : Remplacer le site Framer fornini.com (10€/mois) par Next.js + Sanity

**Réalisé** :
- Création projet Next.js 16 avec SSG (`output: 'export'`)
- Création dataset Sanity `fornini` (séparé de `production`)
- Schémas slideshow : `slideshow`, `slideImage`, `slideVimeo`
- Composant Slideshow avec Vimeo player (background mode)
- Déploiement Vercel (fornini-website.vercel.app)

**Problèmes rencontrés** :
- Vercel 404 → Résolu avec `vercel.json` : `framework: null`
- Protection Vercel activée → Désactivée manuellement

### Session 2 - Studio unifié

**Objectif** : Un seul Studio pour gérer les 2 sites

**Réalisé** :
- Configuration multi-workspace dans `sanity.config.ts`
- Workspace `creativeFolio` → dataset `fornini`
- Workspace `photoFolio` → dataset `production`
- Schémas photoFolio recréés (series, about, siteSettings)
- Déploiement Studio (fornini-studio.sanity.studio)

**Problèmes rencontrés** :
- ⚠️ Régression majeure : previews et orderable plugin perdus
- Cause : Copie des schémas sans les configurations complètes
- Résolution : Autre session Claude a réparé (2h de travail)

**Leçon apprise** :
> Toujours copier les schémas COMPLETS (fields + preview + plugins)

---

## À documenter pour prochaines sessions

- [ ] Intégration polices Adobe Fonts (Futura PT)
- [ ] Configuration vidéo plein écran
- [ ] Connexion domaine fornini.com
