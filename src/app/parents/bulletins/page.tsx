'use client'
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
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
type ParentUser  = { id: string; nom: string; prenom: string; role: string; email: string }
type Enfant      = { id: string; nom: string; prenom: string; classe_id: string | null }
type Periode     = { id: string; libelle: string; annee_scolaire: string; numero: number }
type BulletinRow = {
  id: string
  periode_id: string
  moyenne_generale: number | null
  rang: number | null
  effectif_classe: number
  mention: string | null
  appreciation_generale: string | null
  donnees_json: Record<string, unknown> | null
  classes: { nom: string } | null
}
type Card = { periode: Periode; bulletin: BulletinRow | null; classeNom: string }

const MENTION_STYLES: Record<string, string> = {
  'Excellent':   'bg-green-100 text-green-700',
  'Très Bien':   'bg-blue-100 text-blue-700',
  'Bien':        'bg-indigo-100 text-indigo-700',
  'Assez Bien':  'bg-yellow-100 text-yellow-700',
  'Passable':    'bg-orange-100 text-orange-700',
  'Insuffisant': 'bg-red-100 text-red-700',
}

function buildPDFProps(
  b: BulletinRow,
  enfant: Enfant,
  periode: Periode,
  ecoleInfo: EcoleInfo
): BulletinPDFProps | null {
  if (!b.classes) return null
  const npm = ((b.donnees_json?.notes_par_matiere as unknown[]) || []).map((x: unknown) => {
    const row = x as Record<string, unknown>
    return {
      nom_matiere:      String(row.matiere_nom ?? row.nom_matiere ?? '—'),
      coefficient:      Number(row.coef ?? row.coefficient ?? 1),
      note_classe:      (row.note_classe      ?? null) as number | null,
      note_composition: (row.note_composition ?? null) as number | null,
      moyenne_eleve:    (row.moyenne          ?? null) as number | null,
      note_coeff:       (row.note_coeff       ?? null) as number | null,
      moyenne_classe:   (row.moyenne_classe   ?? null) as number | null,
    }
  })
  return {
    ecole: ecoleInfo,
    periode: { libelle: periode.libelle, annee_scolaire: periode.annee_scolaire },
    eleve: { nom: enfant.nom, prenom: enfant.prenom },
    classe: { nom: b.classes.nom },
    effectif: b.effectif_classe,
    notesParMatiere: npm,
    moyenneGenerale: b.moyenne_generale,
    rang: b.rang,
    mention: b.mention,
    appreciationGenerale: b.appreciation_generale || '',
  }
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function ParentBulletinsPage() {
  const [parent, setParent]           = useState<ParentUser | null>(null)
  const [accesRefuse, setAccesRefuse] = useState(false)

  const [enfants, setEnfants]         = useState<Enfant[]>([])
  const [selectedId, setSelectedId]   = useState<string>('')
  const [cards, setCards]             = useState<Card[]>([])
  const [ecoleInfo, setEcoleInfo]     = useState<EcoleInfo>({
    nom_ecole: 'Établissement', note_sur: 20, annee_scolaire_active: '',
  })
  const [loadingInit, setLoadingInit]         = useState(false)
  const [loadingBulletins, setLoadingBulletins] = useState(false)

  /* Auth */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_parent')
      const p   = raw ? JSON.parse(raw) : null
      if (!p || p.role !== 'parent') { setAccesRefuse(true) }
      else { setParent(p) }
    } catch { setAccesRefuse(true) }
  }, [])

  /* Charger école + enfants */
  useEffect(() => {
    if (!parent) return
    setLoadingInit(true)

    Promise.all([
      supabase.from('parametres_ecole')
        .select('nom_ecole,logo_url,adresse,telephone,note_sur,annee_scolaire_active')
        .maybeSingle(),
      supabase.from('etudiants')
        .select('id,nom,prenom,classe_id')
        .eq('parent_id', parent.id)
        .order('nom'),
    ]).then(([ecoleRes, enfantsRes]) => {
      const ed = ecoleRes.data as {
        nom_ecole?: string; logo_url?: string; adresse?: string; telephone?: string;
        note_sur?: number; annee_scolaire_active?: string
      } | null
      if (ed) {
        setEcoleInfo({
          nom_ecole: ed.nom_ecole || 'Établissement',
          logo_url: ed.logo_url,
          adresse: ed.adresse,
          telephone: ed.telephone,
          note_sur: ed.note_sur || 20,
          annee_scolaire_active: ed.annee_scolaire_active || '',
        })
      }

      const kids = (enfantsRes.data || []) as Enfant[]
      setEnfants(kids)
      if (kids.length > 0) setSelectedId(kids[0].id)
    }).catch(() => { /* ignore */ }).finally(() => setLoadingInit(false))
  }, [parent])

  /* Charger périodes + bulletins quand enfant sélectionné change */
  useEffect(() => {
    if (!selectedId) { setCards([]); return }
    const enfant = enfants.find(e => e.id === selectedId)
    if (!enfant) return

    setLoadingBulletins(true)

    Promise.all([
      supabase.from('periodes')
        .select('id,libelle,annee_scolaire,numero')
        .eq('cloturee', true)
        .order('numero'),
      supabase.from('bulletins')
        .select('id,periode_id,moyenne_generale,rang,effectif_classe,mention,appreciation_generale,donnees_json,classes(nom)')
        .eq('eleve_id', selectedId),
      enfant.classe_id
        ? supabase.from('classes').select('nom').eq('id', enfant.classe_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]).then(([periodesRes, bulletinsRes, classeRes]) => {
      const closedPeriodes = (periodesRes.data || []) as Periode[]
      const bulletinMap = new Map(
        ((bulletinsRes.data || []) as unknown as BulletinRow[]).map(b => [b.periode_id, b])
      )
      const classeNom = (classeRes.data as { nom?: string } | null)?.nom ?? '—'

      setCards(closedPeriodes.map(p => ({
        periode: p,
        bulletin: bulletinMap.get(p.id) ?? null,
        classeNom,
      })))
    }).catch(() => { /* ignore */ }).finally(() => setLoadingBulletins(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const enfantActif = enfants.find(e => e.id === selectedId) ?? null

  /* ── Accès refusé ─────────────────────────────────────────────── */
  if (accesRefuse) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <p className="text-sm text-gray-500 mb-6">Cette section est réservée aux parents connectés.</p>
        <Link href="/parents" className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium">
          ← Mon espace
        </Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-green-50">
      <header className="bg-green-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📄</span>
          <span className="text-xl font-bold">Bulletins scolaires</span>
        </div>
        <Link href="/parents" className="text-green-200 hover:text-white text-sm">← Mon espace</Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {parent && (
          <p className="text-sm text-green-700 font-medium mb-6">
            Connecté(e) en tant que <strong>{parent.prenom} {parent.nom}</strong>
          </p>
        )}

        {loadingInit && <div className="text-center py-20 text-gray-400">Chargement…</div>}

        {!loadingInit && enfants.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-4">👨‍👧</p>
            <p>Aucun enfant associé à ce compte.</p>
          </div>
        )}

        {!loadingInit && enfants.length > 0 && (
          <>
            {/* Sélecteur d'enfant */}
            {enfants.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {enfants.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                      selectedId === e.id
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold shrink-0">
                      {e.prenom[0]}{e.nom[0]}
                    </span>
                    {e.prenom} {e.nom}
                  </button>
                ))}
              </div>
            )}

            {/* Titre enfant */}
            {enfantActif && (
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Bulletins de <span className="text-green-700">{enfantActif.prenom} {enfantActif.nom}</span>
              </h2>
            )}

            {loadingBulletins && <div className="text-center py-16 text-gray-400">Chargement…</div>}

            {!loadingBulletins && cards.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-4">📄</p>
                <p>Aucune période clôturée pour le moment.</p>
                <p className="text-sm mt-2">Les bulletins apparaissent ici une fois les périodes clôturées par l&apos;administration.</p>
              </div>
            )}

            {!loadingBulletins && cards.length > 0 && enfantActif && (
              <div className="flex flex-col gap-5">
                {cards.map(({ periode, bulletin, classeNom }) => {
                  const hasDonnees = !!(
                    bulletin?.donnees_json?.notes_par_matiere &&
                    ((bulletin.donnees_json.notes_par_matiere as unknown[]).length > 0)
                  )
                  const pdfProps = bulletin && hasDonnees
                    ? buildPDFProps(bulletin, enfantActif, periode, ecoleInfo)
                    : null

                  return (
                    <div key={periode.id} className="bg-white rounded-2xl shadow-sm p-5">

                      {/* En-tête carte */}
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{periode.libelle}</h3>
                          <p className="text-sm text-gray-500">{classeNom} · {periode.annee_scolaire}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {bulletin?.mention && (
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${MENTION_STYLES[bulletin.mention] ?? 'bg-gray-100 text-gray-600'}`}>
                              {bulletin.mention}
                            </span>
                          )}
                          {pdfProps && (
                            <BulletinDownloadButton
                              {...pdfProps}
                              fileName={`Bulletin_${enfantActif.nom}_${enfantActif.prenom}_${periode.libelle}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_')}
                            />
                          )}
                        </div>
                      </div>

                      {/* Pas de données */}
                      {(!bulletin || !hasDonnees) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                          Bulletin en attente de génération par l&apos;établissement.
                        </div>
                      )}

                      {/* Bulletin complet */}
                      {bulletin && hasDonnees && (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-green-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-gray-500 mb-1">Moyenne</p>
                              <p className={`text-xl font-bold ${
                                bulletin.moyenne_generale !== null && bulletin.moyenne_generale >= ecoleInfo.note_sur / 2
                                  ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {bulletin.moyenne_generale !== null
                                  ? `${bulletin.moyenne_generale.toFixed(2)}/${ecoleInfo.note_sur}`
                                  : '—'}
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-gray-500 mb-1">Rang</p>
                              <p className="text-xl font-bold text-green-700">
                                {bulletin.rang !== null ? `${bulletin.rang}/${bulletin.effectif_classe}` : '—'}
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3 text-center">
                              <p className="text-xs text-gray-500 mb-1">Effectif</p>
                              <p className="text-xl font-bold text-gray-700">{bulletin.effectif_classe}</p>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 text-gray-600 font-semibold">Matière</th>
                                  <th className="text-center py-2 text-gray-600 font-semibold w-16">Coef</th>
                                  <th className="text-center py-2 text-gray-600 font-semibold w-28">Moy. Élève</th>
                                  <th className="text-center py-2 text-gray-600 font-semibold w-28">Moy. Classe</th>
                                </tr>
                              </thead>
                              <tbody>
                                {((bulletin.donnees_json?.notes_par_matiere as unknown[]) || []).map((x: unknown, i: number) => {
                                  const row  = x as Record<string, unknown>
                                  const moy  = row.moyenne as number | null
                                  const ns   = ecoleInfo.note_sur
                                  const s20  = (v: number) => ns === 100 ? v / 5 : v
                                  const pass = moy !== null && s20(moy) >= 10
                                  return (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="py-2 pr-3">{String(row.matiere_nom ?? row.nom_matiere ?? '—')}</td>
                                      <td className="text-center py-2 text-gray-500">{String(row.coef ?? row.coefficient ?? 1)}</td>
                                      <td className={`text-center py-2 font-semibold ${pass ? 'text-green-600' : 'text-red-600'}`}>
                                        {moy !== null ? `${moy.toFixed(2)}/${ns}` : '—'}
                                      </td>
                                      <td className="text-center py-2 text-gray-500">
                                        {row.moyenne_classe != null
                                          ? `${(row.moyenne_classe as number).toFixed(2)}/${ns}`
                                          : '—'}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>

                          {bulletin.appreciation_generale && (
                            <div className="mt-4 bg-green-50 rounded-xl p-4">
                              <p className="text-xs font-semibold text-green-700 mb-1">Appréciation du conseil de classe</p>
                              <p className="text-sm text-gray-700 italic">&ldquo;{bulletin.appreciation_generale}&rdquo;</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
