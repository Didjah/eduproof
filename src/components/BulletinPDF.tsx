import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

/* ── Types ─────────────────────────────────────────────────────── */
export interface EcoleInfo {
  nom_ecole: string
  logo_url?: string
  adresse?: string
  telephone?: string
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
    note_classe: number | null
    note_composition: number | null
    moyenne_eleve: number | null
    note_coeff: number | null
    moyenne_classe: number | null
  }>
  moyenneGenerale: number | null
  rang: number | null
  mention: string | null
  appreciationGenerale: string
}

/* ── Palette ───────────────────────────────────────────────────── */
const C = {
  indigo:       '#4f46e5',
  indigoLight:  '#eef2ff',
  indigoBorder: '#c7d2fe',
  gray:         '#6b7280',
  grayLight:    '#f9fafb',
  grayBorder:   '#e5e7eb',
  dark:         '#111827',
  white:        '#ffffff',
  green:        '#16a34a',
  red:          '#dc2626',
}

/* ── Styles ────────────────────────────────────────────────────── */
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.dark,
    paddingTop: 28,
    paddingBottom: 52,
    paddingHorizontal: 32,
    backgroundColor: C.white,
  },

  /* ── En-tête 3 colonnes ── */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: C.indigo,
  },
  headerLeft:  { flex: 1 },
  headerCenter:{ width: 60, alignItems: 'center', paddingHorizontal: 4 },
  headerRight: { flex: 1 },

  headerLeftBold:  { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.dark, marginBottom: 2 },
  headerLeftSub:   { fontSize: 7.5, color: C.gray, marginBottom: 1 },
  headerRightBold: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.dark, marginBottom: 2, textAlign: 'right' },
  headerRightSub:  { fontSize: 7.5, color: C.gray, marginBottom: 1, textAlign: 'right' },

  logo:    { width: 52, height: 52 },
  logoBox: {
    width: 52, height: 52,
    backgroundColor: C.indigo, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  logoLetter: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.white },

  /* ── Titre ── */
  docTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: C.dark,
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  /* ── Élève info ── */
  eleveCard: {
    backgroundColor: C.indigoLight,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    flexDirection: 'row',
  },
  eleveCol:   { flex: 1 },
  eleveRow:   { flexDirection: 'row', marginBottom: 3 },
  eleveLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.gray, width: 88 },
  eleveValue: { fontSize: 9, color: C.dark, flex: 1 },

  /* ── Section ── */
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: C.indigo,
    paddingBottom: 2,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.indigo,
  },

  /* ── Tableau ── */
  tableWrapper: { marginBottom: 4 },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.indigo,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeadText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.white, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.grayBorder,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: C.grayLight,
    borderBottomWidth: 1,
    borderBottomColor: C.grayBorder,
  },

  /* Ligne TOTAL */
  tableTotal: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: C.indigoBorder,
    borderTopWidth: 1.5,
    borderTopColor: C.indigo,
  },
  /* Ligne MOYENNE */
  tableMoyenne: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: C.indigoLight,
    borderBottomWidth: 1,
    borderBottomColor: C.indigoBorder,
  },

  cellText:    { fontSize: 9, color: C.dark },
  cellGray:    { fontSize: 8.5, color: C.gray, textAlign: 'center' },
  totalText:   { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.dark, textAlign: 'center' },
  moyenneText: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.indigo },

  /* Colonnes tableau */
  colMatiere:   { flex: 3 },
  colNotClas:   { width: 46, textAlign: 'center' },
  colNotComp:   { width: 46, textAlign: 'center' },
  colMoyen:     { width: 46, textAlign: 'center' },
  colCoef:      { width: 30, textAlign: 'center' },
  colNoteCoeff: { width: 50, textAlign: 'center' },

  /* ── Synthèse (Rang / Mention) ── */
  syntheseWrapper: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.indigoBorder,
    borderRadius: 4,
  },
  syntheseBlock: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: C.indigoBorder,
  },
  syntheseBlockLast: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  syntheseLabel: { fontSize: 8, color: C.gray, marginBottom: 3 },
  syntheseBig:   { fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.indigo },
  syntheseMed:   { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.indigo },

  /* ── Appréciation ── */
  appTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: C.indigo,
    paddingBottom: 2,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.indigo,
  },
  appBox: {
    borderWidth: 1,
    borderColor: C.grayBorder,
    borderRadius: 4,
    padding: 8,
    minHeight: 40,
    marginBottom: 16,
  },
  appText:  { fontSize: 9, color: C.dark },
  appEmpty: { fontSize: 9, color: C.gray },

  noNotes: {
    fontSize: 9,
    color: C.gray,
    textAlign: 'center',
    padding: 14,
    backgroundColor: C.grayLight,
    borderRadius: 4,
    marginBottom: 10,
  },

  /* ── Pied de page ── */
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: C.grayBorder,
    paddingTop: 6,
  },
  footerText: { fontSize: 7.5, color: C.gray },
  sigBox:     { alignItems: 'center' },
  sigLine:    { width: 80, borderBottomWidth: 1, borderBottomColor: C.dark, marginBottom: 2 },
  sigLabel:   { fontSize: 7.5, color: C.gray },
})

/* ── Helpers ───────────────────────────────────────────────────── */
function fmt(v: number | null): string {
  return v !== null ? v.toFixed(2) : '—'
}

