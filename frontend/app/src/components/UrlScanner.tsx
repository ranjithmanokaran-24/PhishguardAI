import { useState, type FormEvent } from 'react';
import { Globe, Loader2, Search } from 'lucide-react';
import ScanCard from '@/components/ScanCard';
import ScanResult from '@/components/ScanResult';
import { analyzeUrl, type RiskReport } from '@/lib/riskAnalysis';

const SCAN_DELAY_MS = 900;

export default function UrlScanner() {
  const [value, setValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = analyzeUrl(value);
    if (!result) {
      setReport(null);
      setError('That does not look like a web address. Check it and try again.');
      return;
    }
    setError(null);
    setScanning(true);
    setReport(null);
    window.setTimeout(() => {
      setReport(result);
      setScanning(false);
    }, SCAN_DELAY_MS);
  };

  return (
    <ScanCard
      icon={Globe}
      title="URL Scanner"
      description="Paste a link from an email, text, or social post to check whether it points somewhere safe."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="url-input" className="sr-only">
          Web address to scan
        </label>
        <input
          id="url-input"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://example.com/login"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
        />
        <button
          type="submit"
          disabled={scanning || !value.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-400/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {scanning ? 'Scanning...' : 'Scan link'}
        </button>
      </form>

      {scanning && (
        <div className="relative h-16 overflow-hidden rounded-xl border border-emerald-300/20 bg-slate-950/50">
          <div className="absolute inset-x-0 top-0 h-6 animate-scan-line bg-gradient-to-b from-transparent via-emerald-300/40 to-transparent" />
          <p className="relative flex h-full items-center justify-center text-sm text-slate-300">Checking the address...</p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {report && !scanning && <ScanResult report={report} />}
    </ScanCard>
  );
}
