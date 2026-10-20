# SamBoat — Tirage de destination

Maquette de concept (projet de cours) : l'écran tactile d'une box SamBoat, fixé au-dessus d'un gouvernail, qui tire une destination au sort.

## Ce que fait la maquette

- 10 destinations, une par branche du gouvernail : Corsica, La Rochelle, Arcachon, Marseille, Lake Annecy, Croatia, Greece, Majorca, Sicily, Malta.
- `Espace` ou `Entrée` fait tourner le gouvernail (plus tard, ce sera le vrai gouvernail). La caméra zoome sur la destination tirée : photo en plein écran, nom au centre. Un nouvel appui revient au gouvernail, la destination tirée en part, et la roue repart.
- Deux lancers, deux destinations différentes. Ensuite une question (« Qu'est-ce que la liberté pour vous ? »), puis le concours (15 % de remise pour un seul gagnant) avec l'email.
- `Échap` remet tout à zéro. Rien n'est stocké ni envoyé : la réponse et l'email restent en mémoire.

## Lancer en local

```bash
cd tirage-destination
python3 -m http.server 8765
```

Puis ouvrir <http://localhost:8765>. Il faut passer par un serveur local, ouvrir `index.html` d'un double-clic n'est pas prévu.

## Attention : polices, images et marque

- **Police The Seasons** : c'est une police commerciale. Les fichiers de `tirage-destination/fonts/` sont présents uniquement pour ce projet de cours, ils ne sont pas sous licence libre. Avant tout usage hors cadre scolaire (site en ligne, démonstration commerciale), il faut acheter la licence ou remplacer la police.
- **Photos** : extraites du PDF « GROUPE 9 - WORKSHOP SAMBOAT ». Les droits appartiennent à leurs auteurs, usage pédagogique uniquement.
- **Nom et logo SamBoat** : marque de SamBoat. Ce projet est une maquette d'étudiants, sans lien officiel avec l'entreprise.
