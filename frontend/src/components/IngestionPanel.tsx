import React, { useState, useRef } from 'react';
import { Upload, FolderUp, FolderSearch, CheckCircle, AlertTriangle, ShieldAlert, Copy, Check } from 'lucide-react';
import { uploadBatchFiles, scanHostDirectory } from '../services/api';
import { IngestResponse } from '../types';

interface Props {
  onIngestComplete: () => void;
}

export const IngestionPanel: React.FC<Props> = ({ onIngestComplete }) => {
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState<IngestResponse[]>([]);
  const [selectedResult, setSelectedResult] = useState<IngestResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState('');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setProcessing(true);
    setErrorMessage(null);

    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const files: File[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const f = filesList[i];
      const lower = f.name.toLowerCase();
      if (validExtensions.some((ext) => lower.endsWith(ext))) {
        files.push(f);
      }
    }

    if (files.length === 0) {
      setErrorMessage('No valid image files (.png, .jpg, .webp) detected.');
      setProcessing(false);
      return;
    }

    try {
      const resp = await uploadBatchFiles(files);
      setResults(resp.results);
      if (resp.results.length > 0) {
        setSelectedResult(resp.results[0]);
      }
      onIngestComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing files.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCustomPathScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPath.trim()) return;
    setProcessing(true);
    setErrorMessage(null);

    try {
      const resp = await scanHostDirectory(customPath.trim());
      setResults(resp.results);
      if (resp.results.length > 0) {
        setSelectedResult(resp.results[0]);
      }
      onIngestComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'Directory scan failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Upload & Ingestion Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`lg:col-span-2 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
            dragActive
              ? 'border-slate-400 bg-slate-900/60'
              : 'border-slate-800 hover:border-slate-700 bg-[#111827]'
          }`}
        >
          <Upload className="w-8 h-8 text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-200">
            Drag and drop screenshots here
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supported formats: PNG, JPG, WEBP
          </p>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              disabled={processing}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 transition"
            >
              Select Files
            </button>

            {/* Folder selection input */}
            <input
              type="file"
              ref={folderInputRef}
              // @ts-ignore
              webkitdirectory=""
              // @ts-ignore
              directory=""
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              disabled={processing}
              onClick={() => folderInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 transition flex items-center space-x-1"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Select Folder</span>
            </button>
          </div>
        </div>

        {/* Local Directory Scanner */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-200 font-medium text-sm mb-2">
              <FolderSearch className="w-4 h-4 text-slate-400" />
              <span>Scan Local Directory</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Specify any local directory path on the machine to ingest existing screenshots.
            </p>
          </div>

          <form onSubmit={handleCustomPathScan} className="space-y-2">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. /home/user/Pictures/Screenshots"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-750 text-xs rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 font-mono"
            />
            <button
              type="submit"
              disabled={processing || !customPath.trim()}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded border border-slate-700 transition"
            >
              {processing ? 'Processing...' : 'Scan Directory'}
            </button>
          </form>
        </div>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="p-3 bg-red-950/50 border border-red-800 rounded text-xs text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Processing Status Banner */}
      {processing && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Processing screenshots through edge firewall and router...</span>
        </div>
      )}

      {/* Results and Inspector Grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File List Navigation */}
          <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-lg p-4 max-h-[620px] overflow-y-auto">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Processed Batch ({results.length})
            </div>
            <div className="space-y-1.5">
              {results.map((item) => {
                const isSelected = selectedResult?.sha256 === item.sha256;
                return (
                  <div
                    key={item.sha256}
                    onClick={() => setSelectedResult(item)}
                    className={`p-2.5 rounded cursor-pointer border text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="truncate mr-2 font-mono">
                      {item.suggested_filename || item.original_filename}
                    </div>
                    <div>
                      {item.status === 'quarantined' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800">
                          QUARANTINE
                        </span>
                      )}
                      {item.status === 'archived' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                          ARCHIVED
                        </span>
                      )}
                      {item.status === 'organized' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ORGANIZED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Item Detailed Inspector */}
          {selectedResult && (
            <div className="lg:col-span-8 space-y-4">
              {/* Trust Gate Decision Banner */}
              <div
                className={`p-4 rounded-lg border flex items-start space-x-3 ${
                  selectedResult.status === 'quarantined'
                    ? 'bg-red-950/30 border-red-800/80 text-red-200'
                    : selectedResult.status === 'archived'
                    ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                    : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                }`}
              >
                {selectedResult.status === 'quarantined' && (
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                )}
                {selectedResult.status === 'archived' && (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                {selectedResult.status === 'organized' && (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-sm">
                    {selectedResult.status === 'quarantined' &&
                      'Security Quarantine Gate Triggered'}
                    {selectedResult.status === 'archived' &&
                      'Clutter Filter Gate Triggered (Cloud Skipped)'}
                    {selectedResult.status === 'organized' &&
                      'Organized and Cataloged'}
                  </div>
                  <div className="text-slate-300 font-mono text-[11px]">
                    Destination: {selectedResult.current_path}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Permissions: {selectedResult.file_permissions} | Local Latency: {selectedResult.system1.latency_ms} ms
                  </div>
                </div>
              </div>

              {/* System 1 Decision Metrics */}
              <div className="bg-[#111827] border border-slate-800 rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  System 1 - Multi-Label Routing Probabilities
                </div>

                <div className="space-y-2.5">
                  {Object.entries(selectedResult.system1.probabilities).map(
                    ([route, prob]) => {
                      const isRisk = route === 'credential_leak_risk';
                      const pct = Math.round(prob * 100);
                      return (
                        <div key={route} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className={isRisk ? 'text-red-300' : 'text-slate-300'}>
                              {route}
                            </span>
                            <span className="text-slate-400">
                              {prob.toFixed(4)} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isRisk
                                  ? prob >= 0.35
                                    ? 'bg-red-500'
                                    : 'bg-slate-500'
                                  : prob >= 0.55 && route === 'meme_or_clutter'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
                  <div>Dominant: <span className="text-slate-200">{selectedResult.system1.dominant_category}</span></div>
                  <div>Patch Budget: <span className="text-slate-200">{selectedResult.system1.patch_budget_patches} patches</span></div>
                  <div>Resolution: <span className="text-slate-200">{selectedResult.system1.patch_resolution.join('x')}</span></div>
                </div>
              </div>

              {/* System 2 Metadata Output */}
              <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  System 2 - Extracted Structured Reasoning
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 font-mono uppercase">Suggested Filename</label>
                  <p className="font-mono text-xs text-slate-200 bg-slate-900 p-2 rounded border border-slate-800 mt-1">
                    {selectedResult.suggested_filename}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 font-mono uppercase">Summary</label>
                  <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded border border-slate-800 mt-1 whitespace-pre-line leading-relaxed">
                    {selectedResult.system2.summary_markdown}
                  </div>
                </div>

                {selectedResult.system2.code_snippets.length > 0 && (
                  <div>
                    <label className="text-[11px] text-slate-500 font-mono uppercase">Code Snippets & Fixes</label>
                    <div className="space-y-2 mt-1">
                      {selectedResult.system2.code_snippets.map((code, idx) => (
                        <div key={idx} className="relative bg-black/60 p-3 rounded border border-slate-800 font-mono text-xs text-emerald-300">
                          <button
                            onClick={() => copyToClipboard(code, idx)}
                            className="absolute top-2 right-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center space-x-1"
                          >
                            {copiedCodeIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCodeIndex === idx ? 'Copied' : 'Copy'}</span>
                          </button>
                          <pre className="overflow-x-auto pr-14">{code}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResult.system2.tags.length > 0 && (
                  <div>
                    <label className="text-[11px] text-slate-500 font-mono uppercase">Tags</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedResult.system2.tags.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
