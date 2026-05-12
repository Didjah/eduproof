'use client'
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import type { RecuPDFProps } from "@/components/RecuPDF"

/* ── Dynamic import reçu PDF ──────────────────────────────────────── */
interface DownloadProps extends RecuPDFProps { fileName: string }
const RecuDownloadButton = dynamic<DownloadProps>(
  () => import("@/components/RecuDownloadButton"),
  { ssr: false, loading: () => <span className="text-xs text-gray-400">...</span> }
)

/* ── Types ─────────────────────────────────────────────────────────── */
type EtudiantFinance = {
  id: string
  nom: string
  prenom: string
  classe_id: string
  classe_nom: string
  total_du: number
  total_paye: number
  reste: number
  statut_paiement: 'solde' | 'partiel' | 'non_paye'
}

type PaiementDetail = {
  id: string
  etudiant_id: string
  montant: number
  mode_paiement: string
  date_paiement: string
  note: string | null
  numero_recu: string | null
  recu_par: string | null
  recu_par_nom: string
}

type Filtre = 'tous' | 'solde' | 'partiel' | 'non_paye'

const MODES = ['Espèces', 'Orange Money', 'Wave', 'Virement']
const ANNEE = '2025-2026'

function genNumeroRecu(): string {
  const d = new Date()
  const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `REC-${dateStr}-${rand}`
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function FinancesPage() {
  const [vue, setVue] = useState<'globale' | 'etudiant'>('globale')
  const [etudiants, setEtudiants] = useState<EtudiantFinance[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [filtreClasse, setFiltreClasse] = useState<string>('toutes')
  const [classes, setClasses] = useState<{id:string;nom:string}[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Vue étudiant
  const [selected, setSelected] = useState<EtudiantFinance | null>(null)
  const [paiementsDetail, setPaiementsDetail] = useState<PaiementDetail[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Modal versement
  const [showModal, setShowModal] = useState(false)
  const [formVersement, setFormVersement] = useState({
    montant: '',
    date_paiement: new Date().toISOString().split('T')[0],
    mode_paiement: 'Espèces',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [warnDepassement, setWarnDepassement] = useState(false)

  // Auth
  const [accesRefuse, setAccesRefuse] = useState(false)
  const [currentUser, setCurrentUser] = useState<{id:string;nom:string;prenom:string}|null>(null)

  // Info école (pour le PDF)
  const [ecoleInfo, setEcoleInfo] = useState({ nom_ecole: 'E.F.A.S.L.A', adresse: 'Loulouni, Mali', telephone: '79 25 92 22', logo_url: undefined as string|undefined })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || !['admin', 'secretaire'].includes(u.role)) {
        setAccesRefuse(true)
      } else {
        setCurrentUser({ id: u.id, nom: u.nom, prenom: u.prenom })
      }
    } catch { setAccesRefuse(true) }
  }, [])

  useEffect(() => {
    loadGlobal()
    loadEcole()
    supabase.from('classes').select('id,nom').order('nom').then(({ data }) => setClasses(data || []))
  }, [])

  async function loadEcole() {
    const { data } = await supabase.from('parametres_ecole').select('nom_ecole,adresse,telephone,logo_url').single()
    if (data) setEcoleInfo({ nom_ecole: data.nom_ecole || 'E.F.A.S.L.A', adresse: data.adresse || 'Loulouni, Mali', telephone: data.telephone || '79 25 92 22', logo_url: data.logo_url })
  }

  async function loadGlobal() {
    setLoading(true)
    const [etRes, fraisRes, payRes] = await Promise.all([
      supabase.from('etudiants').select('id,nom,prenom,statut,classe_id,classes(id,nom)').eq('statut','actif').order('nom'),
      supabase.from('frais_scolarite').select('classe_id,montant_total').eq('annee_scolaire', ANNEE),
      supabase.from('paiements').select('etudiant_id,montant'),
    ])

    const fraisMap: Record<string, number> = {}
    for (const f of fraisRes.data || []) fraisMap[f.classe_id] = f.montant_total

    const payMap: Record<string, number> = {}
    for (const p of payRes.data || []) payMap[p.etudiant_id] = (payMap[p.etudiant_id] || 0) + (p.montant || 0)

    type EtRow = { id:string; nom:string; prenom:string; statut:string; classe_id:string; classes:{id:string;nom:string}|null }
    const rows: EtudiantFinance[] = ((etRes.data || []) as unknown as EtRow[]).map(e => {
      const total_du = fraisMap[e.classe_id] ?? 300000
      const total_paye = payMap[e.id] ?? 0
      const reste = total_du - total_paye
      const statut_paiement: EtudiantFinance['statut_paiement'] =
        reste <= 0 ? 'solde' : total_paye > 0 ? 'partiel' : 'non_paye'
      return { id: e.id, nom: e.nom, prenom: e.prenom, classe_id: e.classe_id, classe_nom: e.classes?.nom ?? '—', total_du, total_paye, reste, statut_paiement }
    })
    setEtudiants(rows)
    setLoading(false)
  }

  async function loadPaiementsEtudiant(etudiantId: string) {
    setLoadingDetail(true)
    const { data } = await supabase
      .from('paiements')
      .select('id,etudiant_id,montant,mode_paiement,date_paiement,note,numero_recu,recu_par,utilisateurs!recu_par(nom,prenom)')
      .eq('etudiant_id', etudiantId)
      .order('date_paiement', { ascending: false })
    type RawPay = { id:string; etudiant_id:string; montant:number; mode_paiement:string; date_paiement:string; note:string|null; numero_recu:string|null; recu_par:string|null; utilisateurs:{nom:string;prenom:string}|null }
    const rows: PaiementDetail[] = ((data || []) as unknown as RawPay[]).map(p => ({
      ...p,
      recu_par_nom: p.utilisateurs ? `${p.utilisateurs.prenom} ${p.utilisateurs.nom}` : '—',
    }))
    setPaiementsDetail(rows)
    setLoadingDetail(false)
  }

  function ouvrirDetailEtudiant(et: EtudiantFinance) {
    setSelected(et)
    setVue('etudiant')
    loadPaiementsEtudiant(et.id)
  }

  function retourGlobal() {
    setVue('globale')
    setSelected(null)
    setPaiementsDetail([])
  }

  async function enregistrerVersement() {
    if (!selected || !formVersement.montant || parseFloat(formVersement.montant) <= 0) return
    setSaving(true)
    const montant = parseFloat(formVersement.montant)
    const numero_recu = genNumeroRecu()
    await supabase.from('paiements').insert([{
      etudiant_id: selected.id,
      montant,
      type: 'Scolarité',
      statut: montant >= selected.reste ? 'paye' : 'partiel',
      date_paiement: formVersement.date_paiement,
      mode_paiement: formVersement.mode_paiement,
      note: formVersement.note || null,
      numero_recu,
      recu_par: currentUser?.id || null,
    }])
    setFormVersement({ montant: '', date_paiement: new Date().toISOString().split('T')[0], mode_paiement: 'Espèces', note: '' })
    setShowModal(false)
    setSaving(false)
    setWarnDepassement(false)
    // Recharger les deux vues
    await loadGlobal()
    await loadPaiementsEtudiant(selected.id)
    // Mettre à jour selected avec les nouvelles valeurs
    setSelected(prev => {
      if (!prev) return prev
      const newPaye = prev.total_paye + montant
      const newReste = Math.max(0, prev.total_du - newPaye)
      return {
        ...prev,
        total_paye: newPaye,
        reste: newReste,
        statut_paiement: newReste <= 0 ? 'solde' : newPaye > 0 ? 'partiel' : 'non_paye',
      }
    })
  }

  function onMontantChange(val: string) {
    setFormVersement(f => ({ ...f, montant: val }))
    if (selected && val) {
      setWarnDepassement(parseFloat(val) > selected.reste)
    } else {
      setWarnDepassement(false)
    }
  }

  /* ── Totaux globaux ── */
  const totalAttendu = etudiants.reduce((s, e) => s + e.total_du, 0)
  const totalEncaisse = etudiants.reduce((s, e) => s + e.total_paye, 0)
  const totalRestant  = etudiants.reduce((s, e) => s + Math.max(0, e.reste), 0)

  /* ── Filtrage ── */
  const etudiantsFiltres = etudiants.filter(e => {
    if (filtre !== 'tous' && e.statut_paiement !== filtre) return false
    if (filtreClasse !== 'toutes' && e.classe_id !== filtreClasse) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!`${e.nom} ${e.prenom}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  /* ── Accès refusé ── */
  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <p className="text-sm text-gray-500 mb-6">Votre rôle ne vous permet pas d&apos;accéder à cette page.</p>
        <Link href="/admin" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          ← Retour au dashboard
        </Link>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════
     VUE ÉTUDIANT
  ══════════════════════════════════════════════════════════════════ */
  if (vue === 'etudiant' && selected) {
    const recuParNom = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : '—'
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={retourGlobal} className="text-indigo-200 hover:text-white">Finances</button>
            <span className="text-indigo-400">›</span>
            <span className="font-semibold">{selected.prenom} {selected.nom}</span>
          </div>
          <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
          {/* Carte résumé */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total dû', value: selected.total_du, color: 'bg-indigo-600' },
              { label: 'Payé', value: selected.total_paye, color: 'bg-green-600' },
              { label: 'Reste', value: Math.max(0, selected.reste), color: selected.reste <= 0 ? 'bg-green-500' : 'bg-red-500' },
            ].map((c, i) => (
              <div key={i} className={`${c.color} text-white rounded-2xl p-4 sm:p-6`}>
                <p className="text-xl sm:text-2xl font-bold">{c.value.toLocaleString()}</p>
                <p className="text-xs sm:text-sm opacity-80 mt-0.5">FCFA · {c.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="font-semibold text-gray-900">{selected.prenom} {selected.nom}</p>
              <p className="text-sm text-gray-500">{selected.classe_nom}</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              + Enregistrer un versement
            </button>
          </div>

          {/* Historique */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Historique des versements</h2>
            </div>
            {loadingDetail ? (
              <div className="text-center py-10 text-gray-400">Chargement...</div>
            ) : paiementsDetail.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-3xl mb-2">💳</p>
                <p className="text-sm">Aucun versement enregistré.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px]">
                  <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Montant</th>
                      <th className="px-4 py-3 text-left">Mode</th>
                      <th className="px-4 py-3 text-left">Note</th>
                      <th className="px-4 py-3 text-left">Reçu par</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paiementsDetail.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">{p.date_paiement}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{p.montant?.toLocaleString()} FCFA</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.mode_paiement || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate">{p.note || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.recu_par_nom}</td>
                        <td className="px-4 py-3">
                          {p.numero_recu ? (
                            <RecuDownloadButton
                              fileName={`recu-${p.numero_recu}.pdf`}
                              ecole={ecoleInfo}
                              etudiant={{ nom: selected.nom, prenom: selected.prenom, classe: selected.classe_nom }}
                              paiement={{
                                numero_recu: p.numero_recu,
                                date: p.date_paiement,
                                montant_verse: p.montant,
                                mode_paiement: p.mode_paiement || 'Espèces',
                                note: p.note ?? undefined,
                              }}
                              bilan={{ total_du: selected.total_du, total_paye: selected.total_paye, reste: Math.max(0, selected.reste) }}
                              recu_par={p.recu_par_nom}
                            />
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal versement */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Enregistrer un versement</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Montant (FCFA)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 150000"
                    value={formVersement.montant}
                    onChange={e => onMontantChange(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {warnDepassement && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ Le montant dépasse le reste dû ({selected.reste.toLocaleString()} FCFA).</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={formVersement.date_paiement}
                    onChange={e => setFormVersement(f => ({ ...f, date_paiement: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Mode de paiement</label>
                  <select
                    value={formVersement.mode_paiement}
                    onChange={e => setFormVersement(f => ({ ...f, mode_paiement: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Note (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 1er versement"
                    value={formVersement.note}
                    onChange={e => setFormVersement(f => ({ ...f, note: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={enregistrerVersement}
                  disabled={saving || !formVersement.montant}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => { setShowModal(false); setWarnDepassement(false) }}
                  className="flex-1 border py-2 rounded-lg hover:bg-gray-50 text-sm transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  /* ══════════════════════════════════════════════════════════════════
     VUE GLOBALE
  ══════════════════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="text-xl font-bold">Finances</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/finances/parametres" className="text-indigo-200 hover:text-white text-sm">⚙️ Paramètres</Link>
          <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* 3 cartes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total attendu', value: totalAttendu, icon: '💰', color: 'bg-indigo-600' },
            { label: 'Total encaissé', value: totalEncaisse, icon: '✅', color: 'bg-green-600' },
            { label: 'Total restant', value: totalRestant, icon: '🔴', color: 'bg-red-500' },
          ].map((c, i) => (
            <div key={i} className={`${c.color} text-white rounded-2xl p-5`}>
              <p className="text-sm opacity-80 mb-1">{c.icon} {c.label}</p>
              <p className="text-2xl sm:text-3xl font-bold">{c.value.toLocaleString()} <span className="text-base font-normal opacity-70">FCFA</span></p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['tous','solde','partiel','non_paye'] as Filtre[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${filtre === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
            >
              {f === 'tous' ? 'Tous' : f === 'solde' ? '✅ Soldés' : f === 'partiel' ? '🟡 Partiels' : '🔴 Non payés'}
            </button>
          ))}
          <select
            value={filtreClasse}
            onChange={e => setFiltreClasse(e.target.value)}
            className="px-3 py-1.5 rounded-full text-sm border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="toutes">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <input
            type="text"
            placeholder="Rechercher un étudiant..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 rounded-full text-sm border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[180px]"
          />
        </div>

        {/* Tableau */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Chargement...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h1 className="font-bold text-gray-900">Étudiants ({etudiantsFiltres.length})</h1>
            </div>
            {etudiantsFiltres.length === 0 ? (
              <div className="text-center py-10 text-gray-400">Aucun étudiant ne correspond aux filtres.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left">Nom Prénom</th>
                      <th className="px-5 py-3 text-left">Classe</th>
                      <th className="px-5 py-3 text-right">Total dû</th>
                      <th className="px-5 py-3 text-right">Payé</th>
                      <th className="px-5 py-3 text-right">Reste</th>
                      <th className="px-5 py-3 text-center">Statut</th>
                      <th className="px-5 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {etudiantsFiltres.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">{e.nom} {e.prenom}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{e.classe_nom}</td>
                        <td className="px-5 py-3 text-sm text-right text-gray-700">{e.total_du.toLocaleString()}</td>
                        <td className="px-5 py-3 text-sm text-right text-green-700 font-medium">{e.total_paye.toLocaleString()}</td>
                        <td className="px-5 py-3 text-sm text-right font-semibold text-red-600">{Math.max(0, e.reste).toLocaleString()}</td>
                        <td className="px-5 py-3 text-center">
                          <StatutBadge statut={e.statut_paiement} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => ouvrirDetailEtudiant(e)}
                            className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50 transition"
                          >
                            Voir détail →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function StatutBadge({ statut }: { statut: EtudiantFinance['statut_paiement'] }) {
  if (statut === 'solde')    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">✅ Soldé</span>
  if (statut === 'partiel')  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">🟡 Partiel</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">🔴 Non payé</span>
}
