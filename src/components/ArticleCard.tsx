import Link from "next/link";

type ArticleCardProps = {
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  image: string;
};

export default function ArticleCard({ title, excerpt, date, slug, image }: ArticleCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
      <img src={image} alt={title} className="w-full h-48 object-cover" />
      <div className="p-5">
        <p className="text-sm text-gray-500">{date}</p>
        <h2 className="text-lg font-semibold text-gray-800 mt-2">{title}</h2>
        <p className="text-gray-600 text-sm mt-2">{excerpt}</p>
        <Link
          href={`/blog/${slug}`}
          className="inline-block mt-4 text-red-700 hover:underline font-medium"
        >
          Ler mais →
        </Link>
      </div>
    </div>
  );
}
