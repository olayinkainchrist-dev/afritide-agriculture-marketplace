"use client";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Newspaper, RefreshCw, Clock } from "lucide-react";

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: { name: string };
}

export default function MarketNews() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["market-news"],
    queryFn: async () => {
      const res = await fetch(
        "https://afritide-agriculture-marketplace.onrender.com/api/v1/search/news"
      );
      const json = await res.json();
      return (json.data || []) as NewsArticle[];
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const articles = data || [];
  const updatedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) return (
    <section className="py-20 bg-[#060f08] border-t border-white/4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-10 bg-white/4 rounded-2xl w-64 mb-10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/3 rounded-2xl h-56 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );

  if (!articles.length) return null;

  return (
    <section className="py-20 bg-[#060f08] border-t border-white/4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-green-500 text-sm font-bold uppercase tracking-widest mb-3">
              Market Intelligence
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Agriculture
              <span className="bg-linear-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> News</span>
            </h2>
            {updatedTime && (
              <p className="text-gray-600 text-sm mt-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Updated at {updatedTime}
              </p>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 text-sm text-green-500 hover:text-green-400 font-medium transition-colors bg-green-950/40 border border-green-900/60 hover:border-green-700/60 px-4 py-2 rounded-xl disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Featured article */}
        {articles[0] && (
          <a
            href={articles[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white/3 border border-white/[0.07] hover:border-green-800/50 rounded-3xl overflow-hidden mb-5 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/60"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="h-56 md:h-72 bg-linear-to-br from-green-950/60 to-emerald-950/40 overflow-hidden">
                {articles[0].urlToImage ? (
                  <img
                    src={articles[0].urlToImage}
                    alt={articles[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Newspaper className="w-16 h-16 text-green-900" />
                  </div>
                )}
              </div>
              <div className="p-7 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-green-500 text-xs font-bold uppercase tracking-widest">
                    {articles[0].source.name}
                  </span>
                  <span className="text-gray-700 text-xs">·</span>
                  <span className="text-gray-600 text-xs">{formatDate(articles[0].publishedAt)}</span>
                  <span className="ml-auto text-xs bg-green-500/20 text-green-400 border border-green-700/40 px-2 py-0.5 rounded-full font-medium">
                    Featured
                  </span>
                </div>
                <h3 className="text-white font-black text-xl mb-3 leading-snug group-hover:text-green-400 transition-colors line-clamp-3">
                  {articles[0].title}
                </h3>
                {articles[0].description && (
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-4">
                    {articles[0].description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                  Read full article <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </a>
        )}

        {/* News grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.slice(1).map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white/3 border border-white/[0.07] hover:border-green-800/50 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 flex flex-col"
            >
              <div className="h-40 bg-linear-to-br from-green-950/60 to-emerald-950/40 overflow-hidden shrink-0">
                {article.urlToImage ? (
                  <img
                    src={article.urlToImage}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Newspaper className="w-8 h-8 text-green-900" />
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-500 text-[10px] font-bold uppercase tracking-widest truncate">
                    {article.source.name}
                  </span>
                  <span className="text-gray-700 text-[10px] ml-auto shrink-0">
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
                <h3 className="text-gray-200 font-bold text-sm leading-snug group-hover:text-white transition-colors line-clamp-3 flex-1">
                  {article.title}
                </h3>
                <div className="flex items-center gap-1 text-green-500 text-xs font-medium mt-3 pt-3 border-t border-white/5">
                  Read more <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

