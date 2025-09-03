export default function Contact() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold mb-6">Contato</h1>
        <p className="mb-4">
          Se você deseja falar com a equipe do <strong>EcomZero</strong>, entre em contato pelos canais abaixo:
        </p>
        <ul className="list-disc pl-6 space-y-3">
          <li>
            E-mail:{" "}
            <a
              href="mailto:contato@ecomzero.com"
              className="text-blue-600 font-medium hover:underline"
            >
              contato@ecomzero.com
            </a>
          </li>
          <li>
            WhatsApp:{" "}
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              className="text-blue-600 font-medium hover:underline"
            >
              +55 (11) 99999-9999
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}
