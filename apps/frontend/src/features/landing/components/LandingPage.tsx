/**
 * LandingPage - Main landing page component
 *
 * Composes three sections:
 * 1. HeroSection - Logo and branding message
 * 2. AuthSection - Login/Signup forms
 * 3. PricingSection - Swiper carousel with pricing plans
 *
 * Layout: Vertical stack, full-width, white background
 */

import HeroSection from "./HeroSection";
import AuthSection from "./AuthSection";
import PricingSection from "./PricingSection";
import FooterSection from "./FooterSection";

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-dvh w-full overflow-hidden bg-(--mc-color-canvas) text-(--mc-color-text)">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[54rem] bg-[radial-gradient(circle_at_14%_12%,color-mix(in_srgb,var(--mc-color-accent)_12%,transparent),transparent_28rem),radial-gradient(circle_at_88%_4%,color-mix(in_srgb,var(--mc-color-danger)_8%,transparent),transparent_24rem)]"
      />
      <div
        aria-hidden="true"
        className="mc-pitch-lines pointer-events-none absolute -right-56 top-24 -z-10 size-[38rem] rotate-12 opacity-30 md:-right-24 md:size-[46rem]"
      />

      <div className="mx-auto grid w-full max-w-[82rem] items-center gap-8 px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.72fr)] lg:gap-14 lg:px-10 lg:pb-20 lg:pt-20">
        <HeroSection />
        <AuthSection />
      </div>

      {/* Pricing: Carousel with subscription plans */}
      <PricingSection />

      {/* Footer: Legal policy links */}
      <FooterSection />
    </main>
  );
}
