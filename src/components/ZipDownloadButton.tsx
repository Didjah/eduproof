'use client'
import { useState } from 'react'
import BulletinPDF, { type BulletinPDFProps } from './BulletinPDF'

export interface ZipDownloadButtonProps {
  classeName: string
  periodeLibelle: string
  bulletins: BulletinPDFProps[]
}

export default function ZipDownloadButton({ classeName, periodeLibelle, bulletins }: ZipDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated,    setGenerated]    = useState(0)
  const [error,        setError]        = useState<string | null>(null)

  async function handleDownload() {
    if (bulletins.length === 0) return
    setIsGenerating(true)
    setGenerated(0)
    setError(null)

    try {
      const { pdf }  = await import('@react-pdf/renderer')
      const JSZip    = (await import('jszip')).default
      const { saveAs } = await import('file-saver')

      const zip = new JSZip()

      for (let i = 0; i < bulletins.length; i++) {
        const b    = bulletins[i]
        const blob = await pdf(<BulletinPDF {...b} />).toBlob()
        const safe = `${b.eleve.nom}_${b.eleve.prenom}`.replace(/[^a-zA-Z0-9_-]/g, '_')
        zip.file(`Bulletin_${safe}.pdf`, blob)
        setGenerated(i + 1)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipName = `Bulletins_${classeName}_${periodeLibelle}`.replace(/[^a-zA-Z0-9_-]/g, '_') + '.zip'
      saveAs(zipBlob, zipName)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération')
    } finally {
      setIsGenerating(false)
      setGenerated(0)
    }
  }

  const progress = bulletins.length > 0 ? (generated / bulletins.length) * 100 : 0

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDownload}
        disabled={isGenerating || bulletins.length === 0}
        className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm whitespace-nowrap"
      >
        {isGenerating
          ? `Génération ${generated} / ${bulletins.length}…`
          : '📦 Télécharger tous les PDF (ZIP)'}
      </button>

      {isGenerating && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
