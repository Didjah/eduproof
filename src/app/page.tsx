import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-xl font-bold text-indigo-700">EduProof</span>
          </div>
          <Link href="/admin" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            Accès Admin
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Gérez votre école<br />
          <span className="text-indigo-600">simplement et efficacement</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Élèves, présences, notes, finances — tout en un seul endroit. 
          Conçu pour les établissements africains.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/admin" className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition">
            Tableau de bord
          </Link>
          <a href="#fonctionnalites" className="border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-50 transition">
            En savoir plus
          </a>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Tout ce dont votre école a besoin</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: "👨‍🎓", titre: "Gestion des élèves", desc: "Inscriptions, profils, dossiers scolaires complets" },
            { icon: "📋", titre: "Présences", desc: "Appel numérique, alertes parents en temps réel" },
            { icon: "📊", titre: "Notes & Bulletins", desc: "Saisie des notes, moyennes automatiques, bulletins PDF" },
            { icon: "💰", titre: "Finances", desc: "Suivi des paiements, relances automatiques, reçus" },
            { icon: "👨‍👩‍👧", titre: "Espace Parents", desc: "Suivi en temps réel via WhatsApp et application web" },
            { icon: "🏫", titre: "Dashboard Admin", desc: "Vue complète sur tous les indicateurs de l'école" },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.titre}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t mt-16 py-8 text-center text-gray-500">
        <p>© 2026 EduProof — Plateforme SaaS de gestion scolaire</p>
      </footer>
    </main>
  );
}
