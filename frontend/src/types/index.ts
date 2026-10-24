export interface System1Data {
  latency_ms: number;
  probabilities: {
    credential_leak_risk: number;
    code_bug_or_terminal: number;
    architecture_or_slide: number;
    receipt_or_invoice: number;
    meme_or_clutter: number;
  };
  dominant_category: string;
  quarantine_triggered: boolean;
  clutter_filtered: boolean;
  patch_budget_patches: number;
  patch_resolution: [number, number];
}

export interface System2Data {
  called: boolean;
  latency_ms: number;
  thinking_level: string;
  cloud_tokens_saved: boolean;
  summary_markdown: string;
  action_items: string[];
  code_snippets: string[];
  tags: string[];
}

export interface IngestResponse {
  id: number;
  sha256: string;
  original_filename: string;
  suggested_filename: string;
  status: 'organized' | 'quarantined' | 'archived';
  current_path: string;
  file_permissions: string;
  system1: System1Data;
  system2: System2Data;
}

export interface TelemetryData {
  total_processed: number;
  quarantined_count: number;
  archived_count: number;
  organized_count: number;
  cloud_tokens_saved_pct: number;
  avg_s1_latency_ms: number;
  total_storage_mb: number;
}

export interface VaultItem {
  id: number;
  sha256: string;
  original_filename: string;
  suggested_filename: string;
  current_path: string;
  status: 'organized' | 'quarantined' | 'archived';
  dominant_category: string;
  summary_md?: string;
  code_snippets_json?: string;
  extracted_tags_json?: string;
  s1_latency_ms: number;
  file_permission: string;
  file_exists: boolean;
  similarity_score?: number;
  visual_score?: number;
  text_score?: number;
  created_at: string;
}
