'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

/*
  SQL à exécuter UNE FOIS dans le dashboard Supabase (SQL Editor) :

  ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS telephone text,
    ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'actif';

  CREATE TABLE IF NOT EXISTS prof_matieres (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prof_id uuid REFERENCES utilisateurs(id) ON DELETE CASCADE,
    matiere_id uuid REFERENCES matieres(id) ON DELETE CASCADE,
    UNIQUE(prof_id, matiere_id)
  );
*/

type Utilisateur = {
  id: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  role: string
  pin: string
  statut: string
}

type Matiere = { id: string; nom: string }

const ROLE_LABELS: Record<string, string> = {
  prof:        "Professeur",
  secretaire:  "Secrétaire",
  surveillant: "Surveillant",
  parent:      "Parent",
  admin:       "Administrateur",
}

const ROLE_BADGE: Record<string, string> = {
  prof:        "bg-blue-100 text-blue-700",
  secretaire:  "bg-purple-100 text-purple-700",
  surveillant: "bg-orange-100 text-orange-700",
  parent:      "bg-green-100 text-green-700",
  admin:       "bg-indigo-100 text-indigo-700",
}

const EMPTY_FORM = {
  prenom:    "",
  nom:       "",
  role:      "prof",
  email:     "",
  telephone: "",
  pin:       "",
  statut:    "actif",
}

