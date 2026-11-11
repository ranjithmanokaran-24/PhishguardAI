import { useState, type FormEvent } from 'react';
import { Loader2, MessageSquareWarning, ScanSearch } from 'lucide-react';
import ScanCard from '@/components/ScanCard';
import ScanResult from '@/components/ScanResult';
import { analyzeMessage, type RiskReport } from '@/lib/riskAnalysis';

const SCAN_DELAY_MS = 900;

export default function MessageScanner() {
  const [value, setValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<RiskReport | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = analyzeMessage(value);
    if (!result) return;
    setScanning(true);
    setReport(null);
    window.setTimeout(() => {
      setReport(result);
      setScanning(false);
    }, SCAN_DELAY_MS);
  };

  return (
    <ScanCard
      icon={MessageSquareWarning}
      title="Scam Message Scanner"
      description="Paste a suspicious email, text, or chat message to spot pressure tactics, fake rewards, and requests for private details."
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3">
        <label htmlFor="message-input" className="sr-only">
          Message to scan
        </label>
        <textarea
          id="message-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Paste the full message here..."
          rows={6}
          className="min-h-[9rem] w-full flex-1 resize-y rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-slate-400 transition focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
        />
        <button
          type="submit"
          disabled={scanning || !value.trim()}
          className="inline-flex items-center justify-center gap-2 self-stretch rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-400/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none sm:self-end"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          {scanning ? 'Scanning...' : 'Scan message'}
        </button>
      </form>

      {scanning && (
        <div className="relative h-16 overflow-hidden rounded-xl border border-emerald-300/20 bg-slate-950/50">
          <div className="absolute inset-x-0 top-0 h-6 animate-scan-line bg-gradient-to-b from-transparent via-emerald-300/40 to-transparent" />
          <p className="relative flex h-full items-center justify-center text-sm text-slate-300">Reading the message...</p>
        </div>
      )}

      {report && !scanning && <ScanResult report={report} />}
    </ScanCard>
  );
}
