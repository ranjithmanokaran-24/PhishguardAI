import { ChevronDown, ShieldCheck } from 'lucide-react';

const MOTTO = 'Spot the trap before it springs. Paste any link or message and know in seconds whether it is safe to trust.';

export default function Hero() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-up flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/40">
          <ShieldCheck className="h-6 w-6 text-emerald-300" />
        </div>
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-300">Online safety</span>
      </div>

      <h1 className="animate-fade-up mt-8 text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl [animation-delay:150ms]">
        Phish
        <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-sweep">
          Guard
        </span>
        AI
      </h1>

      <p className="animate-fade-up mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg [animation-delay:300ms]">
        {MOTTO}
      </p>

      <a
        href="#scanners"
        className="animate-fade-up group mt-12 inline-flex flex-col items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-emerald-300 [animation-delay:450ms]"
      >
        Start scanning
        <ChevronDown className="h-6 w-6 animate-bounce text-emerald-300 transition-transform group-hover:translate-y-1" />
      </a>
    </section>
  );
}
