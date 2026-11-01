/** Message après une réponse : l'erreur est une information, on félicite l'effort (jamais le « talent »). */
export function feedbackMessage(correct: boolean, confident: boolean | undefined): string {
  if (correct) {
    if (confident === false) return 'Bonne réponse, même en hésitant : ton effort a payé. Elle reviendra bientôt pour la fixer.'
    return 'Bonne réponse : aller la chercher dans ta mémoire la renforce.'
  }
  if (confident === true) return 'Erreur avec une forte confiance : c\'est la plus utile à corriger. Retiens bien la correction, elle reviendra.'
  return 'Se tromper ici est normal et utile : l\'effort de chercher rend la correction plus facile à retenir. Elle reviendra en révision.'
}
