# Roadmap — fornini.com

Site de Frédéric Fornini — pivot vers **conseil & direction de création**, avec DA/graphisme en conséquence de la réflexion.

---

## Positionnement

Pas un folio visuel classique. Mettre en avant la réflexion et le conseil, le graphisme devient la conséquence. À terme : articles, réflexions, notes, tests.

**Référence architecturale** : https://piloteparis.com/
- Hero slideshow scroll-driven (images qui avancent au scroll, les unes derrière les autres)
- Liste projets filtrable (filtres sticky en haut)
- Infos séparées (texte descriptif studio)
- Simplicité avec vraie profondeur — chaque élément à sa place

**Ce qu'on reprend** : la structure (hero + liste + infos), le filtrage sticky, la sobriété.
**Ce qu'on différencie** :
- Liste plus texte-first (nom + type d'intervention) vs grille-visuelle-first de pilote. Vignette en hover, pas par défaut.
- Menu plus riche que le binaire Projets/Infos de pilote, pour ouvrir l'espace éditorial.
- Mécanique slideshow à twister (sans copier le scroll-driven de pilote).

---

## Urgence — Framer coupe le 19 avril 2026

Le site Framer fornini.com (10 €/mois) est résilié automatiquement demain. Deux options, non exclusives :

1. **Page de garde immédiate** (avant 19/04) : nom + sous-titre + email. Déploiement Vercel + DNS fornini.com.
2. **V1 minimale** (quelques jours) : hero + liste projets hardcodée en TSX + footer. Sanity branché plus tard.

Test en cours avec **Claude Design** (research preview Anthropic Labs, sorti 17/04) pour prototyper rapidement l'architecture.

---

## Phase 1 — Fondations ✅ (janvier 2026)

- [x] Setup Next.js 16 + Tailwind v4 + SSG (`output: 'export'`)
- [x] Sanity dataset `fornini` + schémas slideshow (slideImage, slideVimeo, slideshow)
- [x] Studio unifié (creativeFolio + photoFolio) sur fornini-studio.sanity.studio
- [x] Déploiement Vercel (fornini-website.vercel.app)
- [x] CORS Sanity
- [x] Header fixe (nom + sous-titre) + Footer fixe (Instagram + email) en mix-blend-difference

## Phase 2 — Structure site pivot (en cours)

### Arbitrages à trancher (session du jour, 18/04/2026)
- [ ] **Menu** : A = `Projets · Écrits · À propos` (trois entrées lisibles) ou B = `Travaux · Pensées` (deux entrées affirmées qui ne séparent pas l'acte et la pensée)
- [ ] **Fond** : noir actuel (#0d0d0d) vs clair comme piloteparis (plus lisible pour le texte éditorial)
- [ ] **Mécanique hero slideshow** : parmi 5 pistes — scroll horizontal détourné, mask reveal, zoom-through, split layers parallaxe, hybride typo + image. La 5 s'aligne le mieux avec le pivot éditorial (texte comme matière équivalente à l'image).

### Hero
- [ ] Slideshow scroll-driven ou autre mécanique validée
- [ ] Transitions fluides
- [ ] Typo Futura PT (Adobe Fonts) à confirmer

### Liste projets
- [ ] Schéma Sanity `project` (nom, type d'intervention, année, URL, catégories, slideshow projet à terme)
- [ ] Schéma Sanity `category` (branding, identité visuelle, direction artistique, digital, editorial, signalétique, etc. — à préciser)
- [ ] Liste texte-first (nom + type + année)
- [ ] Filtres sticky par catégorie en haut de liste
- [ ] Vignette en hover (phase 2b)
- [ ] Clic projet → slideshow images (phase 2b, pas nécessaire V1)

### Navigation
- [ ] Menu en haut selon arbitrage A ou B
- [ ] Clavier : ← → Espace pour le slideshow
- [ ] Swipe mobile

### À propos / Infos
- [ ] Bio + méthode + contact
- [ ] Selon menu retenu, fusion ou séparation avec Projets

## Phase 3 — Domaine et publication
- [ ] DNS fornini.com → Vercel (SSL auto)
- [ ] Webhook Sanity → Vercel (rebuild auto)
- [ ] Preview deployments
- [ ] SEO : OG, favicon, sitemap.xml, robots.txt

## Phase 4 — Extension éditoriale
- [ ] Schéma Sanity `article` (écrits, réflexions, notes, tests)
- [ ] Page liste des écrits + page article
- [ ] Lien footer vers écrits
- [ ] Analytics (Vercel Analytics ou Plausible)

---

## Décisions techniques

### SSG (Static Site Generation)
Performance max, coût nul (Vercel gratuit), SEO optimal, pas de serveur.

### Studio unifié
Un seul point d'entrée pour les 2 sites Fornini (DA + photo). Même projet Sanity (`nbpf7c4u`). Économie de ressources.

### Vimeo pour les vidéos
API player robuste, background mode sans contrôles, vidéos déjà hébergées.

---

## Contraintes et vigilances

- **Obsidian / Dropbox** : ce projet vit désormais dans `~/Code/Fornini-Creative/` (hors vault), le cadrage reste dans `CoT/library/_workshop/fornini-website/README.md` (stub pointeur).
- **Copier schémas complets** (fields + preview + plugins) — leçon de la régression 8/01/2026 qui avait pris 2h à réparer.
- **Tester avant deploy** : `npm run build` ou `npm run dev` localement, puis `npx vercel --prod`.
- **2 commits locaux non pushés** avant de repartir sur du travail : docs + photoFolio workspace avec orderable plugin.
