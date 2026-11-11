import { useEffect, useRef } from 'react';

const THREAT_DOTS = [
  { top: '18%', left: '22%', color: 'bg-rose-400', delay: '0s' },
  { top: '62%', left: '14%', color: 'bg-amber-300', delay: '1.4s' },
  { top: '30%', left: '78%', color: 'bg-rose-400', delay: '2.6s' },
  { top: '74%', left: '70%', color: 'bg-emerald-300', delay: '0.8s' },
  { top: '46%', left: '88%', color: 'bg-amber-300', delay: '3.2s' },
];

const RADAR_RINGS = [18, 36, 54, 72, 90];

export default function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handlePointerMove = (event: PointerEvent) => {
      node.style.setProperty('--mx', `${event.clientX}px`);
      node.style.setProperty('--my', `${event.clientY}px`);
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-950 [--mx:50%] [--my:30%]"
    >
      <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,#6ee7b7_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      <div className="absolute left-1/2 top-1/2 h-[min(140vmin,1100px)] w-[min(140vmin,1100px)] -translate-x-1/2 -translate-y-1/2">
        {RADAR_RINGS.map((percent) => (
          <div
            key={percent}
            className="absolute left-1/2 top-1/2 rounded-full border border-emerald-300/10"
            style={{ width: `${percent}%`, height: `${percent}%`, transform: 'translate(-50%, -50%)' }}
          />
        ))}
        <div className="absolute inset-0 animate-spin [animation-duration:10s]">
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(52,211,153,0.28)_50deg,transparent_70deg)]" />
        </div>
      </div>

      {THREAT_DOTS.map((dot) => (
        <span key={`${dot.top}-${dot.left}`} className="absolute h-2.5 w-2.5" style={{ top: dot.top, left: dot.left }}>
          <span
            className={`absolute inset-0 animate-ping rounded-full opacity-60 ${dot.color}`}
            style={{ animationDelay: dot.delay, animationDuration: '3s' }}
          />
          <span className={`absolute inset-0 rounded-full ${dot.color}`} />
        </span>
      ))}

      <div
        className="absolute inset-0 bg-[radial-gradient(520px_circle_at_var(--mx)_var(--my),rgba(52,211,153,0.14),transparent_70%)] transition-[background] duration-300"
      />
    </div>
  );
}
