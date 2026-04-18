'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Tab = 'classes' | 'matieres' | 'etudiants' | 'personnel'
type Result = { count: number; errors: number }

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'classes',   icon: '🏫', label: 'Classes'   },
  { id: 'matieres',  icon: '📚', label: 'Matières'  },
  { id: 'etudiants', icon: '👨‍🎓', label: 'Étudiants' },
  { id: 'personnel', icon: '👤', label: 'Personnel'  },
]

// ── CSV parsers ────────────────────────────────────────────────────────────────

function lines(csv: string) {
  return csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
}

function parseClasses(csv: string) {
  return lines(csv).map(l => {
    const [nom, niveau, annee_scolaire] = l.split(',').map(s => s.trim())
    return { nom, niveau: niveau ?? '', annee_scolaire: annee_scolaire ?? '2025-2026' }
  }).filter(r => r.nom)
}

function parseMatieres(csv: string) {
  return lines(csv).map(l => {
    const [nom, coefficient, type] = l.split(',').map(s => s.trim())
    const validTypes = ['cours', 'TP', 'stage']
    return {
      nom,
      coefficient: Number(coefficient) || 1,
      type: validTypes.includes(type) ? type : 'cours',
    }
  }).filter(r => r.nom)
}

function parseEtudiants(csv: string) {
  return lines(csv).map(l => {
    const [nom, prenom, email, whatsapp] = l.split(',').map(s => s.trim())
    return { nom, prenom: prenom ?? '', email: email ?? '', whatsapp: whatsapp ?? '', statut: 'actif' }
  }).filter(r => r.nom && r.prenom)
}

function parsePersonnel(csv: string) {
  const validRoles = ['admin', 'secretaire', 'prof', 'surveillant', 'parent']
  return lines(csv).map(l => {
    const [nom, prenom, email, pin, role] = l.split(',').map(s => s.trim())
    return {
      nom,
      prenom: prenom ?? '',
      email: email ?? '',
      pin: pin ?? '',
      role: validRoles.includes(role) ? role : 'prof',
    }
  }).filter(r => r.nom && r.prenom && r.email && r.pin)
}

// ── Bulk insert with chunking ──────────────────────────────────────────────────

