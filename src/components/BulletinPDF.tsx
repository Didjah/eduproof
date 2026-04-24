import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

/* ── Types ─────────────────────────────────────────────────────── */
export interface EcoleInfo {
  nom_ecole: string
  logo_url?: string
  adresse?: string
  note_sur: number
  annee_scolaire_active: string
}

export interface BulletinPDFProps {
  ecole: EcoleInfo
  periode: { libelle: string; annee_scolaire: string }
  eleve: { nom: string; prenom: string; date_naissance?: string; photo_url?: string }
  classe: { nom: string }
  effectif: number
  notesParMatiere: Array<{
    nom_matiere: string
    coefficient: number
    moyenne_eleve: number | null
    moyenne_classe: number | null
  }>
  moyenneGenerale: number | null
  rang: number | null
  mention: string | null
  appreciationGenerale: string
}

/* ── Palette ───────────────────────────────────────────────────── */
const C = {
  indigo:      '#4f46e5',
  indigoLight: '#eef2ff',
  indigoBorder:'#c7d2fe',
  gray:        '#6b7280',
  grayLight:   '#f9fafb',
  grayBorder:  '#e5e7eb',
  dark:        '#111827',
  white:       '#ffffff',
  green:       '#16a34a',
  red:         '#dc2626',
}

/* ── Styles ────────────────────────────────────────────────────── */
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.dark,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    backgroundColor: C.white,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.indigo,
  },
  logo: { width: 48, height: 48, marginRight: 12 },
  logoBox: {
    width: 48,
    height: 48,
    marginRight: 12,
    backgroundColor: C.indigo,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: C.white },
  headerInfo: { flex: 1 },
  schoolName: { fontFamily: 'Helvetica-Bold', fontSize: 15, color: C.indigo, marginBottom: 2 },
  headerSub:  { fontSize: 9, color: C.gray, marginBottom: 1 },

  /* Document title */
  docTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: C.dark,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 6,
  },

  /* Eleve info card */
  eleveCard: {
    backgroundColor: C.indigoLight,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
    flexDirection: 'row',
  },
  eleveCol: { flex: 1 },
  eleveRow: { flexDirection: 'row', marginBottom: 4 },
  eleveLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.gray, width: 90 },
  eleveValue: { fontSize: 10, color: C.dark, flex: 1 },

  /* Section title */
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: C.indigo,
    paddingBottom: 3,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.indigo,
  },

  /* Table */
  tableWrapper: { marginBottom: 6 },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.indigo,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeadText: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.white },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.grayBorder,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: C.grayLight,
    borderBottomWidth: 1,
    borderBottomColor: C.grayBorder,
  },
  cellText: { fontSize: 10, color: C.dark },
  cellGray: { fontSize: 9, color: C.gray },
  colMatiere: { flex: 3 },
  colCoef:    { width: 36, textAlign: 'center' },
  colMoyEl:   { width: 72, textAlign: 'center' },
  colMoyCl:   { width: 72, textAlign: 'center' },

  /* Synthèse */
  syntheseWrapper: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.indigoBorder,
    borderRadius: 4,
  },
  syntheseBlock: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: C.indigoBorder,
  },
  syntheseBlockLast: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  syntheseLabel: { fontSize: 8, color: C.gray, marginBottom: 3 },
  syntheseBig:   { fontFamily: 'Helvetica-Bold', fontSize: 17, color: C.indigo },
  syntheseMed:   { fontFamily: 'Helvetica-Bold', fontSize: 12, color: C.indigo },

  /* Appréciation */
  appTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: C.indigo,
    paddingBottom: 3,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.indigo,
  },
  appBox: {
    borderWidth: 1,
    borderColor: C.grayBorder,
    borderRadius: 4,
    padding: 10,
    minHeight: 45,
    marginBottom: 20,
  },
  appText:  { fontSize: 10, color: C.dark },
  appEmpty: { fontSize: 10, color: C.gray },

  /* Pas de notes */
  noNotes: {
    fontSize: 10,
    color: C.gray,
    textAlign: 'center',
    padding: 16,
    backgroundColor: C.grayLight,
    borderRadius: 4,
    marginBottom: 14,
  },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: C.grayBorder,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: C.gray },
  sigBox:     { alignItems: 'center' },
  sigLine:    { width: 90, borderBottomWidth: 1, borderBottomColor: C.dark, marginBottom: 3 },
  sigLabel:   { fontSize: 8, color: C.gray },
})

/* ── Helpers ───────────────────────────────────────────────────── */
function fmtNote(v: number | null, noteSur: number): string {
  return v !== null ? `${v.toFixed(2)}/${noteSur}` : '—'
}

