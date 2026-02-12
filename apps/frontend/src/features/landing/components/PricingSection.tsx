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
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import PricingCard from "./PricingCard";
import type { PricingPlan } from "../types";

// Import Swiper core styles
import "swiper/css";

/**
 * Custom styles to ensure slides are always visible.
 * Swiper's default loop behavior can hide slides during transitions.
 */
const swiperStyles = `
  .pricing-swiper .swiper-slide {
    visibility: visible !important;
    opacity: 1 !important;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .pricing-swiper .swiper-wrapper {
    transition-timing-function: ease-out;
  }
`;

/**
 * Pricing plans data
 *
 * Three tiers: Free, Pro (highlighted), and Plus
 * Prices are in EUR per month
 */
const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    pricePerMonth: 0,
    benefits: [
      "Access to basic Laws of the Game content",
      "Limited practice quizzes",
      "Community forum access",
      "Weekly newsletter",
    ],
    buttonText: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    pricePerMonth: 9,
    benefits: [
      "Everything in Free",
      "Full video scenario library",
      "AI-powered feedback on decisions",
      "Personalized training plans",
      "Progress tracking & analytics",
      "Priority support",
    ],
    isHighlighted: true,
    buttonText: "Subscribe",
  },
  {
    id: "plus",
    name: "Plus",
    pricePerMonth: 29,
    benefits: [
      "Everything in Pro",
      "Advanced analytics insights",
      "Priority support + faster response",
      "Early access to new premium features",
    ],
    buttonText: "Subscribe",
  },
];

/**
 * Duplicate plans array to ensure smooth infinite loop.
 * Swiper requires more slides than slidesPerView for proper loop behavior.
 * With slidesPerView: 1.5, we need at least 6 slides for seamless looping.
 */
const CAROUSEL_SLIDES = [...PRICING_PLANS, ...PRICING_PLANS];

export default function PricingSection() {
  const navigate = useNavigate();

  /**
   * Handle plan selection — navigates to the billing pricing page
   * where users can sign up / log in and then proceed to checkout.
   */
  const handlePlanSelect = (planId: string) => {
    void planId;
    navigate('/app/billing/pricing');
  };

  return (
    <section className="py-4 overflow-hidden">
      {/* Inject custom styles to keep slides always visible */}
      <style>{swiperStyles}</style>

      {/* Section title */}
      <h2 className="text-2xl md:text-3xl font-bold text-gray-700 text-center mb-8 px-6">
        Choose Your Plan
      </h2>

      {/* Swiper carousel */}
      <Swiper
        className="pricing-swiper"
        modules={[Autoplay]}
        slidesPerView={1.5}
        spaceBetween={16}
        centeredSlides={true}
        loop={true}
        speed={500}
        autoplay={{
          delay: 2000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        grabCursor={true}
        touchEventsTarget="container"
        simulateTouch={true}
        allowTouchMove={true}
        watchSlidesProgress={true}
      >
        {CAROUSEL_SLIDES.map((plan, index) => (
          <SwiperSlide key={`${plan.id}-${index}`} className="py-4">
            <PricingCard plan={plan} onSelect={handlePlanSelect} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
