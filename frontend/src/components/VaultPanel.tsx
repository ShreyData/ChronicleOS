import React, { useState, useEffect } from 'react';
import { fetchVaultItems } from '../services/api';
import { VaultItem } from '../types';
import { Shield, Archive, CheckCircle, FileText } from 'lucide-react';

export const VaultPanel: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'organized' | 'quarantined' | 'archived'>('all');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = async (statusFilter?: string) => {
    setLoading(true);
    try {
      const resp = await fetchVaultItems(statusFilter === 'all' ? undefined : statusFilter);
      setItems(resp.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(filter);
  }, [filter]);

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
      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        {(['all', 'organized', 'quarantined', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase transition-colors ${
              filter === tab
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
          No screenshots found in this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const fileUrl = getVaultFileUrl(item.current_path);

            return (
              <div
                key={item.id}
                className="bg-[#111827] border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between"
              >
                <div>
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

                    {item.status === 'quarantined' && (
                      <div className="absolute top-2 right-2 bg-red-950 border border-red-800 px-2 py-0.5 rounded text-[10px] font-mono text-red-300 flex items-center space-x-1">
                        <Shield className="w-3 h-3" />
                        <span>QUARANTINED (LOCKED)</span>
                      </div>
                    )}
                    {item.status === 'archived' && (
                      <div className="absolute top-2 right-2 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 flex items-center space-x-1">
                        <Archive className="w-3 h-3" />
                        <span>CLUTTER FILTERED</span>
                      </div>
                    )}
                    {item.status === 'organized' && (
                      <div className="absolute top-2 right-2 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>ORGANIZED</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="font-mono text-xs font-semibold text-slate-200 truncate">
                      {item.suggested_filename || item.original_filename}
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 break-all">
                      Path: {item.current_path}
                    </div>

                    {item.summary_md && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.summary_md}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 py-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] font-mono text-slate-500">
                  <span>Permissions: {item.file_permission}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
