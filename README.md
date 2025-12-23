# Frontend:

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```
npx create-next-app@latest jobelix
cd jobelix
npm run dev
npm i @supabase/supabase-js
```

Test

# Backend: 

## Etapes setup: 
- Installer docker (https://www.docker.com/products/docker-desktop/)
- Installer supabase CLI (Via poweshell pour Windows)
- supabase link --project-ref project_id_sur_supabase (après login et init)
- 'supabase start' permet de lancer le client supabase sur: http://localhost:54323


## Commandes supabase utiles:
### Lancement env et arret
Commandes:
supabase start -> lance le venv (il faut que docker soit activé)
supabase stop -> stop le venv (pas besoin de le stop normalement il consomme pas trop)
supabase stop --no-backup -> reset le venv à la dernière migration (supprime les nouvelles tables/fonctions/trigers)

### Sauvegarde, pull et pushs - DB:
Commandes:
supabase db pull -> recupére ce qui est sur le site (s'il y a eu des migration faites directement dessus)
supabase db reset -> update la db supabase après une migration (supprime toutes les mocks datas. Voir plus bas pour les sauvegarder)
supabase db diff --use-migra -f nom_de_la_migration -> rajoute le code EQL entre l'ancienne version et la nouvelle. 
supabase db push -> update la version du site web. 

### A propos des mocks datas:
Les mocks datas sont regénérés à partir du fichier seed.sql. Si on veut extraire des vrais datas, on peut le faire depuis un csv téléchargeable sur le site supabase.com

Commande:
supabase db dump --local --data-only > supabase/nom.sql -> Permet de sauvegarder les données actuelles dans le fichier "nom.sql" (comme ca elles sont sauvegardées quelquepart avant un reset)


Remarque: Si le seed.sql ne marche pas à cause du auth, on peut rajouter les lignes de la table auth à la main:
"""
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES 
  ('le-uuid-que-tu-utilises-dans-students', 'moi@test.com', crypt('password123', gen_salt('bf')), now())
ON CONFLICT (id) DO NOTHING;
"""
