# JD TV Playout

MVP local de programmation TV 24/7 pilotant CasparCG.

## Objectif

Construire une petite régie logicielle capable de :

- gérer une bibliothèque de médias ;
- préparer une grille de diffusion ;
- afficher le programme à l’antenne et le suivant ;
- envoyer des commandes AMCP à CasparCG sur `localhost:5250` ;
- préparer ensuite les jingles automatiques, les directs et la diffusion 24/7.

## Phase 1

La première version fonctionne en local sur Windows avec CasparCG 2.5.0.

Architecture :

```text
Interface web locale
      |
      v
Agent Node.js local
      |
      v
CasparCG :5250
```

## Démarrage

1. Installer Node.js 20+.
2. Cloner le dépôt.
3. Lancer `npm install`.
4. Démarrer CasparCG.
5. Lancer `npm run dev`.
6. Ouvrir `http://localhost:3000`.

## Commandes CasparCG testées

```text
PLAY 1-1 PROGRAMME1
LOADBG 1-1 JINGLE AUTO
```

Le serveur Node se connecte à CasparCG via TCP et envoie les commandes AMCP.
