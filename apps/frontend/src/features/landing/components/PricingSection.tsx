/**
 * PricingSection - Swiper carousel displaying pricing plans
 *
 * Uses Swiper library to create an infinite carousel of pricing cards.
 *
 * Carousel behavior:
 * - Infinite loop (cards cycle continuously)
 * - 1.5 slides visible (1 full center + half of adjacent cards)
 * - Auto-slide enabled (3.5 second intervals)
 * - Touch/swipe & drag enabled for mobile and desktop
 * - Centered slides for better visual effect
 * - Smooth 500ms transitions
 *
 * Layout:
 * ┌─────────────────────────────────────────────────┐
 * │              "Choose Your Plan"                 │
 * │  ┌──────┐  ┌────────────┐  ┌──────┐            │
 * │  │ half │  │   center   │  │ half │            │
 * │  │      │  │   (full)   │  │      │            │
 * │  └──────┘  └────────────┘  └──────┘            │
 * └─────────────────────────────────────────────────┘
 */

import { useNavigate } from "react-router-dom";
import PricingCard from "./PricingCard";
import type { PricingPlan } from "../types";
import { useTranslation } from "react-i18next";

/**
 * Pricing plans data
 *
 * The first public release is deliberately free-only. Paid tiers are omitted
 * until their entitlements, support model and commercial terms are validated.
 */
const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    pricePerMonth: 0,
    benefits: [
      "All available referee tests",
      "Practice questions by law and topic",
      "Video decision scenarios",
      "Progress dashboard",
      "Community and direct messages",
    ],
    buttonText: "Get Started",
  },
];

export default function PricingSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /**
   * Handle plan selection — navigates to the billing pricing page
   * where users can sign up / log in and then proceed to checkout.
   */
  const handlePlanSelect = (planId: string) => {
    if (planId !== "free") return;
    navigate('/app/pricing');
  };

  return (
    <section className="py-4 overflow-hidden">
      {/* Section title */}
      <h2 className="text-2xl md:text-3xl font-bold text-(--text-primary) text-center mb-8 px-6">
        {t("Choose Your Plan")}
      </h2>

      <p
        className="mx-auto mb-5 max-w-2xl px-6 text-center text-sm text-(--text-muted)"
        role="note"
      >
        {t("RefLab is launching free. Paid subscriptions are currently unavailable.")}
      </p>

      <div className="mx-auto max-w-md px-4 py-4 sm:px-6">
        {PRICING_PLANS.map((plan) => (
          <PricingCard key={plan.id} plan={plan} onSelect={handlePlanSelect} />
        ))}
      </div>
    </section>
  );
}
