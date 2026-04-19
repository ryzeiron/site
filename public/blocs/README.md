# Dossier des images de blocs

Mets ici les images de fond des blocs (formats : **.jpg**, **.png**, **.webp**).

## Exemple

1. Tu deposes une image : `public/blocs/ecarlate-et-violet.jpg`
2. Dans `lib/catalog.ts`, dans l'objet du bloc, tu mets :
   ```
   image: "/blocs/ecarlate-et-violet.jpg",
   ```

Le chemin commence par `/blocs/` (sans `public/` devant).

## Conseils

- Nom de fichier sans accents ni espaces : utilise des tirets.
- Format paysage recommande, au moins 1000 pixels de large.
- L'image sera automatiquement assombrie pour que le texte reste lisible.
- Si tu ne mets pas d'image, le degrade de couleur s'affiche a la place.
