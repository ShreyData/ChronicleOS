import React, { useState, useEffect } from 'react';
import { fetchVaultItems, fetchCategories } from '../services/api';
import { VaultItem } from '../types';
import { 
  Shield, 
  Archive, 
  CheckCircle, 
  FileText, 
  Code2, 
  Layers, 
  Receipt, 
  Image as ImageIcon,
  X,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: Layers },
  { id: 'code_bug_or_terminal', label: 'Code & Terminal', icon: Code2 },
  { id: 'architecture_or_slide', label: 'Architecture & Diagrams', icon: Layers },
  { id: 'receipt_or_invoice', label: 'Receipts & Invoices', icon: Receipt },
  { id: 'meme_or_clutter', label: 'Clutter & Memes', icon: ImageIcon },
];

export const VaultPanel: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'organized' | 'quarantined' | 'archived'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const vaultResp = await fetchVaultItems(statusFilter, categoryFilter);
      setItems(vaultResp.items || []);
    } catch (e) {
      console.error('Failed to fetch vault items:', e);
    }

    try {
      const catResp = await fetchCategories();
      setCategoryCounts(catResp.categories || {});
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter]);

  const getVaultFileUrl = (pathStr: string) => {
    if (!pathStr) return '';
    const parts = pathStr.split('/vault/');
    if (parts.length > 1) {
      const encodedSubpath = parts[1]
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
      return `/vault/files/${encodedSubpath}`;
    }
    return '';
  };

  const formatCategoryName = (cat: string) => {
    switch (cat) {
      case 'code_bug_or_terminal':
        return 'Code & Terminal';
      case 'architecture_or_slide':
        return 'Architecture / Slide';
      case 'receipt_or_invoice':
        return 'Receipt / Invoice';
      case 'meme_or_clutter':
        return 'Clutter / Meme';
      default:
        return cat.replace(/_/g, ' ');
    }
  };

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Category Pills Bar */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Filter by Category
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === 'all'
              ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
              : categoryCounts[cat.id] || 0;
            const isSelected = categoryFilter === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 border ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-[#111827] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-blue-500/30 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filter Bar */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        {(['all', 'organized', 'quarantined', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1 rounded text-xs font-mono uppercase transition-colors ${
              statusFilter === tab
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid of Items */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500 font-mono">
          Loading vault items...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-500 font-mono">
          No screenshots match the selected category and status filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const fileUrl = getVaultFileUrl(item.current_path);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-[#111827] border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between hover:border-slate-600 transition cursor-pointer group"
              >
                <div>
                  <div className="h-44 bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800 relative">
                    {fileUrl ? (
                      <img
                        src={fileUrl}
                        alt={item.suggested_filename || item.original_filename}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-slate-600" />
                    )}

                    {item.status === 'quarantined' && (
                      <div className="absolute top-2 right-2 bg-red-950/90 border border-red-800 px-2 py-0.5 rounded text-[10px] font-mono text-red-300 flex items-center space-x-1">
                        <Shield className="w-3 h-3" />
                        <span>QUARANTINED</span>
                      </div>
                    )}
                    {item.status === 'archived' && (
                      <div className="absolute top-2 right-2 bg-amber-950/90 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 flex items-center space-x-1">
                        <Archive className="w-3 h-3" />
                        <span>ARCHIVED</span>
                      </div>
                    )}
                    {item.status === 'organized' && (
                      <div className="absolute top-2 right-2 bg-emerald-950/90 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>ORGANIZED</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono text-xs font-semibold text-slate-200 truncate">
                        {item.suggested_filename || item.original_filename}
                      </div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                        {formatCategoryName(item.dominant_category)}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 truncate">
                      {item.current_path}
                    </div>

                    {item.summary_md && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.summary_md}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 py-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] font-mono text-slate-500">
                  <span>Perms: {item.file_permission}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#111827] z-10">
              <div className="truncate mr-4">
                <h3 className="font-mono text-sm font-semibold text-slate-100 truncate">
                  {selectedItem.suggested_filename || selectedItem.original_filename}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Category: {formatCategoryName(selectedItem.dominant_category)} &bull; Status: {selectedItem.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={getVaultFileUrl(selectedItem.current_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                  title="Open full size in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Image Preview */}
              <div className="bg-black/80 rounded-lg p-2 border border-slate-800 flex items-center justify-center max-h-[420px] overflow-hidden">
                <img
                  src={getVaultFileUrl(selectedItem.current_path)}
                  alt="Screenshot preview"
                  className="max-h-[400px] w-auto object-contain rounded"
                />
              </div>

              {/* Summary */}
              {selectedItem.summary_md && (
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold mb-1.5">
                    Summary
                  </h4>
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedItem.summary_md}
                  </div>
                </div>
              )}

              {/* Code Snippets */}
              {(() => {
                let snippets: string[] = [];
                try {
                  if (selectedItem.code_snippets_json) {
                    snippets = JSON.parse(selectedItem.code_snippets_json);
                  }
                } catch (e) {}

                if (snippets.length === 0) return null;

                return (
                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold mb-1.5">
                      Extracted Code / Commands
                    </h4>
                    <div className="space-y-2">
                      {snippets.map((snip, sIdx) => (
                        <div key={sIdx} className="relative bg-black/60 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300">
                          <button
                            onClick={() => copyCode(snip, sIdx)}
                            className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center space-x-1"
                          >
                            {copiedCodeIndex === sIdx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCodeIndex === sIdx ? 'Copied' : 'Copy'}</span>
                          </button>
                          <pre className="overflow-x-auto pr-16">{snip}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono pt-3 border-t border-slate-800 text-slate-400">
                <div>
                  <span className="block text-[10px] uppercase text-slate-500">File Path</span>
                  <span className="text-slate-300 truncate block" title={selectedItem.current_path}>
                    {selectedItem.current_path}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-500">Permissions</span>
                  <span className="text-slate-300">{selectedItem.file_permission}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-500">Routing Latency</span>
                  <span className="text-slate-300">{selectedItem.s1_latency_ms} ms</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-500">Indexed Date</span>
                  <span className="text-slate-300">{new Date(selectedItem.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
