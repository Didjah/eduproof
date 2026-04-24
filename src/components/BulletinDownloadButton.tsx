'use client'
import { PDFDownloadLink } from '@react-pdf/renderer'
import BulletinPDF, { type BulletinPDFProps } from './BulletinPDF'

interface Props extends BulletinPDFProps {
  fileName: string
}

export default function BulletinDownloadButton({ fileName, ...pdfProps }: Props) {
  return (
    <PDFDownloadLink
      document={<BulletinPDF {...pdfProps} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <button
          className={`text-xs px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
            loading
              ? 'text-gray-400 border-gray-200 cursor-wait'
              : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 cursor-pointer'
          }`}
        >
          {loading ? 'Génération...' : '📄 Télécharger'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
