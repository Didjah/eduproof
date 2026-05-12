'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type ClasseFrais = {
  classe_id: string
  nom: string
  montant_total: number
  frais_id: string | null
}

const ANNEE = '2025-2026'

export default function FinancesParametresPage() {
  const [classes, setClasses] = useState<ClasseFrais[]>([])
  const [montants, setMontants] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [accesRefuse, setAccesRefuse] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || !['admin', 'secretaire'].includes(u.role)) setAccesRefuse(true)
    } catch { setAccesRefuse(true) }
  }, [])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [clRes, fraisRes] = await Promise.all([
      supabase.from('classes').select('id,nom').order('nom'),
      supabase.from('frais_scolarite').select('id,classe_id,montant_total').eq('annee_scolaire', ANNEE),
    ])
    const fraisMap: Record<string, { id: string; montant: number }> = {}
    for (const f of fraisRes.data || []) fraisMap[f.classe_id] = { id: f.id, montant: f.montant_total }

    const rows: ClasseFrais[] = (clRes.data || []).map(c => ({
      classe_id: c.id,
      nom: c.nom,
      montant_total: fraisMap[c.id]?.montant ?? 300000,
      frais_id: fraisMap[c.id]?.id ?? null,
    }))
    setClasses(rows)
    const m: Record<string, string> = {}
    rows.forEach(r => { m[r.classe_id] = String(r.montant_total) })
    setMontants(m)
    setLoading(false)
  }

  async function enregistrer() {
    setSaving(true)
    for (const cl of classes) {
      const montant = parseFloat(montants[cl.classe_id] || '0')
      if (isNaN(montant) || montant < 0) continue
      if (cl.frais_id) {
        await supabase.from('frais_scolarite').update({ montant_total: montant }).eq('id', cl.frais_id)
      } else {
        await supabase.from('frais_scolarite').insert([{ classe_id: cl.classe_id, annee_scolaire: ANNEE, montant_total: montant }])
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    loadData()
  }

  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <Link href="/admin" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">← Dashboard</Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/finances" className="text-indigo-200 hover:text-white">Finances</Link>
          <span className="text-indigo-400">›</span>
          <span className="font-semibold">Paramètres</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Frais de scolarité</h1>
            <p className="text-sm text-gray-500 mt-0.5">Année {ANNEE}</p>
          </div>
          <button
            onClick={enregistrer}
            disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        {saved && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            ✅ Montants enregistrés avec succès.
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Chargement...</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Aucune classe trouvée. Créez des classes d&apos;abord.</p>
            <Link href="/admin/classes" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">→ Gérer les classes</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Classe</th>
                  <th className="px-5 py-3 text-right">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.map(cl => (
                  <tr key={cl.classe_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{cl.nom}</td>
                    <td className="px-5 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={montants[cl.classe_id] ?? ''}
                        onChange={e => setMontants(m => ({ ...m, [cl.classe_id]: e.target.value }))}
                        className="w-36 border rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
              <button
                onClick={enregistrer}
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les montants'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
