'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

/* ── Types ─────────────────────────────────────────────────────────── */
type CurrentUser = { id: string; role: string }
type Classe      = { id: string; nom: string }
type Matiere     = { id: string; nom: string }

type RawNote = {
  id: string
  etudiant_id: string
  matiere_id: string
  valeur: number
  type_eval: string
  date: string
  commentaire: string | null
  etudiants: {
    id: string
    nom: string
    prenom: string
    classe_id: string
    classes: { nom: string } | null
  } | null
  matieres: { nom: string } | null
}

type EvalGroup = {
  key: string
  date: string
  matiere_id: string
  matiere_nom: string
  type_eval: string
  classe_id: string
  classe_nom: string
  notes: RawNote[]
  moyenne: number
}

/* ── Constantes ── */
const TYPE_LABELS: Record<string, string> = {
  devoir:        'Devoir',
  interrogation: 'Interrogation',
  examen:        'Examen',
}

const TYPE_COLORS: Record<string, string> = {
  devoir:        'bg-blue-100 text-blue-700',
  interrogation: 'bg-purple-100 text-purple-700',
  examen:        'bg-orange-100 text-orange-700',
}

/* ── Regroupement ── */
function groupNotes(notes: RawNote[]): EvalGroup[] {
  const map = new Map<string, EvalGroup>()
  for (const n of notes) {
    const classeId  = n.etudiants?.classe_id ?? ''
    const classeNom = n.etudiants?.classes?.nom ?? '—'
    const key = `${n.date}|${n.matiere_id}|${n.type_eval}|${classeId}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        date:        n.date,
        matiere_id:  n.matiere_id,
        matiere_nom: n.matieres?.nom ?? '—',
        type_eval:   n.type_eval,
        classe_id:   classeId,
        classe_nom:  classeNom,
        notes:       [],
        moyenne:     0,
      })
    }
    map.get(key)!.notes.push(n)
  }
  for (const g of map.values()) {
    const sum = g.notes.reduce((s, n) => s + n.valeur, 0)
    g.moyenne = g.notes.length > 0 ? sum / g.notes.length : 0
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function HistoriqueEvaluationsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [accesRefuse, setAccesRefuse]  = useState(false)

  const [allNotes,  setAllNotes]  = useState<RawNote[]>([])
  const [classes,   setClasses]   = useState<Classe[]>([])
  const [matieres,  setMatieres]  = useState<Matiere[]>([])

  const [filtreClasse,   setFiltreClasse]   = useState('')
  const [filtreMatiere,  setFiltreMatiere]  = useState('')
  const [filtreType,     setFiltreType]     = useState('')
  const [filtreDateDeb,  setFiltreDateDeb]  = useState('')
  const [filtreDateFin,  setFiltreDateFin]  = useState('')

  const [detailGroup, setDetailGroup] = useState<EvalGroup | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [deleting,    setDeleting]    = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  /* ── Auth ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || !['admin', 'prof'].includes(u.role)) {
        setAccesRefuse(true)
      } else {
        setCurrentUser({ id: u.id, role: u.role })
      }
    } catch { setAccesRefuse(true) }
  }, [])

  /* ── Chargement initial ── */
  useEffect(() => {
    loadData()
    supabase.from('classes').select('id,nom').order('nom').then(({ data }) => setClasses(data || []))
    supabase.from('matieres').select('id,nom').order('nom').then(({ data }) => setMatieres(data || []))
  }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('notes')
      .select('id,etudiant_id,matiere_id,valeur,type_eval,date,commentaire,etudiants(id,nom,prenom,classe_id,classes(nom)),matieres(nom)')
      .in('type_eval', ['devoir', 'interrogation', 'examen'])
      .order('date', { ascending: false })
    setAllNotes((data || []) as unknown as RawNote[])
    setLoading(false)
  }

  async function supprimerGroupe(group: EvalGroup) {
    const label = `${TYPE_LABELS[group.type_eval] ?? group.type_eval} — ${group.matiere_nom} du ${group.date}`
    if (!window.confirm(`Supprimer les ${group.notes.length} résultat(s) de "${label}" ?`)) return
    setDeleting(true)
    const ids = group.notes.map(n => n.id)
    const { error } = await supabase.from('notes').delete().in('id', ids)
    setDeleting(false)
    if (error) {
      afficherToast('Erreur lors de la suppression.', 'error')
    } else {
      afficherToast('Évaluation supprimée.', 'success')
      setDetailGroup(null)
      await loadData()
    }
  }

  function afficherToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const hasFiltre = !!(filtreClasse || filtreMatiere || filtreType || filtreDateDeb || filtreDateFin)

  function effacerFiltres() {
    setFiltreClasse(''); setFiltreMatiere(''); setFiltreType('')
    setFiltreDateDeb(''); setFiltreDateFin('')
  }

  /* ── Filtrage + groupement ── */
  const groups = groupNotes(allNotes).filter(g => {
    if (filtreClasse  && g.classe_id  !== filtreClasse)  return false
    if (filtreMatiere && g.matiere_id !== filtreMatiere) return false
    if (filtreType    && g.type_eval  !== filtreType)    return false
    if (filtreDateDeb && g.date < filtreDateDeb)         return false
    if (filtreDateFin && g.date > filtreDateFin)         return false
    return true
  })

  /* ── Accès refusé ── */
  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <Link href="/admin" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">← Dashboard</Link>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════
     VUE DÉTAIL
  ══════════════════════════════════════════════════════════════════ */
  if (detailGroup) {
    const sortedNotes = [...detailGroup.notes].sort((a, b) =>
      `${a.etudiants?.nom ?? ''}`.localeCompare(`${b.etudiants?.nom ?? ''}`)
    )
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setDetailGroup(null)} className="text-indigo-200 hover:text-white">Historique</button>
            <span className="text-indigo-400">›</span>
            <span className="font-semibold">{TYPE_LABELS[detailGroup.type_eval] ?? detailGroup.type_eval} — {detailGroup.matiere_nom}</span>
          </div>
          <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${TYPE_COLORS[detailGroup.type_eval] ?? 'bg-gray-100 text-gray-700'}`}>
                    {TYPE_LABELS[detailGroup.type_eval] ?? detailGroup.type_eval}
                  </span>
                  <span className="font-semibold text-gray-900">{detailGroup.matiere_nom}</span>
                </div>
                <p className="text-sm text-gray-500">
                  {detailGroup.classe_nom} · {detailGroup.date} · {detailGroup.notes.length} élève{detailGroup.notes.length > 1 ? 's' : ''} ·
                  Moyenne : <span className={`font-semibold ${detailGroup.moyenne >= 10 ? 'text-green-600' : 'text-red-600'}`}>{detailGroup.moyenne.toFixed(2)}/20</span>
                </p>
              </div>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => supprimerGroupe(detailGroup)}
                  disabled={deleting}
                  className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {deleting ? 'Suppression...' : 'Supprimer'}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">#</th>
                    <th className="px-4 py-3 text-left">Élève</th>
                    <th className="px-4 py-3 text-center">Note /20</th>
                    <th className="px-4 py-3 text-left">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedNotes.map((n, idx) => {
                    const pass = n.valeur >= 10
                    return (
                      <tr key={n.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-center text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {n.etudiants ? `${n.etudiants.nom} ${n.etudiants.prenom}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${pass ? 'text-green-600' : 'text-red-600'}`}>
                            {n.valeur}/20
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{n.commentaire || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={() => setDetailGroup(null)} className="text-sm text-indigo-600 hover:text-indigo-800">
            ← Retour à l&apos;historique
          </button>
        </div>

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

  /* ══════════════════════════════════════════════════════════════════
     VUE LISTE
  ══════════════════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/evaluations" className="text-indigo-200 hover:text-white">Évaluations</Link>
          <span className="text-indigo-400">›</span>
          <span className="font-semibold">Historique</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {/* ── Filtres ── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase mb-3">Filtres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <select value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <select value={filtreMatiere} onChange={e => setFiltreMatiere(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Toutes les matières</option>
              {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
            <select value={filtreType} onChange={e => setFiltreType(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Tous les types</option>
              <option value="devoir">Devoir</option>
              <option value="interrogation">Interrogation</option>
              <option value="examen">Examen</option>
            </select>
            <div>
              <input type="date" value={filtreDateDeb} onChange={e => setFiltreDateDeb(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                title="Date de début" />
            </div>
            <div>
              <input type="date" value={filtreDateFin} onChange={e => setFiltreDateFin(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                title="Date de fin" />
            </div>
          </div>
          {hasFiltre && (
            <button onClick={effacerFiltres} className="mt-3 text-xs text-indigo-600 hover:text-indigo-800">
              ✕ Effacer les filtres
            </button>
          )}
        </div>

        {/* ── Liste ── */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Chargement...</div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">Aucune évaluation trouvée{hasFiltre ? ' avec ces filtres' : ''}.</p>
            {hasFiltre && (
              <button onClick={effacerFiltres} className="mt-3 text-xs text-indigo-600 hover:text-indigo-800">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Évaluations ({groups.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {groups.map(g => (
                <div key={g.key} className="px-5 py-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${TYPE_COLORS[g.type_eval] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABELS[g.type_eval] ?? g.type_eval}
                      </span>
                      <span className="font-medium text-gray-900">{g.matiere_nom}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-sm text-gray-500">{g.classe_nom}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-sm text-gray-500">
                      <span>{g.date}</span>
                      <span className="text-gray-300">·</span>
                      <span>{g.notes.length} élève{g.notes.length > 1 ? 's' : ''}</span>
                      <span className="text-gray-300">·</span>
                      <span>Moy. <span className={`font-semibold ${g.moyenne >= 10 ? 'text-green-600' : 'text-red-600'}`}>{g.moyenne.toFixed(2)}/20</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setDetailGroup(g)}
                      className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
                    >
                      Voir détail →
                    </button>
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => supprimerGroupe(g)}
                        disabled={deleting}
                        className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
