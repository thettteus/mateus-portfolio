import { Header } from '@/components/layout/Header';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Hero } from '@/components/sections/Hero';
import { Projects } from '@/components/sections/Projects';
import { Leverage } from '@/components/sections/Leverage';
import { Depth } from '@/components/sections/Depth';
import TechStack from '@/components/sections/Depth/TechStack';
import { Writing } from '@/components/sections/Writing';
import { Contact } from '@/components/sections/Contact';
import { Analytics } from "@vercel/analytics/next"

export default function Home() {
  return (
    <>
      <Analytics/>
      <ScrollReveal />
      <Header />
      <main>
        <Hero />
        <Depth />
        <TechStack />
        <Projects />
        <Leverage />
        <Writing />
        <Contact />
      </main>
    </>
  );
}
