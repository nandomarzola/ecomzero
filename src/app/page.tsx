"use client";
import ArticleCard from "@/components/ArticleCard";
import politicaData from "@/service/politica.json";
import economiaData from "@/service/economia.json";
import { useState } from "react";

const ARTICLES_PER_PAGE = 6;

export default function NewsPage() {
  const allArticles = [...politicaData, ...economiaData];

  // Ordenar do mais recente para o mais antigo
  allArticles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(allArticles.length / ARTICLES_PER_PAGE);

  const startIndex = (page - 1) * ARTICLES_PER_PAGE;
  const paginatedArticles = allArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setPage((p) => Math.min(p + 1, totalPages));

  return (
    <main className="container mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Últimas Notícias
      </h1>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {paginatedArticles.map((article: any) => (
          <ArticleCard key={article.slug} {...article} />
        ))}
      </div>

      {/* Paginação */}
      <div className="flex justify-center mt-10 gap-2 items-center">
        <button
          onClick={handlePrev}
          disabled={page === 1}
          className="px-4 py-2 bg-black text-white rounded disabled:bg-gray-500"
        >
          Anterior
        </button>

        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`px-4 py-2 rounded ${
              page === i + 1
                ? "bg-red-900 text-white"
                : "bg-black text-white hover:bg-red-700"
            }`}
          >
            {i + 1}
          </button>
        ))}

        <button
          onClick={handleNext}
          disabled={page === totalPages}
          className="px-4 py-2 bg-black text-white rounded disabled:bg-gray-500"
        >
          Próxima
        </button>
      </div>

    </main>
  );
}
