
import politicaArticles from "@/service/politica.json";
import economiaArticles from "@/service/economia.json";


export default function BlogPage({ params }: any) {
  const allArticles = [...politicaArticles, ...economiaArticles];
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const article = allArticles.find(a => a.slug === slug);

  if (!article) {
    return (
      <div className="container mx-auto px-6 py-10 text-center text-red-600">
        Artigo não encontrado.
      </div>
    );
  }

  return (
    <main className="container mx-auto px-6 py-10 max-w-3xl bg-gray-50 p-8 rounded-2xl shadow-xl border border-gray-200">
      <p className="text-sm text-gray-400 mb-2">{article.date}</p>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{article.title}</h1>

      {article.image && (
        <div className="mb-6">
          <img
            src={article.image}
            alt={article.title}
            className="w-full rounded-xl object-cover shadow-md"
          />
        </div>
      )}

      <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
        {article.content.split("\n\n").map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}
