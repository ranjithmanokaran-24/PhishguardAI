import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ScanCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

export default function ScanCard({ icon: Icon, title, description, children }: ScanCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-white/[0.09] sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/30">
          <Icon className="h-6 w-6 text-emerald-300" />
        </div>
        <div>
          <h2 className="text-xl font-semibold leading-[1.2] text-white sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
        </div>
      </div>
      <div className="relative mt-6 flex flex-1 flex-col gap-4">{children}</div>
    </article>
  );
}
