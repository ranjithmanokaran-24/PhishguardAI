import UrlScanner from '@/components/UrlScanner';
import MessageScanner from '@/components/MessageScanner';

export default function ScannerSection() {
  return (
    <section id="scanners" className="px-6 pb-24 pt-12 sm:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-300">Two ways to check</p>
          <h2 className="mt-3 text-3xl font-bold leading-[1.2] text-white sm:text-4xl">Check before you click or reply</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Nothing you paste is stored. Each check runs right here in your browser.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <UrlScanner />
          <MessageScanner />
        </div>
      </div>
    </section>
  );
}