/* ── Component ─────────────────────────────────────────────────── */
export default function BulletinPDF({
  ecole, periode, eleve, classe, effectif,
  notesParMatiere, moyenneGenerale, rang, mention, appreciationGenerale,
}: BulletinPDFProps) {
  const today = new Date().toLocaleDateString('fr-FR')
  const sur20 = (v: number) => ecole.note_sur === 100 ? v / 5 : v
  const passColor = moyenneGenerale !== null && sur20(moyenneGenerale) >= 10 ? C.green : C.red

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── En-tête ── */}
        <View style={S.header}>
          {ecole.logo_url
            ? <Image style={S.logo} src={ecole.logo_url} />
            : (
              <View style={S.logoBox}>
                <Text style={S.logoLetter}>
                  {ecole.nom_ecole.charAt(0).toUpperCase()}
                </Text>
              </View>
            )
          }
          <View style={S.headerInfo}>
            <Text style={S.schoolName}>{ecole.nom_ecole}</Text>
            {ecole.adresse && <Text style={S.headerSub}>{ecole.adresse}</Text>}
            <Text style={S.headerSub}>
              Année scolaire : {ecole.annee_scolaire_active || periode.annee_scolaire}
            </Text>
          </View>
        </View>

        {/* ── Titre ── */}
        <Text style={S.docTitle}>
          BULLETIN DE NOTES — {periode.libelle.toUpperCase()}
        </Text>

        {/* ── Infos élève ── */}
        <View style={S.eleveCard}>
          <View style={S.eleveCol}>
            <View style={S.eleveRow}>
              <Text style={S.eleveLabel}>Nom :</Text>
              <Text style={S.eleveValue}>{eleve.nom}</Text>
            </View>
            <View style={S.eleveRow}>
              <Text style={S.eleveLabel}>Prénom :</Text>
              <Text style={S.eleveValue}>{eleve.prenom}</Text>
            </View>
            <View style={S.eleveRow}>
              <Text style={S.eleveLabel}>Classe :</Text>
              <Text style={S.eleveValue}>{classe.nom}</Text>
            </View>
            {eleve.date_naissance && (
              <View style={S.eleveRow}>
                <Text style={S.eleveLabel}>Date de naissance :</Text>
                <Text style={S.eleveValue}>{eleve.date_naissance}</Text>
              </View>
            )}
          </View>
          <View style={S.eleveCol}>
            <View style={S.eleveRow}>
              <Text style={S.eleveLabel}>Effectif :</Text>
              <Text style={S.eleveValue}>{effectif} élève{effectif > 1 ? 's' : ''}</Text>
            </View>
            {rang !== null && (
              <View style={S.eleveRow}>
                <Text style={S.eleveLabel}>Rang :</Text>
                <Text style={S.eleveValue}>{rang}/{effectif}</Text>
              </View>
            )}
            {mention && (
              <View style={S.eleveRow}>
                <Text style={S.eleveLabel}>Mention :</Text>
                <Text style={[S.eleveValue, { fontFamily: 'Helvetica-Bold' }]}>{mention}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Tableau matières ── */}
        <Text style={S.sectionTitle}>RÉSULTATS PAR MATIÈRE</Text>
        <View style={S.tableWrapper}>
          {/* En-tête */}
          <View style={S.tableHead}>
            <Text style={[S.tableHeadText, S.colMatiere]}>Matière</Text>
            <Text style={[S.tableHeadText, S.colCoef]}>Coef</Text>
            <Text style={[S.tableHeadText, S.colMoyEl]}>Moy. Élève</Text>
            <Text style={[S.tableHeadText, S.colMoyCl]}>Moy. Classe</Text>
          </View>

          {notesParMatiere.length === 0 ? (
            <Text style={S.noNotes}>Aucune note enregistrée pour cette période.</Text>
          ) : (
            notesParMatiere.map((row, i) => (
              <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.cellText, S.colMatiere]}>{row.nom_matiere}</Text>
                <Text style={[S.cellGray, S.colCoef]}>{row.coefficient}</Text>
                <Text style={[S.cellText, S.colMoyEl, {
                  fontFamily: 'Helvetica-Bold',
                  color: row.moyenne_eleve !== null && sur20(row.moyenne_eleve) >= 10 ? C.green : C.red,
                }]}>
                  {fmtNote(row.moyenne_eleve, ecole.note_sur)}
                </Text>
                <Text style={[S.cellGray, S.colMoyCl]}>
                  {fmtNote(row.moyenne_classe, ecole.note_sur)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ── Synthèse ── */}
        {moyenneGenerale !== null && (
          <View style={S.syntheseWrapper}>
            <View style={S.syntheseBlock}>
              <Text style={S.syntheseLabel}>MOYENNE GÉNÉRALE</Text>
              <Text style={[S.syntheseBig, { color: passColor }]}>
                {fmtNote(moyenneGenerale, ecole.note_sur)}
              </Text>
            </View>
            <View style={S.syntheseBlock}>
              <Text style={S.syntheseLabel}>RANG</Text>
              <Text style={S.syntheseBig}>
                {rang !== null ? `${rang}/${effectif}` : '—'}
              </Text>
            </View>
            <View style={S.syntheseBlockLast}>
              <Text style={S.syntheseLabel}>MENTION</Text>
              <Text style={S.syntheseMed}>{mention ?? '—'}</Text>
            </View>
          </View>
        )}

        {/* ── Appréciation générale ── */}
        <Text style={S.appTitle}>APPRÉCIATION DU CONSEIL DE CLASSE</Text>
        <View style={S.appBox}>
          {appreciationGenerale
            ? <Text style={S.appText}>{appreciationGenerale}</Text>
            : <Text style={S.appEmpty}>Aucune appréciation saisie.</Text>
          }
        </View>

        {/* ── Pied de page ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Édité le {today}</Text>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>Cachet de l&apos;établissement</Text>
          </View>
          <View style={S.sigBox}>
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>Signature du Directeur</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
