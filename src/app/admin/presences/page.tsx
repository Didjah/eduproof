'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type Etudiant = { id: string; nom: string; prenom: string }
type Classe = { id: string; nom: string }
type Presence = { etudiant_id: string; statut: string }

export default function PresencesPage() {
  const [classes, setClasses] = useState<Classe[]>([])
  const [etudiants, setEtudiants] = useState<Etudiant[]>([])
  const [selectedClasse, setSelectedClasse] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [presences, setPresences] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('classes').select('*').order('nom').then(({ data }) => setClasses(data || []))
  }, [])

  useEffect(() => {
    if (!selectedClasse) return
    supabase.from('etudiants').select('*').eq('classe_id', selectedClasse).order('nom').then(({ data }) => {
      setEtudiants(data || [])
      const init: Record<string, string> = {}
      data?.forEach(e => init[e.id] = 'present')
      setPresences(init)
    })
  }, [selectedClasse])

  async function savePresences() {
    setSaving(true)
    const rows = Object.entries(presences).map(([etudiant_id, statut]) => ({
      etudiant_id, classe_id: selectedClasse, date, statut
    }))
    await supabase.from('presences').upsert(rows, { onConflict: 'etudiant_id,date' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const stats = {
    present: Object.values(presences).filter(s => s === 'present').length,
    absent: Object.values(presences).filter(s => s === 'absent').length,
    retard: Object.values(presences).filter(s => s === 'retard').length,
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📋</span>
          <span className="text-xl font-bold">Présences</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Sélection classe + date */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Paramètres de l'appel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Classe</label>
              <select value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Sélectionner une classe</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
        </div>

        {selectedClasse && etudiants.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Présents", value: stats.present, color: "bg-green-100 text-green-700" },
                { label: "Absents", value: stats.absent, color: "bg-red-100 text-red-700" },
                { label: "Retards", value: stats.retard, color: "bg-yellow-100 text-yellow-700" },
              ].map((s, i) => (
                <div key={i} className={`${s.color} rounded-2xl p-4 text-center`}>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Liste appel */}
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto mb-6">
              <table className="w-full min-w-[400px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Étudiant</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-green-600">✅ Présent</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-red-600">❌ Absent</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-yellow-600">⏰ Retard</th>
                  </tr>
                </thead>
                <tbody>
                  {etudiants.map((e, i) => (
                    <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-4 font-medium text-gray-900">{e.nom} {e.prenom}</td>
                      {['present', 'absent', 'retard'].map(statut => (
                        <td key={statut} className="text-center px-4 py-4">
                          <input type="radio" name={e.id} value={statut}
                            checked={presences[e.id] === statut}
                            onChange={() => setPresences({...presences, [e.id]: statut})}
                            className="w-4 h-4 cursor-pointer" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={savePresences} disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
              {saving ? "Enregistrement..." : saved ? "✅ Enregistré !" : "Enregistrer les présences"}
            </button>
          </>
        )}

        {selectedClasse && etudiants.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">👨‍🎓</p>
            <p>Aucun étudiant dans cette classe.</p>
          </div>
        )}
      </div>
    </main>
  )
}
