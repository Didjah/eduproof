'use client'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type User = { id: string; nom: string; prenom: string; role: string; email: string }

const ALL_MODULES = [
  { href: "/admin/etudiants",   icon: "👨‍🎓", label: "Étudiants",         roles: ["admin", "secretaire"] },
  { href: "/admin/presences",   icon: "📋",   label: "Présences",         roles: ["admin", "prof", "surveillant"] },
  { href: "/admin/notes",       icon: "📊",   label: "Notes",             roles: ["admin", "prof"] },
  { href: "/admin/bulletins",   icon: "📋",   label: "Bulletins",         roles: ["admin", "prof"] },
  { href: "/admin/finances",    icon: "💰",   label: "Finances",          roles: ["admin", "secretaire"] },
  { href: "/admin/classes",     icon: "🏫",   label: "Classes",           roles: ["admin"] },
  { href: "/admin/matieres",    icon: "📚",   label: "Matières",          roles: ["admin", "prof"] },
  { href: "/admin/cahier",      icon: "📓",   label: "Cahier de textes",  roles: ["admin", "prof"] },
  { href: "/admin/annonces",    icon: "📢",   label: "Annonces",          roles: ["admin", "secretaire"] },
  { href: "/admin/utilisateurs", icon: "👥",  label: "Utilisateurs",      roles: ["admin"] },
  { href: "/admin/parametres",  icon: "⚙️",  label: "Paramètres",        roles: ["admin"] },
  { href: "/admin/import",      icon: "📥",  label: "Import",             roles: ["admin"] },
  { href: "/parents/bulletins", icon: "📄",   label: "Bulletins scolaires", roles: ["parent"] },
]

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrateur",
  secretaire:  "Secrétaire",
  prof:        "Professeur",
  surveillant: "Surveillant",
  parent:      "Parent",
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState({ etudiants: 0, classes: 0, paiements: 0 })
  const [nomEcole, setNomEcole] = useState("")

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u = raw ? JSON.parse(raw) : null
      if (u?.role) setUser(u)
    } catch { /* layout handles redirect */ }

    async function loadStats() {
      const [{ count: e }, { count: c }, { count: p }, { data: ecole }] = await Promise.all([
        supabase.from('etudiants').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('paiements').select('*', { count: 'exact', head: true }),
        supabase.from('ecoles').select('nom').limit(1).maybeSingle(),
      ])
      setStats({ etudiants: e || 0, classes: c || 0, paiements: p || 0 })
      if (ecole?.nom) setNomEcole(ecole.nom)
    }
    loadStats()
  }, [])

  function logout() {
    localStorage.removeItem('eduproof_user')
    router.replace('/login')
  }

  const modules = user
    ? ALL_MODULES.filter(m => m.roles.includes(user.role))
    : []

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-xl font-bold">{nomEcole || "EduProof — Admin"}</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold">{user.prenom} {user.nom}</span>
                <span className="text-xs text-indigo-200">{ROLE_LABELS[user.role] ?? user.role}</span>
              </div>
            )}
            <button
              onClick={logout}
              className="bg-indigo-800 hover:bg-indigo-900 text-white text-sm px-3 py-1.5 rounded-lg transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
        {user && (
          <p className="sm:hidden text-xs text-indigo-200 mt-1">
            {user.prenom} {user.nom} · {ROLE_LABELS[user.role] ?? user.role}
          </p>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {[
            { label: "Étudiants", value: stats.etudiants, icon: "👨‍🎓", color: "bg-blue-500" },
            { label: "Classes",   value: stats.classes,   icon: "🏫",   color: "bg-green-500" },
            { label: "Paiements", value: stats.paiements, icon: "💰",   color: "bg-yellow-500" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className={`${s.color} text-white rounded-xl p-3 text-2xl`}>{s.icon}</div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modules */}
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {modules.map((m, i) => (
            <Link key={i} href={m.href}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col items-center gap-3 text-center">
              <span className="text-3xl">{m.icon}</span>
              <span className="text-sm font-medium text-gray-700">{m.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
