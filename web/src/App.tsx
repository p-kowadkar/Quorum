import { AmbientField } from "./components/AmbientField";
import { Footer } from "./components/Footer";
import { Nav } from "./components/Nav";
import { CTA } from "./sections/CTA";
import { Features } from "./sections/Features";
import { Flow } from "./sections/Flow";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { Patterns } from "./sections/Patterns";
import { Problem } from "./sections/Problem";

export default function App() {
  return (
    <div className="relative min-h-screen">
      <AmbientField />
      <div className="relative z-10">
        <Nav />
        <main>
          <Hero />
          <Problem />
          <HowItWorks />
          <Features />
          <Patterns />
          <Flow />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}
