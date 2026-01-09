# Instructions pour Claude

Ce fichier contient les instructions à suivre pour toute session Claude travaillant sur ce projet.

---

## Règle d'or

> **"Lire avant d'écrire, planifier avant d'exécuter, committer avant de déployer"**

---

## Checklist obligatoire

### AVANT toute modification

1. **Lire ce fichier** (CLAUDE.md)
2. **Lire DEVLOG.md** pour le contexte récent
3. **`git status`** - Vérifier l'état du repo
4. **Lire les fichiers concernés** avant de modifier
5. **Proposer un plan** et ATTENDRE validation
6. **`git add . && git commit -m "avant: description"`** si nécessaire

### APRÈS modification

7. **Tester localement** (`npm run build` ou `npm run dev`)
8. **`git add . && git commit -m "feat/fix: description"`**
9. **Déployer** seulement si les tests passent

---

## Pièges à éviter

### 1. Modifier sans lire
```
❌ "Je vais créer X"
✅ "Je lis d'abord l'existant, puis je propose un plan"
```

### 2. Déployer sans tester
```
❌ npx sanity deploy (direct)
✅ npx sanity dev → vérifier → npx sanity deploy
```

### 3. Sessions parallèles
```
❌ Deux sessions Claude sur le même projet
✅ Une session à la fois
```

### 4. Oublier les previews/plugins
```
❌ Copier juste les fields d'un schéma
✅ Copier fields + preview + options
```

---

## Structure du projet

```
fornini-website/
├── src/app/page.tsx              # Page principale (slideshow)
├── src/components/Slideshow/     # Composants slideshow
├── src/sanity/schemaTypes/       # Schémas Sanity
│   ├── index.ts                  # creativeFolio (fornini.com)
│   └── photoFolio/               # photoFolio (fredericfornini.com)
├── sanity.config.ts              # Config workspaces (CRITIQUE)
└── vercel.json                   # Config déploiement
```

---

## Fichiers critiques

| Fichier | Impact | Attention |
|---------|--------|-----------|
| `sanity.config.ts` | Workspaces Studio | Affecte les 2 sites |
| `src/sanity/schemaTypes/photoFolio/*` | Site photo | Ne pas casser les previews |
| `vercel.json` | Déploiement | `framework: null` pour SSG |
| `next.config.ts` | Build | `output: 'export'` requis |

---

## Commandes utiles

```bash
# Développement
npm run dev              # Site localhost:3000
npx sanity dev           # Studio localhost:3333

# Build
npm run build            # Build statique

# Déploiement
npx vercel --prod        # Site
npx sanity deploy        # Studio

# Git
git status               # État
git log --oneline -5     # Historique
git diff                 # Changements
```

---

## En cas de problème

```bash
# 1. Ne pas paniquer
# 2. Vérifier l'état Git
git log --oneline -5
git status

# 3. Revenir à un état stable
git reset --hard HEAD~1  # Annuler dernier commit
# ou
git checkout -- .        # Annuler changements non commités

# 4. Prévenir l'utilisateur
```

---

## Communication

### Si tu ne sais pas
```
❌ "Je vais faire X"
✅ "Je vois qu'il y a Y. Tu veux que je modifie Y ou crée X ?"
```

### Avant une grosse modif
```
❌ *Fait directement*
✅ "Voici mon plan : [...]. OK ?"
```

### Si c'est risqué
```
❌ "OK je fais"
✅ "Attention, ça peut casser X. Alternative : Y. On continue ?"
```