async function bulkInsert(table: string, rows: Record<string, unknown>[]): Promise<Result> {
  if (rows.length === 0) return { count: 0, errors: 0 }
  const CHUNK = 100
  let inserted = 0
  let errors = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { data, error } = await supabase.from(table).insert(rows.slice(i, i + CHUNK)).select()
    if (error) errors += Math.min(CHUNK, rows.length - i)
    else inserted += data?.length ?? 0
  }
  return { count: inserted, errors }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>('classes')
  const [result, setResult] = useState<Result | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  // ── Classes state ──
  const [classesForm, setClassesForm] = useState({ nom: '', niveau: '', annee_scolaire: '2025-2026' })
  const [classesCsv, setClassesCsv]   = useState('')

  // ── Matières state ──
  const [matieresForm, setMatieresForm] = useState({ nom: '', coefficient: 1, type: 'cours' as 'cours' | 'TP' | 'stage' })
  const [matieresCsv, setMatieresCsv]   = useState('')

  // ── Étudiants state ──
  const [etudiantsForm, setEtudiantsForm] = useState({ nom: '', prenom: '', email: '', whatsapp: '' })
  const [etudiantsCsv, setEtudiantsCsv]   = useState('')

  // ── Personnel state ──
  const [personnelForm, setPersonnelForm] = useState({ nom: '', prenom: '', email: '', pin: '', role: 'prof' })
  const [personnelCsv, setPersonnelCsv]   = useState('')

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setResult(null)
  }

  // ── Single-record saves ────────────────────────────────────────────────────

  async function saveClasse() {
    if (!classesForm.nom.trim()) return
    setSaving(true)
    await supabase.from('classes').insert([classesForm])
    setClassesForm({ nom: '', niveau: '', annee_scolaire: '2025-2026' })
    setResult({ count: 1, errors: 0 })
    setSaving(false)
  }

  async function saveMatiere() {
    if (!matieresForm.nom.trim()) return
    setSaving(true)
    await supabase.from('matieres').insert([matieresForm])
    setMatieresForm({ nom: '', coefficient: 1, type: 'cours' })
    setResult({ count: 1, errors: 0 })
    setSaving(false)
  }

  async function saveEtudiant() {
    if (!etudiantsForm.nom.trim() || !etudiantsForm.prenom.trim()) return
    setSaving(true)
    await supabase.from('etudiants').insert([{ ...etudiantsForm, statut: 'actif' }])
    setEtudiantsForm({ nom: '', prenom: '', email: '', whatsapp: '' })
    setResult({ count: 1, errors: 0 })
    setSaving(false)
  }

  async function savePersonnel() {
    if (!personnelForm.nom.trim() || !personnelForm.prenom.trim() || !personnelForm.email.trim() || !personnelForm.pin.trim()) return
    setSaving(true)
    await supabase.from('utilisateurs').insert([personnelForm])
    setPersonnelForm({ nom: '', prenom: '', email: '', pin: '', role: 'prof' })
    setResult({ count: 1, errors: 0 })
    setSaving(false)
  }

  // ── Bulk CSV imports ───────────────────────────────────────────────────────

  async function importClasses() {
    const rows = parseClasses(classesCsv)
    if (rows.length === 0) return
    setImporting(true)
    const r = await bulkInsert('classes', rows as Record<string, unknown>[])
    setResult(r)
    if (r.errors === 0) setClassesCsv('')
    setImporting(false)
  }

  async function importMatieres() {
    const rows = parseMatieres(matieresCsv)
    if (rows.length === 0) return
    setImporting(true)
    const r = await bulkInsert('matieres', rows as Record<string, unknown>[])
    setResult(r)
    if (r.errors === 0) setMatieresCsv('')
    setImporting(false)
  }

  async function importEtudiants() {
    const rows = parseEtudiants(etudiantsCsv)
    if (rows.length === 0) return
    setImporting(true)
    const r = await bulkInsert('etudiants', rows as Record<string, unknown>[])
    setResult(r)
    if (r.errors === 0) setEtudiantsCsv('')
    setImporting(false)
  }

  async function importPersonnel() {
    const rows = parsePersonnel(personnelCsv)
    if (rows.length === 0) return
    setImporting(true)
    const r = await bulkInsert('utilisateurs', rows as Record<string, unknown>[])
    setResult(r)
    if (r.errors === 0) setPersonnelCsv('')
    setImporting(false)
  }

  // ── Shared UI helpers ──────────────────────────────────────────────────────

  const inputCls = 'border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 w-full'

  function CsvSection({
    hint, example, value, onChange, onImport, rowCount,
  }: {
    hint: string
    example: string
    value: string
    onChange: (v: string) => void
    onImport: () => void
    rowCount: number
  }) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-1">Import en masse (CSV)</h2>
        <p className="text-sm text-gray-500 mb-1">
          Format : <code className="bg-gray-100 px-1 rounded text-xs">{hint}</code>
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Exemple : <span className="font-mono">{example}</span>
        </p>
        <textarea
          value={value}
          onChange={e => { onChange(e.target.value); setResult(null) }}
          placeholder={'# Une ligne par enregistrement\n' + example}
          rows={6}
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y text-gray-900"
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3">
          <button
            onClick={onImport}
            disabled={importing || rowCount === 0}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition text-sm font-medium"
          >
            {importing ? 'Importation...' : `Analyser & Importer (${rowCount} ligne${rowCount !== 1 ? 's' : ''})`}
          </button>
          {rowCount > 0 && !importing && (
            <span className="text-xs text-gray-400">{rowCount} enregistrement{rowCount !== 1 ? 's' : ''} détecté{rowCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    )
  }

  function ResultBanner() {
    if (!result) return null
    return (
      <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
        result.errors === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      }`}>
        <span>{result.errors === 0 ? '✅' : '⚠️'}</span>
        <span>
          {result.count} enregistrement{result.count !== 1 ? 's' : ''} importé{result.count !== 1 ? 's' : ''}
          {result.errors > 0 && ` — ${result.errors} erreur${result.errors !== 1 ? 's' : ''}`}
        </span>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📥</span>
          <span className="text-xl font-bold">Import de données</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex-1 min-w-max flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <ResultBanner />

        <div className={`flex flex-col gap-6 ${result ? 'mt-4' : ''}`}>

          {/* ── CLASSES ── */}
          {activeTab === 'classes' && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Ajouter une classe</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input placeholder="Nom (ex: Terminale A) *" value={classesForm.nom}
                    onChange={e => setClassesForm({ ...classesForm, nom: e.target.value })}
                    className={inputCls} />
                  <input placeholder="Niveau (ex: Lycée)" value={classesForm.niveau}
                    onChange={e => setClassesForm({ ...classesForm, niveau: e.target.value })}
                    className={inputCls} />
                  <input placeholder="Année scolaire" value={classesForm.annee_scolaire}
                    onChange={e => setClassesForm({ ...classesForm, annee_scolaire: e.target.value })}
                    className={inputCls} />
                </div>
                <button onClick={saveClasse} disabled={saving || !classesForm.nom.trim()}
                  className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition text-sm font-medium">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>

              <CsvSection
                hint="nom, niveau, annee_scolaire"
                example="Terminale A, Lycée, 2025-2026"
                value={classesCsv}
                onChange={setClassesCsv}
                onImport={importClasses}
                rowCount={parseClasses(classesCsv).length}
              />
            </>
          )}

          {/* ── MATIÈRES ── */}
          {activeTab === 'matieres' && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Ajouter une matière</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input placeholder="Nom (ex: Mathématiques) *" value={matieresForm.nom}
                    onChange={e => setMatieresForm({ ...matieresForm, nom: e.target.value })}
                    className={inputCls} />
                  <input type="number" min={1} placeholder="Coefficient" value={matieresForm.coefficient}
                    onChange={e => setMatieresForm({ ...matieresForm, coefficient: Number(e.target.value) })}
                    className={inputCls} />
                  <select value={matieresForm.type}
                    onChange={e => setMatieresForm({ ...matieresForm, type: e.target.value as 'cours' | 'TP' | 'stage' })}
                    className={inputCls}>
                    <option value="cours">Cours</option>
                    <option value="TP">TP</option>
                    <option value="stage">Stage</option>
                  </select>
                </div>
                <button onClick={saveMatiere} disabled={saving || !matieresForm.nom.trim()}
                  className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition text-sm font-medium">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>

              <CsvSection
                hint="nom, coefficient, type"
                example="Mathématiques, 4, cours"
                value={matieresCsv}
                onChange={setMatieresCsv}
                onImport={importMatieres}
                rowCount={parseMatieres(matieresCsv).length}
              />
            </>
          )}

          {/* ── ÉTUDIANTS ── */}
          {activeTab === 'etudiants' && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Ajouter un étudiant</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input placeholder="Nom *" value={etudiantsForm.nom}
                    onChange={e => setEtudiantsForm({ ...etudiantsForm, nom: e.target.value })}
                    className={inputCls} />
                  <input placeholder="Prénom *" value={etudiantsForm.prenom}
                    onChange={e => setEtudiantsForm({ ...etudiantsForm, prenom: e.target.value })}
                    className={inputCls} />
                  <input placeholder="Email" value={etudiantsForm.email}
                    onChange={e => setEtudiantsForm({ ...etudiantsForm, email: e.target.value })}
                    className={inputCls} />
                  <input placeholder="WhatsApp" value={etudiantsForm.whatsapp}
                    onChange={e => setEtudiantsForm({ ...etudiantsForm, whatsapp: e.target.value })}
                    className={inputCls} />
                </div>
                <button onClick={saveEtudiant} disabled={saving || !etudiantsForm.nom.trim() || !etudiantsForm.prenom.trim()}
                  className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition text-sm font-medium">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>

              <CsvSection
                hint="nom, prenom, email, whatsapp"
                example="DIALLO, Moussa, moussa@gmail.com, +224621000000"
                value={etudiantsCsv}
                onChange={setEtudiantsCsv}
                onImport={importEtudiants}
                rowCount={parseEtudiants(etudiantsCsv).length}
              />
            </>
          )}

          {/* ── PERSONNEL ── */}
          {activeTab === 'personnel' && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Ajouter un membre du personnel</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input placeholder="Nom *" value={personnelForm.nom}
                    onChange={e => setPersonnelForm({ ...personnelForm, nom: e.target.value })}
                    className={inputCls} />
                  <input placeholder="Prénom *" value={personnelForm.prenom}
                    onChange={e => setPersonnelForm({ ...personnelForm, prenom: e.target.value })}
                    className={inputCls} />
                  <input placeholder="Email *" value={personnelForm.email}
                    onChange={e => setPersonnelForm({ ...personnelForm, email: e.target.value })}
                    className={inputCls} />
                  <input placeholder="PIN *" value={personnelForm.pin}
                    onChange={e => setPersonnelForm({ ...personnelForm, pin: e.target.value })}
                    className={inputCls} />
                  <select value={personnelForm.role}
                    onChange={e => setPersonnelForm({ ...personnelForm, role: e.target.value })}
                    className={`${inputCls} sm:col-span-2`}>
                    <option value="admin">Administrateur</option>
                    <option value="secretaire">Secrétaire</option>
                    <option value="prof">Professeur</option>
                    <option value="surveillant">Surveillant</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>
                <button
                  onClick={savePersonnel}
                  disabled={saving || !personnelForm.nom.trim() || !personnelForm.prenom.trim() || !personnelForm.email.trim() || !personnelForm.pin.trim()}
                  className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition text-sm font-medium">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>

              <CsvSection
                hint="nom, prenom, email, pin, role"
                example="CAMARA, Fatoumata, fato@ecole.com, 1234, prof"
                value={personnelCsv}
                onChange={setPersonnelCsv}
                onImport={importPersonnel}
                rowCount={parsePersonnel(personnelCsv).length}
              />
            </>
          )}

        </div>
      </div>
    </main>
  )
}
