import { CircleCheck, TriangleAlert, OctagonAlert, type LucideIcon } from 'lucide-react';
import type { RiskLevel, RiskReport } from '@/lib/riskAnalysis';

const LEVEL_STYLES: Record<RiskLevel, { label: string; text: string; bar: string; ring: string; Icon: LucideIcon }> = {
  low: {
    label: 'Looks safe',
    text: 'text-emerald-300',
    bar: 'bg-emerald-400',
    ring: 'border-emerald-400/40 bg-emerald-400/10',
    Icon: CircleCheck,
  },
  medium: {
    label: 'Proceed with caution',
    text: 'text-amber-300',
    bar: 'bg-amber-400',
    ring: 'border-amber-400/40 bg-amber-400/10',
    Icon: TriangleAlert,
  },
  high: {
    label: 'Likely dangerous',
    text: 'text-rose-300',
    bar: 'bg-rose-400',
    ring: 'border-rose-400/40 bg-rose-400/10',
    Icon: OctagonAlert,
  },
};

interface ScanResultProps {
  report: RiskReport;
}

export default function ScanResult({ report }: ScanResultProps) {
  const style = LEVEL_STYLES[report.level];
  const { Icon } = style;

  return (
    <div className={`animate-fade-up rounded-2xl border p-5 ${style.ring}`} role="status">
      <div className="flex items-center justify-between gap-4">
        <div className={`flex items-center gap-2 font-semibold ${style.text}`}>
          <Icon className="h-5 w-5" />
          <span>{style.label}</span>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${style.text}`}>{report.score}%</span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${style.bar}`}
          style={{ width: `${report.score}%` }}
        />
      </div>

      {report.findings.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {report.findings.map((finding) => (
            <li key={finding.label} className="flex items-start gap-3 text-sm text-slate-200">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.bar}`} />
              {finding.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-300">Nothing suspicious was found, but always double-check the sender before sharing details.</p>
      )}
    </div>
  );
}
