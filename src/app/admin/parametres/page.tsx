'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type Ecole = {
  id: string
  nom: string
  type: string
  ville: string
  pays: string
  telephone: string
  email: string
  annee_scolaire: string
  cycles: string[]
}

const CYCLES_OPTIONS = ["Primaire", "Secondaire", "Supérieur", "Professionnel"]
const TYPES_ECOLE = ["Primaire", "Secondaire", "Supérieur", "Professionnel", "Mixte", "Public", "Privé"]

export default function ParametresPage() {
  const [ecole, setEcole] = useState<Ecole | null>(null)
  const [loading, setLoading] = useState(true)

  const [infoForm, setInfoForm] = useState({ nom: "", type: "", ville: "", pays: "", telephone: "", email: "" })
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState("")

  const [annee, setAnnee] = useState("2025-2026")
  const [savingAnnee, setSavingAnnee] = useState(false)
  const [anneeMsg, setAnneeMsg] = useState("")

  const [cycles, setCycles] = useState<string[]>([])
  const [newCycle, setNewCycle] = useState("")
  const [savingCycles, setSavingCycles] = useState(false)

  useEffect(() => { loadEcole() }, [])

  async function loadEcole() {
    setLoading(true)
    const { data } = await supabase.from('ecoles').select('*').limit(1).maybeSingle()
    if (data) {
      setEcole(data)
      setInfoForm({
        nom: data.nom || "",
        type: data.type || "",
        ville: data.ville || "",
        pays: data.pays || "",
        telephone: data.telephone || "",
        email: data.email || "",
      })
      setAnnee(data.annee_scolaire || "2025-2026")
      setCycles(Array.isArray(data.cycles) ? data.cycles : [])
    }
    setLoading(false)
  }

  async function saveInfo() {
    setSavingInfo(true)
    setInfoMsg("")
    if (ecole?.id) {
      await supabase.from('ecoles').update(infoForm).eq('id', ecole.id)
    } else {
      const { data } = await supabase
        .from('ecoles')
        .insert([{ ...infoForm, annee_scolaire: annee, cycles }])
        .select()
        .single()
      if (data) setEcole(data)
    }
    setSavingInfo(false)
    setInfoMsg("Informations enregistrées ✓")
    setTimeout(() => setInfoMsg(""), 3000)
    loadEcole()
  }

  async function saveAnnee() {
    setSavingAnnee(true)
    setAnneeMsg("")
    if (ecole?.id) {
      await supabase.from('ecoles').update({ annee_scolaire: annee }).eq('id', ecole.id)
    } else {
      const { data } = await supabase
        .from('ecoles')
        .insert([{ ...infoForm, annee_scolaire: annee, cycles }])
        .select()
        .single()
      if (data) setEcole(data)
    }
    setSavingAnnee(false)
    setAnneeMsg("Année scolaire mise à jour ✓")
    setTimeout(() => setAnneeMsg(""), 3000)
    loadEcole()
  }

  async function addCycle() {
    if (!newCycle || cycles.includes(newCycle)) return
    await persistCycles([...cycles, newCycle])
    setNewCycle("")
  }

  async function removeCycle(c: string) {
    await persistCycles(cycles.filter(x => x !== c))
  }

  async function persistCycles(updated: string[]) {
    setSavingCycles(true)
    if (ecole?.id) {
      await supabase.from('ecoles').update({ cycles: updated }).eq('id', ecole.id)
      setCycles(updated)
    } else {
      const { data } = await supabase
        .from('ecoles')
        .insert([{ ...infoForm, annee_scolaire: annee, cycles: updated }])
        .select()
        .single()
      if (data) setEcole(data)
      setCycles(updated)
    }
    setSavingCycles(false)
  }

  const availableCycles = CYCLES_OPTIONS.filter(c => !cycles.includes(c))

  if (loading) return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          <span className="text-xl font-bold">Paramètres</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>
      <div className="text-center py-12 text-gray-400">Chargement...</div>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          <span className="text-xl font-bold">Paramètres</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">

        {/* Section 1 — Informations de l'école */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">🏫 Informations de l&apos;école</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;école</label>
              <input
                placeholder="Ex : Lycée Sainte-Marie"
                value={infoForm.nom}
                onChange={e => setInfoForm({ ...infoForm, nom: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={infoForm.type}
                onChange={e => setInfoForm({ ...infoForm, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— Choisir —</option>
                {TYPES_ECOLE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                placeholder="Ex : Abidjan"
                value={infoForm.ville}
                onChange={e => setInfoForm({ ...infoForm, ville: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
              <input
                placeholder="Ex : Côte d'Ivoire"
                value={infoForm.pays}
                onChange={e => setInfoForm({ ...infoForm, pays: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                placeholder="Ex : +225 07 00 00 00 00"
                value={infoForm.telephone}
                onChange={e => setInfoForm({ ...infoForm, telephone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="Ex : contact@ecole.ci"
                value={infoForm.email}
                onChange={e => setInfoForm({ ...infoForm, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={saveInfo}
              disabled={savingInfo}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {savingInfo ? "Enregistrement..." : "Enregistrer"}
            </button>
            {infoMsg && <span className="text-sm text-green-600">{infoMsg}</span>}
          </div>
        </div>

        {/* Section 2 — Année scolaire */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">📅 Année scolaire</h2>
          {ecole?.annee_scolaire && (
            <p className="text-sm text-gray-500 mb-4">
              Année active&nbsp;:&nbsp;
              <span className="font-semibold text-indigo-700">{ecole.annee_scolaire}</span>
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              placeholder="Ex : 2025-2026"
              value={annee}
              onChange={e => setAnnee(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={saveAnnee}
              disabled={savingAnnee}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {savingAnnee ? "Enregistrement..." : "Mettre à jour"}
            </button>
          </div>
          {anneeMsg && <p className="text-sm text-green-600 mt-2">{anneeMsg}</p>}
        </div>

        {/* Section 3 — Cycles scolaires */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">🎓 Cycles scolaires</h2>

          {cycles.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-5">
              {cycles.map(c => (
                <span key={c} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-1.5 rounded-full text-sm font-medium">
                  {c}
                  <button
                    onClick={() => removeCycle(c)}
                    disabled={savingCycles}
                    className="text-indigo-400 hover:text-red-500 transition text-base leading-none font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-5">Aucun cycle défini.</p>
          )}

          {availableCycles.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={newCycle}
                onChange={e => setNewCycle(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— Ajouter un cycle —</option>
                {availableCycles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={addCycle}
                disabled={!newCycle || savingCycles}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                Ajouter
              </button>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
