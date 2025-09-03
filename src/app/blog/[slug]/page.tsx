import path from "path";
import fs from "fs";

type BlogPageProps = {
  params: { slug: string };
};

export default function BlogPage({ params }: BlogPageProps) {
  const politicaPath = path.join(process.cwd(), "src/service/politica.json");
  const economiaPath = path.join(process.cwd(), "src/service/economia.json");

  const politicaArticles = JSON.parse(fs.readFileSync(politicaPath, "utf-8"));
  const economiaArticles = JSON.parse(fs.readFileSync(economiaPath, "utf-8"));

  const allArticles = [...politicaArticles, ...economiaArticles];

  const article = allArticles.find((a: any) => a.slug === params.slug);

  if (!article) {
    return <div className="container mx-auto px-6 py-10">Artigo não encontrado.</div>;
  }

  return (
   <main className="container mx-auto px-6 py-10 max-w-3xl bg-gray-50 p-8 rounded-2xl shadow-xl border border-gray-200">
  {/* Data */}
  <p className="text-sm text-gray-400 mb-2">{article.date}</p>

  {/* Título */}
  <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{article.title}</h1>

  {/* Imagem */}
  {article.image && (
    <div className="mb-6">
      <img
        src={article.image}
        alt={article.title}
        className="w-full rounded-xl object-cover shadow-md"
      />
    </div>
  )}

  {/* Conteúdo dividido em parágrafos com maior espaçamento */}
  <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
    {article.content.split("\n\n").map((paragraph, index) => (
      <p key={index}>{paragraph}</p>
    ))}
  </div>
</main>


  );
}