/* ── Component ─────────────────────────────────────────────────── */
export default function BulletinPDF({
  ecole, periode, eleve, classe, effectif,
  notesParMatiere, moyenneGenerale, rang, mention, appreciationGenerale,
}: BulletinPDFProps) {
  const today  = new Date().toLocaleDateString('fr-FR')
  const sur20  = (v: number) => ecole.note_sur === 100 ? v / 5 : v
  const passColor = moyenneGenerale !== null && sur20(moyenneGenerale) >= 10 ? C.green : C.red

  const totalCoeff     = notesParMatiere.reduce((s, r) => s + r.coefficient, 0)
  const totalNoteCoeff = notesParMatiere.reduce((s, r) => s + (r.note_coeff ?? 0), 0)

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── En-tête 3 colonnes ── */}
        <View style={S.header}>

          {/* Bloc gauche — identification officielle */}
          <View style={S.headerLeft}>
            <Text style={S.headerLeftBold}>Ministère de la Santé</Text>
            <Text style={S.headerLeftSub}>Direction Nationale de la Santé Publique</Text>
            <Text style={S.headerLeftBold}>{ecole.nom_ecole}</Text>
            {ecole.adresse   && <Text style={S.headerLeftSub}>{ecole.adresse}</Text>}
            {ecole.telephone && <Text style={S.headerLeftSub}>Tel.: {ecole.telephone}</Text>}
          </View>

          {/* Bloc centre — logo ou initiale */}
          <View style={S.headerCenter}>
            {ecole.logo_url
              ? <Image style={S.logo} src={ecole.logo_url} />
              : (
                <View style={S.logoBox}>
                  <Text style={S.logoLetter}>{ecole.nom_ecole.charAt(0).toUpperCase()}</Text>
                </View>
              )
            }
          </View>

          {/* Bloc droit — devise nationale */}
          <View style={S.headerRight}>
            <Text style={S.headerRightBold}>REPUBLIQUE DU MALI</Text>
            <Text style={S.headerRightSub}>Un Peuple - Un But - Une Foi</Text>
            <Text style={S.headerRightSub}> </Text>
            <Text style={S.headerRightSub}>Travail - Discipline - Réussite</Text>
          </View>

        </View>

        {/* ── Titre ── */}
        <Text style={S.docTitle}>
          Bulletin des Notes de composition de la {periode.libelle} {periode.annee_scolaire}
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

        {/* ── Tableau des matières ── */}
        <Text style={S.sectionTitle}>RÉSULTATS PAR MATIÈRE</Text>
        <View style={S.tableWrapper}>

          {/* En-tête colonnes */}
          <View style={S.tableHead}>
            <Text style={[S.tableHeadText, S.colMatiere]}>Matières</Text>
            <Text style={[S.tableHeadText, S.colNotClas]}>Not.Clas</Text>
            <Text style={[S.tableHeadText, S.colNotComp]}>Not.Comp</Text>
            <Text style={[S.tableHeadText, S.colMoyen]}>Moyen</Text>
            <Text style={[S.tableHeadText, S.colCoef]}>Coeff</Text>
            <Text style={[S.tableHeadText, S.colNoteCoeff]}>Not.Coeff</Text>
          </View>

          {notesParMatiere.length === 0 ? (
            <Text style={S.noNotes}>Aucune note enregistrée pour cette période.</Text>
          ) : (
            <>
              {notesParMatiere.map((row, i) => {
                const pass = row.moyenne_eleve !== null && sur20(row.moyenne_eleve) >= 10
                return (
                  <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                    <Text style={[S.cellText, S.colMatiere]}>{row.nom_matiere}</Text>
                    <Text style={[S.cellGray, S.colNotClas]}>{fmt(row.note_classe)}</Text>
                    <Text style={[S.cellGray, S.colNotComp]}>{fmt(row.note_composition)}</Text>
                    <Text style={[S.cellText, S.colMoyen, {
                      fontFamily: 'Helvetica-Bold',
                      color: row.moyenne_eleve !== null ? (pass ? C.green : C.red) : C.gray,
                      textAlign: 'center',
                    }]}>
                      {fmt(row.moyenne_eleve)}
                    </Text>
                    <Text style={[S.cellGray, S.colCoef]}>{row.coefficient}</Text>
                    <Text style={[S.cellText, S.colNoteCoeff, { textAlign: 'center' }]}>
                      {fmt(row.note_coeff)}
                    </Text>
                  </View>
                )
              })}

              {/* Ligne TOTAL */}
              <View style={S.tableTotal}>
                <Text style={[S.totalText, S.colMatiere]}>TOTAL</Text>
                <Text style={[S.totalText, S.colNotClas]}></Text>
                <Text style={[S.totalText, S.colNotComp]}></Text>
                <Text style={[S.totalText, S.colMoyen]}></Text>
                <Text style={[S.totalText, S.colCoef]}>{totalCoeff}</Text>
                <Text style={[S.totalText, S.colNoteCoeff]}>{totalNoteCoeff.toFixed(2)}</Text>
              </View>

              {/* Ligne MOYENNE */}
              <View style={S.tableMoyenne}>
                <Text style={[S.moyenneText, { color: passColor }]}>
                  Moyenne /{ecole.note_sur} : {moyenneGenerale !== null ? sur20(moyenneGenerale).toFixed(2) : '—'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── Synthèse Rang / Mention ── */}
        {(rang !== null || mention) && (
          <View style={S.syntheseWrapper}>
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
