# Roadmap - fornini.com

Plan des fonctionnalités pour le site portfolio Direction Artistique.

---

## Phase 1 : Fondations ✅

- [x] Setup Next.js 16 + Tailwind v4
- [x] Configuration Sanity (dataset `fornini`)
- [x] Schémas slideshow (slideImage, slideVimeo, slideshow)
- [x] Studio unifié (creativeFolio + photoFolio)
- [x] Déploiement Vercel (SSG)
- [x] CORS Sanity configurés

---

## Phase 2 : Slideshow (en cours)

### Vidéo
- [ ] Vidéo Vimeo plein écran (cover)
- [ ] Autoplay background (muted)
- [ ] Transitions fluides entre slides

### Images
- [ ] Images plein écran avec scale/position
- [ ] LQIP blur placeholder
- [ ] Préchargement slide suivant

### Typographie
- [ ] Intégration Futura PT (Adobe Fonts)
- [ ] Header : "Frédéric Fornini" + sous-titre
- [ ] Footer : Instagram + email
- [ ] Style mix-blend-difference

### Navigation
- [ ] Clavier : ← → Espace
- [ ] Clic : gauche=prev, droite=next
- [ ] Swipe mobile
- [ ] Barre de progression segmentée

---

## Phase 3 : Finitions

### Domaine
- [ ] Configurer DNS fornini.com → Vercel
- [ ] Certificat SSL automatique

### Automatisation
- [ ] Webhook Sanity → Vercel (rebuild auto)
- [ ] Preview deployments

### SEO
- [ ] Métadonnées Open Graph
- [ ] Favicon
- [ ] robots.txt / sitemap.xml

---

## Phase 4 : Améliorations futures

- [ ] Page contact dédiée (optionnel)
- [ ] Analytics (Vercel Analytics ou Plausible)
- [ ] Optimisation performances (Core Web Vitals)

---

## Décisions techniques

### Pourquoi SSG (Static Site Generation) ?
- Performance maximale (pages pré-générées)
- Coût nul (Vercel gratuit pour static)
- SEO optimal
- Pas besoin de serveur

### Pourquoi un Studio unifié ?
- Un seul point d'entrée pour gérer les 2 sites
- Même projet Sanity (`nbpf7c4u`)
- Économie de ressources

### Pourquoi Vimeo ?
- Vidéos déjà hébergées sur Vimeo
- API player robuste
- Background mode sans contrôles
