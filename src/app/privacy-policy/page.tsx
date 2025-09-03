export default function PrivacyPolicy() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
        <p className="mb-4">
          A sua privacidade é importante para nós. É política do <strong>EcomZero</strong> respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site.
        </p>
        <p className="mb-4">
          Utilizamos cookies para melhorar a experiência do usuário e para exibir anúncios personalizados através do Google AdSense. Você pode desativar os cookies diretamente nas configurações do seu navegador.
        </p>
        <p className="mb-4">
          Ao continuar a usar o site, entendemos que você concorda com a nossa política de privacidade.
        </p>
        <p className="mt-6 text-sm text-gray-500">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>
    </main>
  );
}
