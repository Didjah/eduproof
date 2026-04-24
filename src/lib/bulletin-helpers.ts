export function formaterNote(note: number | null, noteSur: number): string {
  if (note === null) return '—'
  return `${note.toFixed(2)}/${noteSur}`
}

export function calculerMoyenneClasse(
  tousLesEleves: Array<{
    notesParMatiere: Array<{ matiere: { id: string }; moyenne: number | null }>
  }>,
  matiereId: string
): number | null {
  const moyennes = tousLesEleves
    .map(e => e.notesParMatiere.find(n => n.matiere.id === matiereId)?.moyenne ?? null)
    .filter((m): m is number => m !== null)
  if (moyennes.length === 0) return null
  return moyennes.reduce((s, v) => s + v, 0) / moyennes.length
}
