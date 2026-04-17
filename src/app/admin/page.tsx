'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function AdminDashboard() {
  const [stats, setStats] = useState({ etudiants: 0, classes: 0, paiements: 0 })

  useEffect(() => {
    async function loadStats() {
      const [{ count: e }, { count: c }, { count: p }] = await Promise.all([
        supabase.from('etudiants').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('paiements').select('*', { count: 'exact', head: true }),
      ])
      setStats({ etudiants: e || 0, classes: c || 0, paiements: p || 0 })
    }
    loadStats()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="text-xl font-bold">EduProof — Admin</span>
        </div>
        <Link href="/" className="text-indigo-200 hover:text-white text-sm">← Accueil</Link>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: "Étudiants", value: stats.etudiants, icon: "👨‍🎓", color: "bg-blue-500" },
            { label: "Classes", value: stats.classes, icon: "🏫", color: "bg-green-500" },
            { label: "Paiements", value: stats.paiements, icon: "💰", color: "bg-yellow-500" },
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

        {/* Navigation modules */}
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/admin/etudiants", icon: "👨‍🎓", label: "Étudiants" },
            { href: "/admin/presences", icon: "📋", label: "Présences" },
            { href: "/admin/notes", icon: "📊", label: "Notes" },
            { href: "/admin/finances", icon: "💰", label: "Finances" },
            { href: "/admin/classes", icon: "🏫", label: "Classes" },
            { href: "/admin/matieres", icon: "📚", label: "Matières" },
            { href: "/admin/annonces", icon: "📢", label: "Annonces" },
            { href: "/admin/parametres", icon: "⚙️", label: "Paramètres" },
          ].map((m, i) => (
            <Link key={i} href={m.href} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col items-center gap-3 text-center">
              <span className="text-3xl">{m.icon}</span>
              <span className="text-sm font-medium text-gray-700">{m.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
