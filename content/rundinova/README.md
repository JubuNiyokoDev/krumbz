# Textes du site Rundinova Studio (isoko.rundinova.com)

Un fichier par langue : `fr.json` (référence), `rn.json` (kirundi), `en.json` (anglais), `sw.json` (swahili).
Chargés par `src/marketing/content.ts` (`getMarketingContent(locale)`).

- **Le français fait foi.** Toute clé absente ou vide dans une autre langue retombe sur le français :
  on peut ajouter une clé dans `fr.json` sans casser les autres langues.
- **Les prix ne sont pas ici.** Ils viennent des réglages de l'offre (super-admin) et sont insérés à l'affichage
  à la place de `{launch}` et `{monthly}`, formatés selon la langue (`50 000 FBu` en fr/rn, `50,000 FBu` en en/sw).
- Autres variables : `{name}` (nom d'une boutique), `{year}` (pied de page).
- Aucun chiffre, avis ou témoignage inventé : n'en ajouter que s'ils sont réels et vérifiables.

## À relire par des locuteurs natifs (obligatoire avant la mise en ligne)

| Langue | Statut | Points à valider en priorité |
| --- | --- | --- |
| Kirundi (`rn.json`) | Premier jet, **non relu** | Le terme « icerekaniro » pour « vitrine », le ton des boutons (« Ndashaka icerekaniro canje », bouton court « Icerekaniro »), les messages d'erreur du formulaire |
| Swahili (`sw.json`) | Premier jet, **non relu** | « tovuti » pour « vitrine », le bouton court « Anza sasa », le choix entre swahili d'Afrique de l'Est standard et usages du Burundi |
| Anglais (`en.json`) | Traduit | — |

Garder des phrases **courtes et naturelles** : ce sont des textes de site, pas des traductions mot à mot.
Les libellés des boutons du menu doivent rester courts (le bouton court du menu doit tenir sur un écran de 360 px).
