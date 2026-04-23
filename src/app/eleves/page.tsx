'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Utilisateur = { id: string; nom: string; prenom: string; email: string; role: string }
type EtudiantData  = { id: string; classe_id: string | null }
type ClasseData    = { id: string; nom: string; annee_scolaire: string }

type Note = {
  id: string
  valeur: number
  type_eval: string
  date: string
  matieres: { nom: string } | null
}

type Absence = {
  id: string
  date: string
  statut: string
}

type Devoir = {
  id: string
  type: string
  titre: string
  contenu: string
  date_limite: string | null
  matieres: { nom: string } | null
}

const DEVOIR_STYLES: Record<string, string> = {
  Devoir: "bg-orange-100 text-orange-700",
  Examen: "bg-red-100 text-red-700",
}

export default function ElevesPage() {
  const [view, setView] = useState<'login' | 'dashboard'>('login')

  const [user, setUser]         = useState<Utilisateur | null>(null)
  const [etudiant, setEtudiant] = useState<EtudiantData | null>(null)
  const [classe, setClasse]     = useState<ClasseData | null>(null)
  const [notes, setNotes]       = useState<Note[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [devoirs, setDevoirs]   = useState<Devoir[]>([])
  const [loadingDash, setLoadingDash] = useState(false)

  const [identifier, setIdentifier] = useState("")
  const [pin, setPin]               = useState("")
  const [loginError, setLoginError] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_eleve')
      const saved = raw ? JSON.parse(raw) : null
      if (saved?.id) {
        setUser(saved)
        setView('dashboard')
        loadDashboard(saved)
      }
    } catch { /* ignore */ }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(false)
    setLoginLoading(true)

    const { data } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, email, role')
      .eq('email', identifier.trim().toLowerCase())
      .eq('pin', pin)
      .eq('role', 'etudiant')
      .maybeSingle()

    setLoginLoading(false)

    if (data) {
      localStorage.setItem('eduproof_eleve', JSON.stringify(data))
      setUser(data)
      setView('dashboard')
      loadDashboard(data)
    } else {
      setLoginError(true)
      setPin("")
    }
  }

  async function loadDashboard(u: Utilisateur) {
    setLoadingDash(true)

    const { data: etData } = await supabase
      .from('etudiants')
      .select('id, classe_id')
      .eq('email', u.email)
      .maybeSingle()

    if (!etData) { setLoadingDash(false); return }
    setEtudiant(etData)

    const jobs = [
      supabase.from('notes')
        .select('id, valeur, type_eval, date, matieres(nom)')
        .eq('etudiant_id', etData.id)
        .order('date', { ascending: false })
        .limit(6)
        .then(({ data }) => setNotes((data as Note[]) || [])),

      supabase.from('presences')
        .select('id, date, statut')
        .eq('etudiant_id', etData.id)
        .neq('statut', 'present')
        .order('date', { ascending: false })
        .limit(6)
        .then(({ data }) => setAbsences(data || [])),
    ]

    if (etData.classe_id) {
      jobs.push(
        supabase.from('classes')
          .select('id, nom, annee_scolaire')
          .eq('id', etData.classe_id)
          .maybeSingle()
          .then(({ data }) => { if (data) setClasse(data) }),

        supabase.from('cahier_textes')
          .select('id, type, titre, contenu, date_limite, matieres(nom)')
          .eq('classe_id', etData.classe_id)
          .in('type', ['Devoir', 'Examen'])
          .order('date_limite', { ascending: true, nullsFirst: false })
          .limit(5)
          .then(({ data }) => setDevoirs((data as Devoir[]) || []))
      )
    }

    await Promise.all(jobs)
    setLoadingDash(false)
  }

  function logout() {
    localStorage.removeItem('eduproof_eleve')
    setUser(null); setEtudiant(null); setClasse(null)
    setNotes([]); setAbsences([]); setDevoirs([])
    setIdentifier(""); setPin("")
    setView('login')
  }

  /* ── LOGIN ─────────────────────────────────────────────── */
  if (view === 'login') return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-violet-700 text-white rounded-2xl w-14 h-14 flex items-center justify-center text-2xl mb-3">
            🎓
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Espace Élève</h1>
          <p className="text-sm text-gray-500 mt-1">Connectez-vous à votre espace</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email ou identifiant</label>
            <input
              type="text"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setLoginError(false) }}
              placeholder="votre@email.com"
              autoFocus
              required
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setLoginError(false) }}
              placeholder="••••••"
              required
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-400 text-gray-900"
            />
          </div>
          {loginError && (
            <p className="text-sm text-red-500 text-center">Identifiants incorrects</p>
          )}
          <button
            type="submit"
            disabled={loginLoading}
            className="bg-violet-600 text-white py-2.5 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 transition"
          >
            {loginLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  )

  /* ── DASHBOARD ─────────────────────────────────────────── */
  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : ""
  const moyenne  = notes.length > 0
    ? (notes.reduce((s, n) => s + n.valeur, 0) / notes.length).toFixed(1)
    : null

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-violet-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="text-lg font-bold">Espace Élève</span>
        </div>
        <button onClick={logout} className="text-violet-200 hover:text-white text-sm transition">
          Déconnexion →
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Profile card */}
        <div className="bg-violet-700 text-white rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-full w-14 h-14 flex items-center justify-center text-xl font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold">{user?.prenom} {user?.nom}</p>
              {classe ? (
                <p className="text-violet-200 text-sm">{classe.nom} · {classe.annee_scolaire}</p>
              ) : etudiant ? (
                <p className="text-violet-300 text-sm">Classe non assignée</p>
              ) : (
                <p className="text-violet-300 text-sm">Profil introuvable dans les étudiants</p>
              )}
            </div>
          </div>
          {moyenne && (
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
              <span className={`text-2xl font-bold ${parseFloat(moyenne) >= 10 ? 'text-green-300' : 'text-red-300'}`}>
                {moyenne}/20
              </span>
              <span className="text-violet-200 text-sm">moyenne récente</span>
            </div>
          )}
        </div>

        {loadingDash ? (
          <div className="text-center py-16 text-gray-400">Chargement...</div>
        ) : (
          <>
            {/* Notes récentes */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                📊 Notes récentes
              </h2>
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Aucune note enregistrée.</p>
              ) : (
                <div className="divide-y">
                  {notes.map(n => (
                    <div key={n.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md font-medium shrink-0 max-w-[100px] truncate">
                          {n.matieres?.nom ?? "—"}
                        </span>
                        <span className="text-xs text-gray-400 truncate hidden sm:block">
                          {n.type_eval} · {n.date}
                        </span>
                        <span className="text-xs text-gray-400 sm:hidden">{n.date}</span>
                      </div>
                      <span className={`text-lg font-bold shrink-0 ml-3 ${n.valeur >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                        {n.valeur}/20
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Absences & retards */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                📋 Absences & retards
              </h2>
              {absences.length === 0 ? (
                <p className="text-sm text-green-600 text-center py-3">✅ Aucune absence enregistrée.</p>
              ) : (
                <div className="divide-y">
                  {absences.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-gray-600">{a.date}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        a.statut === 'absent'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {a.statut === 'absent' ? 'Absent' : 'Retard'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Devoirs & examens */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                📝 Devoirs & examens à venir
              </h2>
              {devoirs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Aucun devoir enregistré.</p>
              ) : (
                <div className="space-y-3">
                  {devoirs.map(d => (
                    <div key={d.id} className="border rounded-xl p-3.5">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${DEVOIR_STYLES[d.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {d.type}
                        </span>
                        {d.matieres?.nom && (
                          <span className="text-xs text-gray-500 font-medium">{d.matieres.nom}</span>
                        )}
                        {d.date_limite && (
                          <span className="ml-auto text-xs text-red-500 font-semibold shrink-0">
                            → {d.date_limite}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{d.titre}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{d.contenu}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </main>
  )
}
