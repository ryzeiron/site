# Mise en place de la base de donnees + admin

Ce document explique la proecedure UNIQUE a faire apres avoir tire ce code.
A faire dans cet ordre :

## 1. Creer la base Vercel Postgres

1. Va sur https://vercel.com/dashboard
2. Selectionne ton projet PokeDel
3. Onglet **Storage** -> **Create Database** -> **Postgres**
4. Nom libre (par exemple `pokedel-db`), region `Europe (Paris)` ou `Frankfurt`
5. Clic sur **Create** puis **Connect** au projet PokeDel

Vercel ajoute automatiquement les variables d'environnement suivantes :
`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_USER`, `POSTGRES_HOST`,
`POSTGRES_PASSWORD`, `POSTGRES_DATABASE`.

## 2. Ajouter le mot de passe admin

Toujours dans Vercel -> Settings -> Environment Variables, ajoute :

```
ADMIN_PASSWORD=<ton mot de passe, exemple: 'RyzMot2Passe!'>
```

Applique a Production, Preview, Development.

## 3. Pull les variables en local

Dans ton terminal, a la racine du projet :

```bash
npx vercel link
npx vercel env pull .env.local
```

Ca cree (ou met a jour) `.env.local` avec toutes les variables (inclus POSTGRES_URL
et ADMIN_PASSWORD). Ce fichier est git-ignore.

## 4. Creer la table "cards" dans la base

```bash
npx drizzle-kit push
```

Repond `Yes` si Drizzle demande de creer la table.

## 5. Remplir la base avec les cartes existantes

```bash
npx tsx scripts/seed.ts
```

Le script lit `lib/catalog.ts` et insere les ~3200 cartes. Si tu le relances plus
tard, il ne touche PAS aux cartes deja en base (tes modifs stock/prix sont
preservees).

## 6. Redeployer sur Vercel

```bash
git push
```

Vercel redeploie avec les nouvelles variables.

## 7. Tester l'admin

Va sur `https://ton-site.vercel.app/admin/login`, entre ton `ADMIN_PASSWORD`,
puis tu peux editer stock / prix / rarete de chaque carte.

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npx drizzle-kit push` | Sync le schema TS vers la base |
| `npx drizzle-kit studio` | Interface web pour inspecter la base |
| `npx tsx scripts/seed.ts` | Re-importe les cartes manquantes depuis catalog.ts |

## Rollback

Tu veux revenir en arriere ?

- **Rapide** : Vercel -> Deployments -> redeploy un ancien deploiement (avant BDD)
- **Propre** : `git revert <commit-hash>` et push

La base de donnees reste en place meme apres un rollback — tu peux la
supprimer depuis le dashboard Vercel si tu veux t'en debarrasser completement.
