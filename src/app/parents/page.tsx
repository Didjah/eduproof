'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type ParentUser = { id: string; nom: string; prenom: string; role: string; email: string }
type Etudiant   = { id: string; nom: string; prenom: string; statut: string; classe_id?: string | null }
type Presence   = { id: string; etudiant_id: string; statut: string; date: string }
type Note       = { id: string; etudiant_id: string; valeur: number; type_eval: string; date: string }
type Paiement   = { id: string; etudiant_id: string; montant: number; type: string; statut: string; date_paiement: string }

type Tab = 'enfants' | 'absences' | 'notes' | 'paiements'

const PRESENCE_LABELS: Record<string, { label: string; cls: string }> = {
  absent:  { label: 'Absent',  cls: 'bg-red-100 text-red-700' },
  retard:  { label: 'Retard',  cls: 'bg-yellow-100 text-yellow-700' },
  present: { label: 'Présent', cls: 'bg-green-100 text-green-700' },
}

const PAIEMENT_LABELS: Record<string, { label: string; cls: string }> = {
  paye:       { label: 'Payé',       cls: 'bg-green-100 text-green-700' },
  en_attente: { label: 'En attente', cls: 'bg-yellow-100 text-yellow-700' },
  partiel:    { label: 'Partiel',    cls: 'bg-orange-100 text-orange-700' },
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ParentsPage() {
  const [view, setView]           = useState<'login' | 'dashboard'>('login')
  const [parent, setParent]       = useState<ParentUser | null>(null)
  const [form, setForm]           = useState({ identifier: '', pin: '' })
  const [loginError, setLoginError] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  const [enfants, setEnfants]     = useState<Etudiant[]>([])
  const [presences, setPresences] = useState<Presence[]>([])
  const [notes, setNotes]         = useState<Note[]>([])
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('enfants')

  const loadDashboard = useCallback(async (parentId: string) => {
    setDataLoading(true)
    const { data: kids } = await supabase
      .from('etudiants')
      .select('id, nom, prenom, statut, classe_id')
      .eq('parent_id', parentId)

    const enfantsList = kids || []
    setEnfants(enfantsList)

    if (enfantsList.length > 0) {
      const ids = enfantsList.map(k => k.id)
      const [{ data: pres }, { data: nts }, { data: pays }] = await Promise.all([
        supabase.from('presences').select('id, etudiant_id, statut, date')
          .in('etudiant_id', ids).order('date', { ascending: false }).limit(15),
        supabase.from('notes').select('id, etudiant_id, valeur, type_eval, date')
          .in('etudiant_id', ids).order('date', { ascending: false }).limit(15),
        supabase.from('paiements').select('id, etudiant_id, montant, type, statut, date_paiement')
          .in('etudiant_id', ids).order('date_paiement', { ascending: false }).limit(15),
      ])
      setPresences(pres || [])
      setNotes(nts || [])
      setPaiements(pays || [])
    }
    setDataLoading(false)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_parent')
      const p = raw ? JSON.parse(raw) : null
      if (p?.role === 'parent') {
        setParent(p)
        setView('dashboard')
        loadDashboard(p.id)
      }
    } catch { /* ignore */ }
  }, [loadDashboard])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(false)
    setLoginLoading(true)
    const id = form.identifier.trim().toLowerCase()

    const { data } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, role, email')
      .eq('role', 'parent')
      .eq('pin', form.pin)
      .or(`email.eq.${id},telephone.eq.${id}`)
      .single()

    setLoginLoading(false)

    if (data) {
      localStorage.setItem('eduproof_parent', JSON.stringify(data))
      setParent(data)
      setView('dashboard')
      loadDashboard(data.id)
    } else {
      setLoginError(true)
      setForm(f => ({ ...f, pin: '' }))
    }
  }

  function logout() {
    localStorage.removeItem('eduproof_parent')
    setParent(null)
    setView('login')
    setEnfants([])
    setPresences([])
    setNotes([])
    setPaiements([])
    setForm({ identifier: '', pin: '' })
    setActiveTab('enfants')
  }

  function getEnfantName(id: string) {
    const e = enfants.find(k => k.id === id)
    return e ? `${e.prenom} ${e.nom}` : '—'
  }

  // ── LOGIN VIEW ──────────────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-green-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center text-2xl font-bold mb-3">
              E
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EduProof</h1>
            <p className="text-sm text-gray-500 mt-1">Espace parents</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email ou téléphone
              </label>
              <input
                type="text"
                value={form.identifier}
                onChange={e => { setForm({ ...form, identifier: e.target.value }); setLoginError(false) }}
                placeholder="votre@email.com ou 06 12 34 56 78"
                autoFocus
                required
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code PIN
              </label>
              <input
                type="password"
                value={form.pin}
                onChange={e => { setForm({ ...form, pin: e.target.value }); setLoginError(false) }}
                placeholder="••••••"
                required
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900"
              />
            </div>

            {loginError && (
              <p className="text-sm text-red-500 text-center">Identifiants incorrects</p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {loginLoading ? 'Vérification...' : 'Connexion'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── DASHBOARD VIEW ──────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'enfants',   label: 'Mes enfants', icon: '👨‍👧' },
    { id: 'absences',  label: 'Absences',    icon: '📋' },
    { id: 'notes',     label: 'Notes',       icon: '📊' },
    { id: 'paiements', label: 'Paiements',   icon: '💰' },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-700 text-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-xl font-bold">EduProof</span>
          </div>
          <div className="flex items-center gap-3">
            {parent && (
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold">{parent.prenom} {parent.nom}</span>
                <span className="text-xs text-green-200">Parent</span>
              </div>
            )}
            <button
              onClick={logout}
              className="bg-green-800 hover:bg-green-900 text-white text-sm px-3 py-1.5 rounded-lg transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
        {parent && (
          <p className="sm:hidden text-xs text-green-200 mt-1">
            {parent.prenom} {parent.nom} · Parent
          </p>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Welcome */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Bonjour, {parent?.prenom} 👋
        </h1>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Enfants',   value: enfants.length,  icon: '👧', color: 'bg-green-500' },
            { label: 'Absences',  value: presences.filter(p => p.statut === 'absent').length,  icon: '⚠️', color: 'bg-red-400' },
            { label: 'En attente', value: paiements.filter(p => p.statut === 'en_attente').length, icon: '💳', color: 'bg-yellow-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-1 text-center">
              <div className={`${s.color} text-white rounded-xl w-10 h-10 flex items-center justify-center text-lg`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-max flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === t.id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="text-center text-gray-400 py-16 text-sm">Chargement...</div>
        ) : (
          <>
            {/* ── ENFANTS ── */}
            {activeTab === 'enfants' && (
              <div className="flex flex-col gap-3">
                {enfants.length === 0 ? (
                  <p className="text-center text-gray-400 py-16 text-sm">Aucun enfant associé à ce compte.</p>
                ) : enfants.map(e => (
                  <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                    <div className="bg-green-100 text-green-700 rounded-xl w-12 h-12 flex items-center justify-center text-xl font-bold shrink-0">
                      {e.prenom[0]}{e.nom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{e.prenom} {e.nom}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {notes.filter(n => n.etudiant_id === e.id).length} note(s) · {presences.filter(p => p.etudiant_id === e.id && p.statut === 'absent').length} absence(s)
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      e.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {e.statut}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── ABSENCES ── */}
            {activeTab === 'absences' && (
              <div className="flex flex-col gap-3">
                {presences.length === 0 ? (
                  <p className="text-center text-gray-400 py-16 text-sm">Aucune donnée de présence.</p>
                ) : presences.map(p => {
                  const badge = PRESENCE_LABELS[p.statut] ?? { label: p.statut, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <div key={p.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{getEnfantName(p.etudiant_id)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmt(p.date)}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── NOTES ── */}
            {activeTab === 'notes' && (
              <div className="flex flex-col gap-3">
                {notes.length === 0 ? (
                  <p className="text-center text-gray-400 py-16 text-sm">Aucune note disponible.</p>
                ) : notes.map(n => (
                  <div key={n.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                      n.valeur >= 14 ? 'bg-green-100 text-green-700'
                        : n.valeur >= 10 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {n.valeur}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{getEnfantName(n.etudiant_id)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.type_eval} · {fmt(n.date)}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">/20</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── PAIEMENTS ── */}
            {activeTab === 'paiements' && (
              <div className="flex flex-col gap-3">
                {paiements.length === 0 ? (
                  <p className="text-center text-gray-400 py-16 text-sm">Aucun paiement enregistré.</p>
                ) : paiements.map(p => {
                  const badge = PAIEMENT_LABELS[p.statut] ?? { label: p.statut, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <div key={p.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{getEnfantName(p.etudiant_id)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.type} · {fmt(p.date_paiement)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-semibold text-gray-900 text-sm">{p.montant.toLocaleString('fr-FR')} F</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
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
