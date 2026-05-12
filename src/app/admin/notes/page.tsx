'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

/* ── Types ─────────────────────────────────────────────────────────── */
type CurrentUser = { id: string; nom: string; prenom: string; role: string }
type Periode     = { id: string; libelle: string; numero: number; date_debut: string; date_fin: string; cloturee: boolean; annee_scolaire: string }
type Classe      = { id: string; nom: string }
type Matiere     = { id: string; nom: string; coefficient: number }
type Etudiant    = { id: string; nom: string; prenom: string }
type NoteCell    = { existingId: string | null; value: string }
type StudentRow  = { classe: NoteCell; composition: NoteCell }
type NotesGrid   = Record<string, StudentRow>
type RawNote     = { id: string; etudiant_id: string; valeur: number; type_eval: string }
type RawProfMat  = { matiere_id: string }

/* ── Helpers ────────────────────────────────────────────────────────── */
function moyenneStr(c: string, k: string): string {
  const cv = parseFloat(c)
  const kv = parseFloat(k)
  if (isNaN(cv) && isNaN(kv)) return '—'
  if (isNaN(cv)) return kv.toFixed(2)
  if (isNaN(kv)) return cv.toFixed(2)
  return ((cv + kv) / 2).toFixed(2)
}

function emptyRow(): StudentRow {
  return {
    classe:      { existingId: null, value: '' },
    composition: { existingId: null, value: '' },
  }
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function NotesPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [accesRefuse, setAccesRefuse]  = useState(false)

  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [classes,  setClasses]  = useState<Classe[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [etudiants,setEtudiants]= useState<Etudiant[]>([])
  const [grid,     setGrid]     = useState<NotesGrid>({})

  const [selectedPeriodeId,  setSelectedPeriodeId]  = useState('')
  const [selectedClasseId,   setSelectedClasseId]   = useState('')
  const [selectedMatiereId,  setSelectedMatiereId]  = useState('')

  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [noMatiere,  setNoMatiere]  = useState(false)
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

  /* ── Listes de base ── */
  useEffect(() => {
    supabase.from('periodes').select('*').order('numero').then(({ data }) => setPeriodes((data || []) as Periode[]))
    supabase.from('classes').select('id,nom').order('nom').then(({ data }) => setClasses(data || []))
  }, [])

  /* ── Matières (filtrées selon rôle) ── */
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

  /* ── Grille notes ── */
  useEffect(() => {
    if (!selectedPeriodeId || !selectedClasseId || !selectedMatiereId || periodes.length === 0) {
      setEtudiants([]); setGrid({}); return
    }
    const periode = periodes.find(p => p.id === selectedPeriodeId)
    if (!periode) { setEtudiants([]); setGrid({}); return }

    setLoading(true)
    Promise.all([
      supabase.from('etudiants').select('id,nom,prenom').eq('classe_id', selectedClasseId).order('nom'),
      supabase.from('notes')
        .select('id,etudiant_id,valeur,type_eval')
        .eq('matiere_id', selectedMatiereId)
        .in('type_eval', ['classe', 'composition'])
        .gte('date', periode.date_debut)
        .lte('date', periode.date_fin),
    ]).then(([etRes, noteRes]) => {
      const ets = (etRes.data || []) as Etudiant[]
      setEtudiants(ets)

      const newGrid: NotesGrid = {}
      for (const e of ets) newGrid[e.id] = emptyRow()

      for (const n of (noteRes.data || []) as RawNote[]) {
        if (!newGrid[n.etudiant_id]) continue
        const type = n.type_eval === 'classe' ? 'classe' : 'composition'
        newGrid[n.etudiant_id][type] = { existingId: n.id, value: String(n.valeur) }
      }
      setGrid(newGrid)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriodeId, selectedClasseId, selectedMatiereId, periodes])

  /* ── Mise à jour cellule ── */
  function updateCell(etudiantId: string, type: 'classe' | 'composition', raw: string) {
    if (raw !== '') {
      const n = parseFloat(raw)
      if (isNaN(n) || n < 0 || n > 20) return
    }
    setGrid(prev => ({
      ...prev,
      [etudiantId]: { ...prev[etudiantId], [type]: { ...prev[etudiantId][type], value: raw } },
    }))
  }

  /* ── Enregistrement ── */
  async function enregistrer() {
    const periode = periodes.find(p => p.id === selectedPeriodeId)
    if (!periode || !selectedMatiereId) return
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ops: Promise<any>[] = []
    for (const [etudiantId, row] of Object.entries(grid)) {
      for (const type of ['classe', 'composition'] as const) {
        const cell = row[type]
        const val  = cell.value.trim()
        if (val === '') continue
        const valeur = parseFloat(val)
        if (isNaN(valeur) || valeur < 0 || valeur > 20) continue

        if (cell.existingId) {
          ops.push(Promise.resolve(supabase.from('notes').update({ valeur }).eq('id', cell.existingId)))
        } else {
          ops.push(Promise.resolve(supabase.from('notes').insert([{
            etudiant_id: etudiantId,
            matiere_id:  selectedMatiereId,
            valeur,
            type_eval:   type,
            date:        periode.date_debut,
          }])))
        }
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
      afficherToast(`${ops.length} note${ops.length > 1 ? 's' : ''} enregistrée${ops.length > 1 ? 's' : ''} avec succès.`, 'success')
      // Refresh pour récupérer les IDs des nouvelles notes
      const periode2 = periodes.find(p => p.id === selectedPeriodeId)
      if (!periode2) return
      const { data: noteRes } = await supabase.from('notes')
        .select('id,etudiant_id,valeur,type_eval')
        .eq('matiere_id', selectedMatiereId)
        .in('type_eval', ['classe', 'composition'])
        .gte('date', periode2.date_debut)
        .lte('date', periode2.date_fin)
      setGrid(prev => {
        const updated = { ...prev }
        for (const n of (noteRes || []) as RawNote[]) {
          if (!updated[n.etudiant_id]) continue
          const type = n.type_eval === 'classe' ? 'classe' : 'composition'
          updated[n.etudiant_id] = {
            ...updated[n.etudiant_id],
            [type]: { existingId: n.id, value: String(n.valeur) },
          }
        }
        return updated
      })
    }
  }

  function afficherToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Dérivés ── */
  const selectedPeriode = periodes.find(p => p.id === selectedPeriodeId)
  const isCloturee      = selectedPeriode?.cloturee === true
  const ready           = !!(selectedPeriodeId && selectedClasseId && selectedMatiereId)

  /* ── Accès refusé ── */
  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <p className="text-sm text-gray-500 mb-6">Réservé aux administrateurs et professeurs.</p>
        <Link href="/admin" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          ← Dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📝</span>
          <span className="text-xl font-bold">Saisie des notes</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {/* ── Sélecteurs ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase mb-3">Sélection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Période</label>
              <select
                value={selectedPeriodeId}
                onChange={e => setSelectedPeriodeId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— Choisir —</option>
                {periodes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.libelle} {p.cloturee ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Classe</label>
              <select
                value={selectedClasseId}
                onChange={e => setSelectedClasseId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— Choisir —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Matière</label>
              <select
                value={selectedMatiereId}
                onChange={e => setSelectedMatiereId(e.target.value)}
                disabled={!selectedClasseId || matieres.length === 0}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              >
                <option value="">— Choisir —</option>
                {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              {noMatiere && (
                <p className="text-xs text-amber-600 mt-1">Aucune matière attitrée dans cette classe.</p>
              )}
            </div>
          </div>

          {/* Badge clôturée */}
          {isCloturee && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
              🔒 <span>Cette période est <strong>clôturée</strong>. Les notes ne peuvent plus être modifiées.</span>
            </div>
          )}
        </div>

        {/* ── Placeholder ── */}
        {!ready && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-sm">Sélectionnez une période, une classe et une matière pour afficher le tableau de saisie.</p>
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
                {/* En-tête tableau */}
                <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {matieres.find(m => m.id === selectedMatiereId)?.nom}
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-normal">
                        Coeff. {matieres.find(m => m.id === selectedMatiereId)?.coefficient ?? '—'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedPeriode?.libelle} · {classes.find(c => c.id === selectedClasseId)?.nom} · {etudiants.length} élève{etudiants.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  {!isCloturee && (
                    <button
                      onClick={enregistrer}
                      disabled={saving}
                      className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition whitespace-nowrap"
                    >
                      {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-indigo-700 text-white text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-center w-10">#</th>
                        <th className="px-4 py-3 text-left">Élève</th>
                        <th className="px-4 py-3 text-center w-28">Not.Clas /20</th>
                        <th className="px-4 py-3 text-center w-28">Not.Comp /20</th>
                        <th className="px-4 py-3 text-center w-20">Moyen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {etudiants.map((et, idx) => {
                        const row   = grid[et.id] ?? emptyRow()
                        const moyen = moyenneStr(row.classe.value, row.composition.value)
                        const mNum  = parseFloat(moyen)
                        return (
                          <tr key={et.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-400 font-medium">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{et.nom} {et.prenom}</td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.25"
                                disabled={isCloturee}
                                value={row.classe.value}
                                onChange={e => updateCell(et.id, 'classe', e.target.value)}
                                className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-400"
                                placeholder="—"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.25"
                                disabled={isCloturee}
                                value={row.composition.value}
                                onChange={e => updateCell(et.id, 'composition', e.target.value)}
                                className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-400"
                                placeholder="—"
                              />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-sm font-semibold ${
                                moyen === '—' ? 'text-gray-300'
                                : mNum >= 10  ? 'text-green-600'
                                : 'text-red-600'
                              }`}>
                                {moyen}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bouton bas de page */}
              {!isCloturee && (
                <div className="flex justify-end">
                  <button
                    onClick={enregistrer}
                    disabled={saving}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition"
                  >
                    {saving ? 'Enregistrement...' : '💾 Enregistrer toutes les notes'}
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </main>
  )
}
