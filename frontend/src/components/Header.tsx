import React from 'react';
import { Shield, Search, UploadCloud, Archive, HardDrive } from 'lucide-react';

interface Props {
  activeTab: 'ingest' | 'search' | 'vault';
  setActiveTab: (tab: 'ingest' | 'search' | 'vault') => void;
  serverOnline: boolean;
}

export const Header: React.FC<Props> = ({ activeTab, setActiveTab, serverOnline }) => {
  return (
    <header className="border-b border-slate-800 bg-[#0d131f] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold tracking-wider text-slate-100">CHRONICLE</span>
            <span className="text-xs text-slate-400 font-mono">v1.0</span>
          </div>

          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab('ingest')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'ingest'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Ingestion</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'search'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'vault'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Vault</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                serverOnline ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span>{serverOnline ? 'Engine Online' : 'Connecting'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
