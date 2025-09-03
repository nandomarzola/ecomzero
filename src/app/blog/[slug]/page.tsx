// src/app/blog/[slug]/page.tsx
import path from "path";
import fs from "fs";
import { Metadata } from "next";

type Article = {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  image?: string;
  category: string;
  slug: string;
};

// Usamos `any` para params para evitar erro de tipagem do Next 15+
export default function BlogPage({ params }: any) {
  // Caminhos dos JSONs
  const politicaPath = path.join(process.cwd(), "src/service/politica.json");
  const economiaPath = path.join(process.cwd(), "src/service/economia.json");

  // Leitura dos arquivos
  const politicaArticles: Article[] = JSON.parse(
    fs.readFileSync(politicaPath, "utf-8")
  );
  const economiaArticles: Article[] = JSON.parse(
    fs.readFileSync(economiaPath, "utf-8")
  );

  // Unindo os artigos
  const allArticles = [...politicaArticles, ...economiaArticles];

  // Tratamento do slug
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const article = allArticles.find((a) => a.slug === slug);

  if (!article) {
    return (
      <div className="container mx-auto px-6 py-10">
        Artigo não encontrado.
      </div>
    );
  }

  return (
    <main className="container mx-auto px-6 py-10 max-w-3xl bg-gray-50 p-8 rounded-2xl shadow-xl border border-gray-200">
      {/* Data */}
      <p className="text-sm text-gray-400 mb-2">{article.date}</p>

      {/* Título */}
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
        {article.title}
      </h1>

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

      {/* Conteúdo dividido em parágrafos */}
      <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
        {article.content.split("\n\n").map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}

// Metadata dinâmico para Open Graph
export function generateMetadata({ params }: any): Metadata {
  const politicaPath = path.join(process.cwd(), "src/service/politica.json");
  const economiaPath = path.join(process.cwd(), "src/service/economia.json");

  const politicaArticles: Article[] = JSON.parse(
    fs.readFileSync(politicaPath, "utf-8")
  );
  const economiaArticles: Article[] = JSON.parse(
    fs.readFileSync(economiaPath, "utf-8")
  );

  const allArticles = [...politicaArticles, ...economiaArticles];
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const article = allArticles.find((a) => a.slug === slug);

  if (!article) return { title: "Artigo não encontrado" };

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      url: `https://www.ecomzero.com.br/blog/${article.slug}`,
      images: article.image
        ? [
            {
              url: `https://www.ecomzero.com.br${article.image}`,
              width: 1200,
              height: 630,
              alt: article.title,
            },
          ]
        : [],
    },
  };
}
