# fornini-website

Site portfolio Direction Artistique de Frédéric Fornini + Studio Sanity unifié.

## Architecture

Ce repo contient :
1. **Site fornini.com** - Slideshow Next.js (Direction Créative / DA)
2. **Studio Sanity unifié** - Gère les 2 sites (photoFolio + creativeFolio)

## URLs

| Service | URL |
|---------|-----|
| Site DA (preview) | https://fornini-website.vercel.app |
| Site DA (prod) | https://fornini.com *(à configurer)* |
| Studio Sanity | https://fornini-studio.sanity.studio |
| Site Photo | https://fredericfornini.com |

## Stack

- **Framework** : Next.js 16 (App Router, SSG)
- **CMS** : Sanity v3
- **Styling** : Tailwind CSS v4
- **Vidéo** : @vimeo/player
- **Hébergement** : Vercel (static export)

## Sanity

**Project ID** : `nbpf7c4u`

| Workspace | Dataset | Site |
|-----------|---------|------|
| creativeFolio | `fornini` | fornini.com |
| photoFolio | `production` | fredericfornini.com |

## Commandes

```bash
# Développement
npm run dev          # Site sur localhost:3000
npx sanity dev       # Studio sur localhost:3333

# Build & Test
npm run build        # Build statique (output: out/)

# Déploiement
npx vercel --prod    # Site sur Vercel
npx sanity deploy    # Studio sur sanity.studio
```

## Structure

```
fornini-website/
├── src/
│   ├── app/                    # Pages Next.js
│   ├── components/
│   │   └── Slideshow/          # Composants slideshow
│   └── sanity/
│       ├── lib/                # Client, queries, image helper
│       └── schemaTypes/
│           ├── index.ts        # Schémas creativeFolio
│           └── photoFolio/     # Schémas photoFolio
├── sanity.config.ts            # Config workspaces
├── sanity.cli.ts               # Config CLI Sanity
├── next.config.ts              # Config Next.js (SSG)
└── vercel.json                 # Config Vercel
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Instructions pour sessions Claude
- [DEVLOG.md](./DEVLOG.md) - Journal de développement
- [ROADMAP.md](./ROADMAP.md) - Plan des fonctionnalités
