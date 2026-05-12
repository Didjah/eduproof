'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

/* ── Types ─────────────────────────────────────────────────────────── */
type CurrentUser = { id: string; nom: string; prenom: string; role: string }
type Classe      = { id: string; nom: string }
type Matiere     = { id: string; nom: string; coefficient: number }
type Etudiant    = { id: string; nom: string; prenom: string }
type EvalCell    = { existingId: string | null; note: string; commentaire: string }
type EvalGrid    = Record<string, EvalCell>
type RawProfMat  = { matiere_id: string }
type RawNote     = { id: string; etudiant_id: string; valeur: number; commentaire: string | null }

const TYPES_EVAL = ['devoir', 'interrogation', 'examen'] as const
type TypeEval = typeof TYPES_EVAL[number]

const TYPE_LABELS: Record<TypeEval, string> = {
  devoir:        'Devoir',
  interrogation: 'Interrogation',
  examen:        'Examen',
}

const TYPE_COLORS: Record<TypeEval, string> = {
  devoir:        'bg-blue-100 text-blue-700',
  interrogation: 'bg-purple-100 text-purple-700',
  examen:        'bg-orange-100 text-orange-700',
}

function emptyCell(): EvalCell {
  return { existingId: null, note: '', commentaire: '' }
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function EvaluationsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [accesRefuse, setAccesRefuse]  = useState(false)

  const [classes,   setClasses]   = useState<Classe[]>([])
  const [matieres,  setMatieres]  = useState<Matiere[]>([])
  const [etudiants, setEtudiants] = useState<Etudiant[]>([])
  const [grid,      setGrid]      = useState<EvalGrid>({})

  const [selectedClasseId,  setSelectedClasseId]  = useState('')
  const [selectedMatiereId, setSelectedMatiereId] = useState('')
  const [selectedType,      setSelectedType]      = useState<TypeEval>('devoir')
  const [selectedDate,      setSelectedDate]      = useState(new Date().toISOString().split('T')[0])
  const [intitule,          setIntitule]          = useState('')

  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [noMatiere, setNoMatiere] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  /* ── Auth ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || !['admin', 'prof'].includes(u.role)) {
        setAccesRefuse(true)
      } else {
        setCurrentUser({ id: u.id, nom: u.nom, prenom: u.prenom, role: u.role })
      }
    } catch { setAccesRefuse(true) }
  }, [])

  /* ── Classes ── */
  useEffect(() => {
    supabase.from('classes').select('id,nom').order('nom').then(({ data }) => setClasses(data || []))
  }, [])

  /* ── Matières filtrées selon rôle ── */
  useEffect(() => {
    if (!selectedClasseId || !currentUser) { setMatieres([]); setNoMatiere(false); return }
    setNoMatiere(false)
    setSelectedMatiereId('')

    if (currentUser.role === 'admin') {
      supabase.from('matieres').select('id,nom,coefficient').order('nom')
        .then(({ data }) => setMatieres(data || []))
    } else {
      supabase.from('prof_matieres').select('matiere_id').eq('prof_id', currentUser.id)
        .then(({ data: pm }) => {
          const ids = (pm as RawProfMat[] | null || []).map(r => r.matiere_id)
          if (ids.length === 0) { setMatieres([]); setNoMatiere(true); return }
          supabase.from('matieres').select('id,nom,coefficient').in('id', ids).order('nom')
            .then(({ data }) => {
              setMatieres(data || [])
              if (!data || data.length === 0) setNoMatiere(true)
            })
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClasseId, currentUser?.id, currentUser?.role])

  /* ── Grille (élèves + notes existantes) ── */
  useEffect(() => {
    if (!selectedClasseId || !selectedMatiereId) { setEtudiants([]); setGrid({}); return }
    setLoading(true)
    Promise.all([
      supabase.from('etudiants').select('id,nom,prenom').eq('classe_id', selectedClasseId).order('nom'),
      supabase.from('notes')
        .select('id,etudiant_id,valeur,commentaire')
        .eq('matiere_id', selectedMatiereId)
        .eq('type_eval', selectedType)
        .eq('date', selectedDate),
    ]).then(([etRes, noteRes]) => {
      const ets = (etRes.data || []) as Etudiant[]
      setEtudiants(ets)

      const newGrid: EvalGrid = {}
      for (const e of ets) newGrid[e.id] = emptyCell()
      for (const n of (noteRes.data || []) as RawNote[]) {
        if (!newGrid[n.etudiant_id]) continue
        newGrid[n.etudiant_id] = {
          existingId: n.id,
          note: String(n.valeur),
          commentaire: n.commentaire || '',
        }
      }
      setGrid(newGrid)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClasseId, selectedMatiereId, selectedType, selectedDate])

  /* ── Mise à jour cellule ── */
  function updateNote(etudiantId: string, raw: string) {
    if (raw !== '') {
      const n = parseFloat(raw)
      if (isNaN(n) || n < 0 || n > 20) return
    }
    setGrid(prev => ({ ...prev, [etudiantId]: { ...prev[etudiantId], note: raw } }))
  }

  function updateCommentaire(etudiantId: string, val: string) {
    setGrid(prev => ({ ...prev, [etudiantId]: { ...prev[etudiantId], commentaire: val } }))
  }

  /* ── Enregistrement ── */
  async function enregistrer() {
    if (!selectedMatiereId || !selectedDate) return
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops: Promise<any>[] = []
    for (const [etudiantId, cell] of Object.entries(grid)) {
      const val = cell.note.trim()
      if (val === '') continue
      const valeur = parseFloat(val)
      if (isNaN(valeur) || valeur < 0 || valeur > 20) continue

      const commentaire = intitule || cell.commentaire || null

      if (cell.existingId) {
        ops.push(Promise.resolve(
          supabase.from('notes').update({ valeur, commentaire }).eq('id', cell.existingId)
        ))
      } else {
        ops.push(Promise.resolve(
          supabase.from('notes').insert([{
            etudiant_id: etudiantId,
            matiere_id:  selectedMatiereId,
            valeur,
            type_eval:   selectedType,
            date:        selectedDate,
            commentaire,
          }])
        ))
      }
    }

    if (ops.length === 0) {
      afficherToast('Aucune note à enregistrer.', 'error')
      setSaving(false)
      return
    }

    const results = await Promise.all(ops)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasError = (results as any[]).some((r: any) => r.error !== null)
    setSaving(false)

    if (hasError) {
      afficherToast('Erreur lors de l\'enregistrement.', 'error')
    } else {
      afficherToast(`${ops.length} note${ops.length > 1 ? 's' : ''} enregistrée${ops.length > 1 ? 's' : ''}.`, 'success')
      // Refresh IDs
      const { data: fresh } = await supabase.from('notes')
        .select('id,etudiant_id,valeur,commentaire')
        .eq('matiere_id', selectedMatiereId)
        .eq('type_eval', selectedType)
        .eq('date', selectedDate)
      setGrid(prev => {
        const updated = { ...prev }
        for (const n of (fresh || []) as RawNote[]) {
          if (!updated[n.etudiant_id]) continue
          updated[n.etudiant_id] = { existingId: n.id, note: String(n.valeur), commentaire: n.commentaire || '' }
        }
        return updated
      })
    }
  }

  function afficherToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const ready = !!(selectedClasseId && selectedMatiereId)
  const selectedMatiere = matieres.find(m => m.id === selectedMatiereId)

  /* ── Accès refusé ── */
  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <p className="text-sm text-gray-500 mb-6">Réservé aux administrateurs et professeurs.</p>
        <Link href="/admin" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">← Dashboard</Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <span className="text-xl font-bold">Évaluations</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/evaluations/historique" className="text-indigo-200 hover:text-white text-sm">📂 Historique</Link>
          <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {/* ── Paramètres ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase mb-3">Paramètres de l&apos;évaluation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Classe</label>
              <select value={selectedClasseId} onChange={e => setSelectedClasseId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">— Choisir —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Matière</label>
              <select value={selectedMatiereId} onChange={e => setSelectedMatiereId(e.target.value)}
                disabled={!selectedClasseId || matieres.length === 0}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50">
                <option value="">— Choisir —</option>
                {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              {noMatiere && <p className="text-xs text-amber-600 mt-1">Aucune matière attitrée dans cette classe.</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Type d&apos;évaluation</label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value as TypeEval)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {TYPES_EVAL.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Intitulé (optionnel)</label>
              <input type="text" placeholder={`Ex : ${TYPE_LABELS[selectedType]} n°1`}
                value={intitule} onChange={e => setIntitule(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Indicateur type sélectionné */}
          {selectedType && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[selectedType]}`}>
                {TYPE_LABELS[selectedType]}
              </span>
              {selectedMatiere && <span className="text-xs text-gray-400">· {selectedMatiere.nom} (coeff. {selectedMatiere.coefficient})</span>}
            </div>
          )}
        </div>

        {/* ── Placeholder ── */}
        {!ready && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">Sélectionnez une classe et une matière pour saisir les notes.</p>
          </div>
        )}

        {/* ── Tableau ── */}
        {ready && (
          loading ? (
            <div className="text-center py-16 text-gray-400">Chargement...</div>
          ) : etudiants.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
              <p className="text-3xl mb-2">👨‍🎓</p>
              <p className="text-sm">Aucun étudiant dans cette classe.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {TYPE_LABELS[selectedType]}{intitule ? ` — ${intitule}` : ''}
                      {selectedMatiere && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-normal">
                          {selectedMatiere.nom}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {classes.find(c => c.id === selectedClasseId)?.nom} · {selectedDate} · {etudiants.length} élève{etudiants.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button onClick={enregistrer} disabled={saving}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition whitespace-nowrap">
                    {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead className="bg-indigo-700 text-white text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-center w-10">#</th>
                        <th className="px-4 py-3 text-left">Élève</th>
                        <th className="px-4 py-3 text-center w-28">Note /20</th>
                        <th className="px-4 py-3 text-left">Commentaire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {etudiants.map((et, idx) => {
                        const cell   = grid[et.id] ?? emptyCell()
                        const noteNum = parseFloat(cell.note)
                        const hasNote = cell.note !== ''
                        return (
                          <tr key={et.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-400 font-medium">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{et.nom} {et.prenom}</td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number" min="0" max="20" step="0.25"
                                value={cell.note}
                                onChange={e => updateNote(et.id, e.target.value)}
                                className={`w-20 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                                  hasNote
                                    ? noteNum >= 10 ? 'border-green-300 text-green-700' : 'border-red-300 text-red-700'
                                    : ''
                                }`}
                                placeholder="—"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="text" placeholder={intitule || 'Commentaire...'}
                                value={cell.commentaire}
                                onChange={e => updateCommentaire(et.id, e.target.value)}
                                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={enregistrer} disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition">
                  {saving ? 'Enregistrement...' : '💾 Enregistrer les notes'}
                </button>
              </div>
            </>
          )
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </main>
  )
}
