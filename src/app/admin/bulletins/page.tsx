'use client'
import { useEffect, useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { calculerMoyenneClasse } from "@/lib/bulletin-helpers"
import type { BulletinPDFProps, EcoleInfo } from "@/components/BulletinPDF"

type DownloadButtonProps = BulletinPDFProps & { fileName: string }

const BulletinDownloadButton = dynamic<DownloadButtonProps>(
  () => import("@/components/BulletinDownloadButton"),
  {
    ssr: false,
    loading: () => (
      <button disabled className="text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg cursor-not-allowed">
        PDF…
      </button>
    ),
  }
)

/* ── Types ─────────────────────────────────────────────────────── */
type User     = { id: string; nom: string; prenom: string; role: string }
type Periode  = { id: string; annee_scolaire: string; numero: number; libelle: string; date_debut: string; date_fin: string; cloturee: boolean }
type Classe   = { id: string; nom: string }
type Etudiant = { id: string; nom: string; prenom: string; photo_url?: string | null }
type Note     = { id: string; etudiant_id: string; matiere_id: string; valeur: number; date: string }
type Matiere  = { id: string; nom: string; coefficient: number }
type BulletinRow = { id: string; eleve_id: string; appreciation_generale: string | null }

type ResultatEleve = {
  etudiant: Etudiant
  moyenne: number | null
  mention: string | null
  rang: number | null
  notesParMatiere: Array<{ matiere: Matiere; notes: Note[]; moyenne: number | null }>
}

/* ── Helpers ───────────────────────────────────────────────────── */
const MENTION_STYLES: Record<string, string> = {
  'Excellent':   'bg-green-100 text-green-700',
  'Très Bien':   'bg-blue-100 text-blue-700',
  'Bien':        'bg-indigo-100 text-indigo-700',
  'Assez Bien':  'bg-yellow-100 text-yellow-700',
  'Passable':    'bg-orange-100 text-orange-700',
  'Insuffisant': 'bg-red-100 text-red-700',
}

function calculerMention(moyenne: number, noteSur: number): string {
  const sur20 = noteSur === 100 ? moyenne / 5 : moyenne
  if (sur20 >= 16) return 'Excellent'
  if (sur20 >= 14) return 'Très Bien'
  if (sur20 >= 12) return 'Bien'
  if (sur20 >= 10) return 'Assez Bien'
  if (sur20 >= 8)  return 'Passable'
  return 'Insuffisant'
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function BulletinsPage() {
  const [user, setUser]           = useState<User | null>(null)
  const [accesRefuse, setAccesRefuse] = useState(false)

  const [periodes, setPeriodes]   = useState<Periode[]>([])
  const [classes, setClasses]     = useState<Classe[]>([])
  const [matieres, setMatieres]   = useState<Matiere[]>([])
  const [noteSur, setNoteSur]     = useState(20)
  const [ecoleInfo, setEcoleInfo] = useState<EcoleInfo>({ nom_ecole: 'Établissement', note_sur: 20, annee_scolaire_active: '' })

  const [selectedPeriodeId, setSelectedPeriodeId] = useState("")
  const [selectedClasseId,  setSelectedClasseId]  = useState("")

  const [etudiants, setEtudiants]       = useState<Etudiant[]>([])
  const [notes, setNotes]               = useState<Note[]>([])
  const [bulletinsBase, setBulletinsBase] = useState<BulletinRow[]>([])
  const [appreciations, setAppreciations] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  /* Auth */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u   = raw ? JSON.parse(raw) : null
      if (!u || !['admin', 'prof'].includes(u.role)) {
        setAccesRefuse(true)
      } else {
        setUser(u)
      }
    } catch { setAccesRefuse(true) }
  }, [])

  /* Données statiques */
  useEffect(() => {
    supabase.from('periodes').select('*').order('numero')
      .then(({ data }) => setPeriodes((data as unknown as Periode[]) || []))
    supabase.from('classes').select('id,nom').order('nom')
      .then(({ data }) => setClasses((data as unknown as Classe[]) || []))
    supabase.from('matieres').select('id,nom,coefficient').order('nom')
      .then(({ data }) => setMatieres((data as unknown as Matiere[]) || []))
    supabase.from('parametres_ecole').select('nom_ecole,logo_url,adresse,note_sur,annee_scolaire_active').maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as { nom_ecole?: string; logo_url?: string; adresse?: string; note_sur?: number; annee_scolaire_active?: string }
          const ns = d.note_sur || 20
          setNoteSur(ns)
          setEcoleInfo({
            nom_ecole: d.nom_ecole || 'Établissement',
            logo_url: d.logo_url,
            adresse: d.adresse,
            note_sur: ns,
            annee_scolaire_active: d.annee_scolaire_active || '',
          })
        }
      })
  }, [])

  /* Chargement dynamique */
  useEffect(() => {
    if (!selectedPeriodeId || !selectedClasseId) return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriodeId, selectedClasseId])

  async function loadData() {
    setLoading(true)
    const periode = periodes.find(p => p.id === selectedPeriodeId)
    if (!periode) { setLoading(false); return }

    const [etResult, noteResult, bulletinResult] = await Promise.all([
      supabase.from('etudiants')
        .select('id,nom,prenom,photo_url')
        .eq('classe_id', selectedClasseId)
        .order('nom'),
      supabase.from('notes')
        .select('id,etudiant_id,matiere_id,valeur,date')
        .gte('date', periode.date_debut)
        .lte('date', periode.date_fin),
      supabase.from('bulletins')
        .select('id,eleve_id,appreciation_generale')
        .eq('periode_id', selectedPeriodeId)
        .eq('classe_id', selectedClasseId),
    ])

    const ets = (etResult.data  || []) as unknown as Etudiant[]
    const buls = (bulletinResult.data || []) as unknown as BulletinRow[]

    // Filtrer les notes aux seuls élèves de la classe
    const etIds = new Set(ets.map(e => e.id))
    const filteredNotes = ((noteResult.data || []) as unknown as Note[]).filter(n => etIds.has(n.etudiant_id))

    setEtudiants(ets)
    setNotes(filteredNotes)
    setBulletinsBase(buls)

    // Pré-remplir les appréciations existantes
    const appMap: Record<string, string> = {}
    buls.forEach(b => { appMap[b.eleve_id] = b.appreciation_generale || '' })
    setAppreciations(appMap)

    setLoading(false)
  }

  /* Calcul moyennes + rang */
  const resultats: ResultatEleve[] = useMemo(() => {
    const raw = etudiants.map(et => {
      const notesEt = notes.filter(n => n.etudiant_id === et.id)

      const notesParMatiere = matieres
        .map(m => {
          const notesMat = notesEt.filter(n => n.matiere_id === m.id)
          const moy = notesMat.length > 0
            ? notesMat.reduce((s, n) => s + n.valeur, 0) / notesMat.length
            : null
          return { matiere: m, notes: notesMat, moyenne: moy }
        })
        .filter(x => x.notes.length > 0)

      if (notesParMatiere.length === 0) {
        return { etudiant: et, moyenne: null, mention: null, rang: null, notesParMatiere: [] }
      }

      const sumCoef = notesParMatiere.reduce((s, x) => s + x.matiere.coefficient, 0)
      const sumPond = notesParMatiere.reduce((s, x) => s + (x.moyenne! * x.matiere.coefficient), 0)
      const moy = sumCoef > 0 ? sumPond / sumCoef : null

      return {
        etudiant: et,
        moyenne: moy,
        mention: moy !== null ? calculerMention(moy, noteSur) : null,
        rang: null as number | null,
        notesParMatiere,
      }
    })

    // Trier par moyenne DESC, null en dernier
    raw.sort((a, b) => {
      if (a.moyenne === null && b.moyenne === null) return 0
      if (a.moyenne === null) return 1
      if (b.moyenne === null) return -1
      return b.moyenne - a.moyenne
    })

    // Attribuer les rangs (ex-aequo = même rang, gap ensuite)
    return raw.map((r, _, arr) => {
      if (r.moyenne === null) return r
      const firstIdx = arr.findIndex(x => x.moyenne === r.moyenne)
      return { ...r, rang: firstIdx + 1 }
    })
  }, [etudiants, notes, matieres, noteSur])

  /* Moyenne de classe par matière */
  const moyennesClasse = useMemo(() => {
    const map: Record<string, number | null> = {}
    matieres.forEach(m => { map[m.id] = calculerMoyenneClasse(resultats, m.id) })
    return map
  }, [resultats, matieres])

  const periode     = periodes.find(p => p.id === selectedPeriodeId)
  const isCloturee  = periode?.cloturee === true

  /* Enregistrer tous les bulletins */
  async function saveAll() {
    if (!selectedPeriodeId || !selectedClasseId || !user) return
    setSaving(true)
    setToast(null)

    const rows = resultats.map(r => ({
      eleve_id:              r.etudiant.id,
      periode_id:            selectedPeriodeId,
      classe_id:             selectedClasseId,
      moyenne_generale:      r.moyenne,
      rang:                  r.rang,
      effectif_classe:       etudiants.length,
      mention:               r.mention,
      appreciation_generale: appreciations[r.etudiant.id] || null,
      donnees_json: {
        notes_par_matiere: r.notesParMatiere.map(x => ({
          matiere_id:  x.matiere.id,
          matiere_nom: x.matiere.nom,
          coef:        x.matiere.coefficient,
          notes:       x.notes.map(n => n.valeur),
          moyenne:     x.moyenne,
        })),
        matieres_coef: matieres.map(m => ({ id: m.id, nom: m.nom, coef: m.coefficient })),
      },
      cree_par: user.id,
    }))

    const { error } = await supabase
      .from('bulletins')
      .upsert(rows, { onConflict: 'eleve_id,periode_id' })

    setSaving(false)
    if (error) {
      setToast({ type: 'err', msg: `Erreur : ${error.message}` })
    } else {
      setToast({ type: 'ok', msg: `${rows.length} bulletin(s) enregistré(s) ✓` })
      setTimeout(() => setToast(null), 4000)
    }
  }

  /* Clôturer la période */
  async function cloturerPeriode() {
    if (!confirm(`Clôturer "${periode?.libelle}" ? Cette action est irréversible.`)) return
    const { error } = await supabase.from('periodes').update({ cloturee: true }).eq('id', selectedPeriodeId)
    if (error) {
      setToast({ type: 'err', msg: `Erreur : ${error.message}` })
    } else {
      setPeriodes(prev => prev.map(p => p.id === selectedPeriodeId ? { ...p, cloturee: true } : p))
      setToast({ type: 'ok', msg: 'Période clôturée.' })
    }
  }

  /* ── Accès refusé ─────────────────────────────────────────────── */
  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <p className="text-sm text-gray-500 mb-6">Réservé aux administrateurs et professeurs.</p>
        <Link href="/login" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          ← Connexion
        </Link>
      </div>
    </div>
  )

  /* ── Rendu principal ──────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <span className="text-xl font-bold">Bulletins</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {/* Sélecteurs */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
            <select
              value={selectedPeriodeId}
              onChange={e => setSelectedPeriodeId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— Sélectionner une période —</option>
              {periodes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.libelle}{p.cloturee ? ' 🔒' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <select
              value={selectedClasseId}
              onChange={e => setSelectedClasseId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— Sélectionner une classe —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
        </div>

        {/* État vide */}
        {(!selectedPeriodeId || !selectedClasseId) && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p>Choisissez une période et une classe pour afficher les bulletins.</p>
          </div>
        )}

        {/* Chargement */}
        {selectedPeriodeId && selectedClasseId && loading && (
          <div className="text-center py-20 text-gray-400">Chargement…</div>
        )}

        {/* Contenu */}
        {selectedPeriodeId && selectedClasseId && !loading && (
          <>
            {/* Barre d'info */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">
                  {classes.find(c => c.id === selectedClasseId)?.nom} — {periode?.libelle}
                </h1>
                <span className="text-sm text-gray-500">
                  {etudiants.length} élève{etudiants.length > 1 ? 's' : ''}
                </span>
                {isCloturee && (
                  <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                    🔒 Période clôturée
                  </span>
                )}
              </div>
              {user?.role === 'admin' && !isCloturee && (
                <button
                  onClick={cloturerPeriode}
                  className="text-sm text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 transition"
                >
                  🔒 Clôturer la période
                </button>
              )}
            </div>

            {/* Tableau */}
            {etudiants.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-4">👨‍🎓</p>
                <p>Aucun élève dans cette classe.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-x-auto mb-6">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 w-12">#</th>
                      <th className="text-left   px-4 py-3 text-sm font-semibold text-gray-600">Élève</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Moyenne</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Mention</th>
                      <th className="text-left   px-4 py-3 text-sm font-semibold text-gray-600 min-w-[220px]">Appréciation générale</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultats.map((r, i) => (
                      <tr key={r.etudiant.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>

                        {/* Rang */}
                        <td className="text-center px-4 py-4">
                          {r.rang !== null
                            ? <span className="text-sm font-bold text-indigo-700">{r.rang}</span>
                            : <span className="text-gray-300 text-sm">—</span>}
                        </td>

                        {/* Élève */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 text-indigo-700 rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold shrink-0">
                              {r.etudiant.prenom[0]}{r.etudiant.nom[0]}
                            </div>
                            <span className="font-medium text-gray-900 whitespace-nowrap">
                              {r.etudiant.nom} {r.etudiant.prenom}
                            </span>
                          </div>
                        </td>

                        {/* Moyenne */}
                        <td className="text-center px-4 py-4">
                          {r.moyenne !== null
                            ? <span className={`text-base font-bold ${r.moyenne >= noteSur / 2 ? 'text-green-600' : 'text-red-600'}`}>
                                {r.moyenne.toFixed(2)}/{noteSur}
                              </span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Mention */}
                        <td className="text-center px-4 py-4">
                          {r.mention
                            ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${MENTION_STYLES[r.mention] ?? 'bg-gray-100 text-gray-600'}`}>
                                {r.mention}
                              </span>
                            : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Appréciation */}
                        <td className="px-4 py-3">
                          <textarea
                            value={appreciations[r.etudiant.id] || ''}
                            onChange={e => setAppreciations(prev => ({ ...prev, [r.etudiant.id]: e.target.value }))}
                            disabled={isCloturee}
                            maxLength={300}
                            rows={2}
                            placeholder={isCloturee ? '' : 'Appréciation…'}
                            className="w-full text-sm border rounded-lg px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* PDF */}
                        <td className="text-center px-4 py-4">
                          {periode && (
                            <BulletinDownloadButton
                              ecole={{ ...ecoleInfo, note_sur: noteSur }}
                              periode={{ libelle: periode.libelle, annee_scolaire: periode.annee_scolaire }}
                              eleve={{ nom: r.etudiant.nom, prenom: r.etudiant.prenom, photo_url: r.etudiant.photo_url ?? undefined }}
                              classe={{ nom: classes.find(c => c.id === selectedClasseId)?.nom ?? '' }}
                              effectif={etudiants.length}
                              notesParMatiere={r.notesParMatiere.map(x => ({
                                nom_matiere:    x.matiere.nom,
                                coefficient:    x.matiere.coefficient,
                                moyenne_eleve:  x.moyenne,
                                moyenne_classe: moyennesClasse[x.matiere.id] ?? null,
                              }))}
                              moyenneGenerale={r.moyenne}
                              rang={r.rang}
                              mention={r.mention}
                              appreciationGenerale={appreciations[r.etudiant.id] || ''}
                              fileName={`Bulletin_${r.etudiant.nom}_${r.etudiant.prenom}_${periode.libelle}.pdf`}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions bas de page */}
            {isCloturee ? (
              <p className="text-sm text-red-500 font-medium">
                🔒 Cette période est clôturée — bulletins en lecture seule.
              </p>
            ) : etudiants.length > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Enregistrement…' : '💾 Enregistrer tous les bulletins'}
                </button>
                {toast && (
                  <span className={`text-sm font-medium ${toast.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                    {toast.msg}
                  </span>
                )}
              </div>
            ) : null}

          </>
        )}
      </div>
    </main>
  )
}
