import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/sections/About";
import { Operations } from "@/components/sections/Operations";
import { Arsenal } from "@/components/sections/Arsenal";
import { Timeline } from "@/components/sections/Timeline";
import { Capabilities } from "@/components/sections/Capabilities";
import { Testimonials } from "@/components/sections/Testimonials";
import { Contact } from "@/components/sections/Contact";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Operations />
      <Arsenal />
      <Timeline />
      <Capabilities />
      <Testimonials />
      <Contact />
    </>
  );
}
