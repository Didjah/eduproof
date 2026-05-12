'use client'
import { PDFDownloadLink } from '@react-pdf/renderer'
import RecuPDF, { type RecuPDFProps } from './RecuPDF'

interface Props extends RecuPDFProps {
  fileName: string
}

export default function RecuDownloadButton({ fileName, ...pdfProps }: Props) {
  return (
    <PDFDownloadLink document={<RecuPDF {...pdfProps} />} fileName={fileName}>
      {({ loading }) => (
        <button
          className={`text-xs px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
            loading
              ? 'text-gray-400 border-gray-200 cursor-wait'
              : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 cursor-pointer'
          }`}
        >
          {loading ? 'Génération...' : '🧾 Télécharger reçu'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
