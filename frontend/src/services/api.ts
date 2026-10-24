import { TelemetryData, VaultItem, IngestResponse } from '../types';

const API_BASE = '/api/v1';

export async function fetchTelemetry(): Promise<TelemetryData> {
  const res = await fetch(`${API_BASE}/telemetry`);
  if (!res.ok) throw new Error('Failed to fetch telemetry');
  return res.json();
}

export async function uploadBatchFiles(files: File[]): Promise<{
  processed_count: number;
  error_count: number;
  results: IngestResponse[];
  errors: Array<{ filename: string; error: string }>;
}> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE}/ingest/upload-batch`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Upload failed');
  }

  return res.json();
}

export async function scanHostDirectory(directoryPath: string): Promise<{
  scanned_directory: string;
  total_found: number;
  processed_count: number;
  error_count: number;
  results: IngestResponse[];
}> {
  const formData = new FormData();
  formData.append('directory_path', directoryPath);

  const res = await fetch(`${API_BASE}/ingest/scan`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Scan failed' }));
    throw new Error(err.detail || 'Directory scan failed');
  }

  return res.json();
}

export async function searchVault(query: string): Promise<{
  query: string;
  count: number;
  results: VaultItem[];
}> {
  const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchVaultItems(status?: string, category?: string): Promise<{
  count: number;
  items: VaultItem[];
}> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (category && category !== 'all') params.append('category', category);

  const url = `${API_BASE}/vault/items?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch vault items');
  return res.json();
}

export async function fetchCategories(): Promise<{
  categories: Record<string, number>;
}> {
  const res = await fetch(`${API_BASE}/vault/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}
