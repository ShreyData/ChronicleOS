import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TelemetryBar } from './components/TelemetryBar';
import { IngestionPanel } from './components/IngestionPanel';
import { SearchPanel } from './components/SearchPanel';
import { VaultPanel } from './components/VaultPanel';
import { fetchTelemetry } from './services/api';
import { TelemetryData } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ingest' | 'search' | 'vault'>('ingest');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);

  const loadTelemetry = async () => {
    try {
      const data = await fetchTelemetry();
      setTelemetry(data);
      setServerOnline(true);
    } catch (e) {
      setServerOnline(false);
    } finally {
      setTelemetryLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
    const interval = setInterval(loadTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        serverOnline={serverOnline}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <TelemetryBar telemetry={telemetry} loading={telemetryLoading} />

        {activeTab === 'ingest' && (
          <IngestionPanel onIngestComplete={loadTelemetry} />
        )}

        {activeTab === 'search' && <SearchPanel />}

        {activeTab === 'vault' && <VaultPanel />}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-600 font-mono">
        Chronicle Local-First Screenshot Vault &bull; Local CPU Execution
      </footer>
    </div>
  );
};

export default App;
