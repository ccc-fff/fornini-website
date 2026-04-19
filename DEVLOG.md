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

---

## 18 avril 2026

### Session — repositionnement éditorial et nouvelle direction

**Contexte** : Framer coupe le 19/04 (demain). Besoin d'une décision rapide : page de garde ou V1.

**Décisions d'architecture** :
- **Pivot de positionnement** : mise en avant conseil & direction de création. Le graphisme/DA devient la conséquence de la réflexion, plus la vitrine principale. À terme : articles, notes, tests.
- **Référence retenue** : https://piloteparis.com/ — architecture (hero scroll-driven + liste filtrable + infos), simplicité avec profondeur, chaque élément à sa place. À différencier sur trois points : liste plus texte-first, menu plus riche, mécanique hero twistée.

**Arbitrages ouverts** (à trancher en session suivante) :
- Menu A (Projets · Écrits · À propos) ou B (Travaux · Pensées)
- Fond noir (actuel) ou clair (comme pilote, plus lisible texte)
- Mécanique hero parmi 5 pistes : scroll horizontal détourné, mask reveal, zoom-through, split layers, hybride typo+image (5 favorite pour l'alignement éditorial)

**Actions en cours** :
- Test de Claude Design (research preview Anthropic Labs, sorti 17/04) pour prototyper l'architecture à partir du repo existant.

**Organisation repo** :
- Déplacé de `ChamberOfThoughts/library/_workshop/fornini-website/` vers `~/Code/Fornini-Creative/` (hors Dropbox). Stub README dans CoT.
- 2 commits locaux non pushés conservés (docs + photoFolio workspace orderable).

**Écart code ↔ vision** :
- Code actuel = slideshow plein écran unique. Vision = hero scroll-driven + liste projets en dessous + infos + footer.
- Manque : schéma Sanity `project` + `category`, page liste, filtres sticky, menu ouvrable.
- Le slideshow existant peut rester comme base du hero ; il faudra le transformer en scroll-driven et ajouter une section liste en dessous.

**Plan court terme** :
1. Décider page de garde minimale vs V1 direct (urgence demain)
2. Si page de garde : remplacer `page.tsx` par nom + sous-titre + email, deploy Vercel, DNS fornini.com → Vercel
3. V1 : après arbitrages menu/fond/slideshow
