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
    <main className="min-h-screen w-full bg-(--bg-primary)">
      {/* Hero: Logo, title, and value proposition */}
      <HeroSection />

      {/* Authentication: Login/Signup forms */}
      <AuthSection />

      {/* Pricing: Carousel with subscription plans */}
      <PricingSection />

      {/* Footer: Legal policy links */}
      <FooterSection />
    </main>
  );
}
