/**
 * LandingPage — public entry point.
 *
 * Above the fold: a two-column split on desktop (brand panel + auth card),
 * stacked on mobile with the auth card reachable quickly. Below: pricing and
 * the legal footer for users who scroll.
 */

import HeroSection from "./HeroSection";
import AuthSection from "./AuthSection";
import PricingSection from "./PricingSection";
import FooterSection from "./FooterSection";

export default function LandingPage() {
  return (
    <main className="min-h-screen w-full">
      {/* Hero + auth split */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8 py-10 lg:py-16 lg:min-h-screen flex items-center">
        <div className="grid w-full grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <HeroSection />
          <AuthSection />
        </div>
      </section>

      {/* Pricing plans */}
      <PricingSection />

      {/* Legal footer */}
      <FooterSection />
    </main>
  );
}