type FormState = typeof EMPTY_FORM

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [accesRefuse, setAccesRefuse] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [filtre, setFiltre] = useState("tous")
  const [pinVisible, setPinVisible] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u = raw ? JSON.parse(raw) : null
      if (!u || u.role !== 'admin') {
        setAccesRefuse(true)
      } else {
        setCurrentUserId(u.id)
      }
    } catch {
      setAccesRefuse(true)
    }
  }, [])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: users }, { data: mats }] = await Promise.all([
      supabase
        .from('utilisateurs')
        .select('id, nom, prenom, email, telephone, role, pin, statut')
        .order('nom'),
      supabase.from('matieres').select('id, nom').order('nom'),
    ])
    setUtilisateurs(users || [])
    setMatieres(mats || [])
    setLoading(false)
  }

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSelectedMatieres([])
    setShowModal(true)
  }

  async function openEdit(u: Utilisateur) {
    setEditingId(u.id)
    setForm({
      prenom:    u.prenom,
      nom:       u.nom,
      role:      u.role,
      email:     u.email || "",
      telephone: u.telephone || "",
      pin:       u.pin,
      statut:    u.statut || "actif",
    })
    if (u.role === 'prof') {
      const { data } = await supabase
        .from('prof_matieres')
        .select('matiere_id')
        .eq('prof_id', u.id)
      setSelectedMatieres((data || []).map(r => r.matiere_id))
    } else {
      setSelectedMatieres([])
    }
    setShowModal(true)
  }

  async function saveUser() {
    if (!form.prenom.trim() || !form.nom.trim() || form.pin.length < 4) return
    setSaving(true)

    const payload = {
      prenom:    form.prenom.trim(),
      nom:       form.nom.trim(),
      role:      form.role,
      email:     form.email.trim() || null,
      telephone: form.telephone.trim() || null,
      pin:       form.pin,
      statut:    form.statut,
    }

    let userId = editingId

    if (editingId) {
      await supabase.from('utilisateurs').update(payload).eq('id', editingId)
    } else {
      const { data } = await supabase
        .from('utilisateurs')
        .insert([payload])
        .select('id')
        .single()
      userId = data?.id ?? null
    }

    if (form.role === 'prof' && userId) {
      await supabase.from('prof_matieres').delete().eq('prof_id', userId)
      if (selectedMatieres.length > 0) {
        await supabase.from('prof_matieres').insert(
          selectedMatieres.map(mid => ({ prof_id: userId, matiere_id: mid }))
        )
      }
    }

    setSaving(false)
    setShowModal(false)
    loadData()
  }

  async function toggleStatut(u: Utilisateur) {
    const newStatut = u.statut === 'actif' ? 'inactif' : 'actif'
    await supabase.from('utilisateurs').update({ statut: newStatut }).eq('id', u.id)
    loadData()
  }

  function togglePin(id: string) {
    setPinVisible(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleMatiere(id: string) {
    setSelectedMatieres(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const filtered = utilisateurs.filter(u => {
    if (u.id === currentUserId) return false
    if (u.role === 'admin') return false
    if (filtre === 'tous') return true
    return u.role === filtre
  })

  const filtres = [
    { val: 'tous',        label: 'Tous' },
    { val: 'prof',        label: 'Professeurs' },
    { val: 'secretaire',  label: 'Secrétaires' },
    { val: 'surveillant', label: 'Surveillants' },
    { val: 'parent',      label: 'Parents' },
  ]

  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <p className="text-sm text-gray-500 mb-6">Seuls les administrateurs peuvent accéder à cette page.</p>
        <Link href="/admin" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          ← Tableau de bord
        </Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <span className="text-xl font-bold">Utilisateurs</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs ({filtered.length})</h1>
          <button
            onClick={openAdd}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            ➕ Ajouter un utilisateur
          </button>
        </div>

        {/* Filtres par rôle */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filtres.map(f => (
            <button
              key={f.val}
              onClick={() => setFiltre(f.val)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                filtre === f.val
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tableau */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">👥</p>
            <p>Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Nom Prénom</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Rôle</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">PIN</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {u.nom} {u.prenom}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{u.email || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-700 tracking-widest">
                          {pinVisible[u.id] ? u.pin : "••••"}
                        </span>
                        <button
                          onClick={() => togglePin(u.id)}
                          className="text-gray-400 hover:text-gray-600 text-base leading-none"
                          title={pinVisible[u.id] ? "Masquer" : "Afficher"}
                        >
                          {pinVisible[u.id] ? "🙈" : "👁"}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        u.statut === 'actif'
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {u.statut === 'actif' ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleStatut(u)}
                          className={`text-sm font-medium ${
                            u.statut === 'actif'
                              ? "text-orange-500 hover:text-orange-700"
                              : "text-green-600 hover:text-green-800"
                          }`}
                        >
                          {u.statut === 'actif' ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajout / modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none font-medium"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input
                    value={form.prenom}
                    onChange={e => setForm({ ...form, prenom: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    value={form.nom}
                    onChange={e => setForm({ ...form, nom: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select
                  value={form.role}
                  onChange={e => {
                    setForm({ ...form, role: e.target.value })
                    if (e.target.value !== 'prof') setSelectedMatieres([])
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="prof">Professeur</option>
                  <option value="secretaire">Secrétaire</option>
                  <option value="surveillant">Surveillant</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="optionnel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    value={form.telephone}
                    onChange={e => setForm({ ...form, telephone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="optionnel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4 chiffres) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.pin}
                    onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono tracking-[0.3em]"
                    placeholder="••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={form.statut}
                    onChange={e => setForm({ ...form, statut: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>

              {/* Section matières (prof uniquement) */}
              {form.role === 'prof' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Matières enseignées
                    {selectedMatieres.length > 0 && (
                      <span className="ml-2 text-xs text-indigo-600 font-normal">
                        ({selectedMatieres.length} sélectionnée{selectedMatieres.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  {matieres.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      Aucune matière disponible — créez-en d'abord dans le module Matières.
                    </p>
                  ) : (
                    <div className="border rounded-lg p-3 max-h-44 overflow-y-auto bg-gray-50">
                      <div className="grid grid-cols-2 gap-1.5">
                        {matieres.map(m => (
                          <label
                            key={m.id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white rounded px-1.5 py-1 transition"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMatieres.includes(m.id)}
                              onChange={() => toggleMatiere(m.id)}
                              className="accent-indigo-600 shrink-0"
                            />
                            <span className="text-gray-700 truncate">{m.nom}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={saveUser}
                disabled={saving || !form.prenom.trim() || !form.nom.trim() || form.pin.length < 4}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
              >
                {saving
                  ? "Enregistrement..."
                  : editingId
                  ? "Mettre à jour"
                  : "Créer le compte"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border py-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition"
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
