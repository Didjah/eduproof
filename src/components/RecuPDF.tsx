import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

export interface RecuPDFProps {
  ecole: { nom_ecole: string; logo_url?: string; adresse?: string; telephone?: string }
  etudiant: { nom: string; prenom: string; classe: string }
  paiement: { numero_recu: string; date: string; montant_verse: number; mode_paiement: string; note?: string }
  bilan: { total_du: number; total_paye: number; reste: number }
  recu_par: string
}

const C = {
  indigo:       '#4f46e5',
  indigoLight:  '#eef2ff',
  indigoBorder: '#c7d2fe',
  gray:         '#6b7280',
  grayBorder:   '#e5e7eb',
  grayLight:    '#f9fafb',
  dark:         '#111827',
  white:        '#ffffff',
  green:        '#16a34a',
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.dark,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 28,
    backgroundColor: C.white,
  },
  watermark: {
    position: 'absolute',
    top: 197,
    left: 110,
    width: 200,
    height: 200,
    opacity: 0.07,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.indigo,
  },
  headerLeft:  { flex: 1 },
  headerCenter:{ width: 52, alignItems: 'center', paddingHorizontal: 4 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  hBold: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.dark, marginBottom: 2 },
  hSub:  { fontSize: 7.5, color: C.gray, marginBottom: 1 },
  hBoldR: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.dark, marginBottom: 2, textAlign: 'right' },
  hSubR:  { fontSize: 7.5, color: C.gray, marginBottom: 1, textAlign: 'right' },
  logo: { width: 44, height: 44 },
  logoBox: {
    width: 44, height: 44,
    backgroundColor: C.indigo, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  logoLetter: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: C.white },
  docTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: C.indigo,
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  recuNum: {
    fontSize: 8.5,
    color: C.gray,
    textAlign: 'center',
    marginBottom: 12,
  },
  section: {
    borderWidth: 1,
    borderColor: C.indigoBorder,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: C.white,
    backgroundColor: C.indigo,
    paddingVertical: 4,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.gray, width: 90 },
  value: { fontSize: 9, color: C.dark, flex: 1 },
  montantBig: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: C.indigo,
    textAlign: 'center',
    paddingVertical: 6,
  },
  bilanRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  bilanLabel: { fontSize: 9, color: C.gray },
  bilanValue: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.dark },
  bilanReste: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.indigo },
  divider: { borderBottomWidth: 1, borderBottomColor: C.grayBorder, marginVertical: 4 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: C.grayBorder,
    paddingTop: 6,
  },
  footerText: { fontSize: 7.5, color: C.gray },
  sigBox: { alignItems: 'center' },
  sigLine: { width: 90, borderBottomWidth: 1, borderBottomColor: C.dark, marginBottom: 2 },
  sigLabel: { fontSize: 7.5, color: C.gray },
  soldeBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  soldeText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.green },
})

function fmt(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function fmtDate(d: string): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function RecuPDF({ ecole, etudiant, paiement, bilan, recu_par }: RecuPDFProps) {
  const isSolde = bilan.reste <= 0
  return (
    <Document>
      <Page size="A5" orientation="portrait" style={S.page}>

        {/* ── Filigrane ── */}
        {ecole.logo_url && (
          <Image style={S.watermark} src={ecole.logo_url} />
        )}

        {/* En-tête */}
        <View style={S.header}>
          <View style={S.headerLeft}>
            <Text style={S.hBold}>{ecole.nom_ecole}</Text>
            {ecole.adresse   && <Text style={S.hSub}>{ecole.adresse}</Text>}
            {ecole.telephone && <Text style={S.hSub}>Tél : {ecole.telephone}</Text>}
          </View>
          <View style={S.headerCenter}>
            {ecole.logo_url
              ? <Image style={S.logo} src={ecole.logo_url} />
              : <View style={S.logoBox}><Text style={S.logoLetter}>{ecole.nom_ecole.charAt(0)}</Text></View>
            }
          </View>
          <View style={S.headerRight}>
            <Text style={S.hBoldR}>REÇU DE PAIEMENT</Text>
            <Text style={S.hSubR}>N° {paiement.numero_recu}</Text>
            <Text style={S.hSubR}>Date : {fmtDate(paiement.date)}</Text>
          </View>
        </View>

        {/* Étudiant */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Informations étudiant</Text>
          <View style={S.sectionBody}>
            <View style={S.row}>
              <Text style={S.label}>Nom complet :</Text>
              <Text style={S.value}>{etudiant.prenom} {etudiant.nom}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Classe :</Text>
              <Text style={S.value}>{etudiant.classe}</Text>
            </View>
          </View>
        </View>

        {/* Versement */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Détail du versement</Text>
          <View style={S.sectionBody}>
            <Text style={S.montantBig}>{fmt(paiement.montant_verse)}</Text>
            <View style={S.row}>
              <Text style={S.label}>Mode de paiement :</Text>
              <Text style={S.value}>{paiement.mode_paiement}</Text>
            </View>
            {paiement.note ? (
              <View style={S.row}>
                <Text style={S.label}>Note :</Text>
                <Text style={S.value}>{paiement.note}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bilan */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Bilan scolarité 2025-2026</Text>
          <View style={S.sectionBody}>
            <View style={S.bilanRow}>
              <Text style={S.bilanLabel}>Total scolarité</Text>
              <Text style={S.bilanValue}>{fmt(bilan.total_du)}</Text>
            </View>
            <View style={S.bilanRow}>
              <Text style={S.bilanLabel}>Total payé</Text>
              <Text style={S.bilanValue}>{fmt(bilan.total_paye)}</Text>
            </View>
            <View style={S.divider} />
            <View style={S.bilanRow}>
              <Text style={S.bilanLabel}>Reste dû</Text>
              <Text style={S.bilanReste}>{isSolde ? '0 FCFA' : fmt(bilan.reste)}</Text>
            </View>
            {isSolde && (
              <View style={S.soldeBadge}>
                <Text style={S.soldeText}>COMPTE SOLDÉ</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pied de page */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Reçu par : {recu_par}</Text>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>Signature</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
