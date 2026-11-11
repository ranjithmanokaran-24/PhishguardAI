import AnimatedBackground from '@/components/AnimatedBackground';
import Hero from '@/components/Hero';
import ScannerSection from '@/components/ScannerSection';

function App() {
  return (
    <div className="relative min-h-screen text-slate-100">
      <AnimatedBackground />
      <main>
        <Hero />
        <ScannerSection />
      </main>
    </div>
  );
}

export default App;
