export function ouvrirWhatsApp(telephone, message) {
  let t = telephone.replace(/[\s\-.()+]/g, "");
  if (t.startsWith("00")) t = t.slice(2);
  if (t.startsWith("0") && t.length <= 10) t = "225" + t.slice(1);
  if (!t.startsWith("225") && t.length <= 9) t = "225" + t;
  window.open("https://wa.me/" + t + "?text=" + encodeURIComponent(message), "_blank");
}

export function msgAbsence(prenomEtudiant, nomEtudiant, date) {
  return `Bonjour, nous vous informons que votre enfant ${prenomEtudiant} ${nomEtudiant} était absent(e) le ${date} à l'école. Merci de nous contacter si nécessaire. — EduProof`;
}

export function msgNotes(prenomEtudiant, nomEtudiant, matiere, note) {
  return `Bonjour, les résultats de ${prenomEtudiant} ${nomEtudiant} en ${matiere} sont disponibles : ${note}/20. Connectez-vous sur votre espace parent pour voir le détail. — EduProof`;
}

export function msgPaiement(prenomEtudiant, nomEtudiant, montant, type) {
  return `Bonjour, un rappel de paiement ${type} d'un montant de ${montant} FCFA est en attente pour ${prenomEtudiant} ${nomEtudiant}. Merci de régulariser. — EduProof`;
}

export function msgAnnonce(titre, contenu) {
  return `📢 ${titre}\n\n${contenu}\n\n— EduProof`;
}
