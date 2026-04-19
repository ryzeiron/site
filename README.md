# Boutique Pokemon

Site e-commerce pour vente de cartes Pokemon (micro-entreprise), construit avec Next.js 15, TypeScript, Tailwind et Stripe Checkout.

## Fonctionnalites

- Catalogue organise par **blocs** (ex: Ecarlate et Violet, Epee et Bouclier, Soleil et Lune...)
- Chaque bloc contient plusieurs **series** (ex: EV01, EV02, ... EV9)
- Chaque serie liste ses **cartes** avec prix, etat, edition
- **Panier** persistant (localStorage)
- **Paiement en ligne** via Stripe Checkout
- Pages legales (mentions legales, CGV, contact)

## Demarrage

```bash
npm install
cp .env.example .env.local
# edite .env.local et ajoute tes cles Stripe
npm run dev
```

Ouvre http://localhost:3000

## Ajouter / modifier le catalogue

Toute la donnee est dans `lib/catalog.ts`. Tu peux :

1. Ajouter un nouveau **bloc** dans `BLOCS`
2. Ajouter une **serie** dans `SERIES` (liee a un bloc via `blocId`)
3. Ajouter des **cartes** dans `CARDS` (liees a une serie via `serieId`)

Les prix sont en centimes (ex: `1500` = 15,00 euros).

## Deploiement

Recommande : [Vercel](https://vercel.com). Ajoute les variables d'environnement du `.env.example` dans le dashboard Vercel.

Pour que Stripe fonctionne en production, mets :
- `STRIPE_SECRET_KEY` = cle `sk_live_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = cle `pk_live_...`
- `NEXT_PUBLIC_SITE_URL` = URL publique du site (ex: `https://mon-site.fr`)

## Structure

```
app/
  page.tsx                        # Accueil
  blocs/
    page.tsx                      # Liste des blocs
    [bloc]/
      page.tsx                    # Liste des series d'un bloc
      [serie]/
        page.tsx                  # Liste des cartes d'une serie
  carte/[id]/page.tsx             # Fiche carte
  panier/page.tsx                 # Panier
  api/checkout/route.ts           # Cree la session Stripe Checkout
  succes/, annule/                # Pages post-paiement
  mentions-legales/, cgv/, contact/
lib/
  catalog.ts                      # Donnees catalogue (a editer)
  cart.ts                         # Store panier (Zustand)
  stripe.ts                       # Client Stripe
  format.ts                       # Formatage prix
components/
  Header.tsx, Footer.tsx, CartButton.tsx, AddToCartButton.tsx
  BlocTile.tsx, SerieTile.tsx, CardTile.tsx
```
