import React from 'react';
import { TelemetryData } from '../types';

interface Props {
  telemetry: TelemetryData | null;
  loading: boolean;
}

export const TelemetryBar: React.FC<Props> = ({ telemetry, loading }) => {
  const items = [
    {
      label: 'Screenshots Processed',
      value: telemetry ? telemetry.total_processed : 0,
      suffix: '',
    },
    {
      label: 'Secrets Quarantined',
      value: telemetry ? telemetry.quarantined_count : 0,
      suffix: '',
      highlight: (telemetry?.quarantined_count ?? 0) > 0 ? 'text-red-400' : 'text-slate-200',
    },
    {
      label: 'Clutter Filtered',
      value: telemetry ? telemetry.archived_count : 0,
      suffix: '',
    },
    {
      label: 'Cloud Tokens Saved',
      value: telemetry ? telemetry.cloud_tokens_saved_pct : 0,
      suffix: '%',
      highlight: 'text-emerald-400',
    },
    {
      label: 'Average Local Latency',
      value: telemetry ? telemetry.avg_s1_latency_ms : 0,
      suffix: ' ms',
    },
    {
      label: 'Vault Storage',
      value: telemetry ? telemetry.total_storage_mb : 0,
      suffix: ' MB',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-[#111827] border border-slate-800 rounded-lg p-3 flex flex-col justify-between"
        >
          <span className="text-xs text-slate-400 font-medium tracking-wide">
            {item.label}
          </span>
          <div className="mt-2 flex items-baseline">
            <span className={`text-xl font-semibold tracking-tight ${item.highlight || 'text-slate-100'}`}>
              {loading ? '-' : item.value}
            </span>
            <span className="text-xs text-slate-400 ml-1">{item.suffix}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
