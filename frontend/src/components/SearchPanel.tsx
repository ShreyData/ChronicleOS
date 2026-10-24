import React, { useState, useEffect } from 'react';
import { Search, Copy, Check, FileText } from 'lucide-react';
import { searchVault } from '../services/api';
import { VaultItem } from '../types';

export const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const executeSearch = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await searchVault(q.trim());
      setResults(resp.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        executeSearch(query);
      } else {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getVaultFileUrl = (pathStr: string) => {
    if (!pathStr) return '';
    const parts = pathStr.split('/vault/');
    if (parts.length > 1) {
      return `/vault/files/${parts[1]}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keywords, visual concept, error message, or filename..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 transition font-mono"
        />
        {loading && (
          <div className="absolute right-3.5 top-3 text-xs text-slate-500 font-mono">
            Searching...
          </div>
        )}
      </div>

      {/* Results Header */}
      {query.trim() && (
        <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
          <span>Found {results.length} matches for "{query}"</span>
          <span>Ranked by hybrid visual dot-product + FTS5</span>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item, idx) => {
          const fileUrl = getVaultFileUrl(item.current_path);
          let codeSnippets: string[] = [];
          try {
            if (item.code_snippets_json) {
              codeSnippets = JSON.parse(item.code_snippets_json);
            }
          } catch (e) {}

          let tags: string[] = [];
          try {
            if (item.extracted_tags_json) {
              tags = JSON.parse(item.extracted_tags_json);
            }
          } catch (e) {}

          return (
            <div
              key={item.id}
              className="bg-[#111827] border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                {/* Image Thumbnail */}
                <div className="h-44 bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800 relative">
                  {fileUrl ? (
                    <img
                      src={fileUrl}
                      alt={item.suggested_filename || item.original_filename}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-600" />
                  )}

                  {/* Similarity Badge */}
                  {item.similarity_score !== undefined && (
                    <div className="absolute top-2 right-2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-300">
                      {(item.similarity_score * 100).toFixed(1)}% match
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                      {item.suggested_filename || item.original_filename}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                      {item.dominant_category.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {item.summary_md && (
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {item.summary_md}
                    </p>
                  )}

                  {codeSnippets.length > 0 && (
                    <div className="mt-2 bg-black/60 p-2.5 rounded border border-slate-800 relative text-xs font-mono text-emerald-300">
                      <button
                        onClick={() => copyCode(codeSnippets[0], idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] flex items-center space-x-1 text-slate-300"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                      </button>
                      <pre className="overflow-x-auto pr-14 text-[11px] max-h-24">
                        {codeSnippets[0]}
                      </pre>
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.slice(0, 4).map((t, tidx) => (
                        <span
                          key={tidx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] font-mono text-slate-500">
                <span>{item.file_permission}</span>
                <span>{item.status.toUpperCase()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {query.trim() && !loading && results.length === 0 && (
        <div className="text-center py-12 text-xs text-slate-500 font-mono">
          No matching screenshots found in the vault.
        </div>
      )}
    </div>
  );
};
