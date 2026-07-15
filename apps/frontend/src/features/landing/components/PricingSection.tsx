/**
 * PricingSection - Swiper carousel displaying pricing plans
 *
 * Uses Swiper to create a keyboard and touch-accessible pricing carousel.
 *
 * Carousel behavior:
 * - Responsive slides (one readable card on mobile, three on desktop)
 * - Touch/swipe & drag enabled for mobile and desktop
 * - Visible previous/next controls and arrow-key support
 * - No cloned slides or automatic movement
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

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Keyboard } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import PricingCard from "./PricingCard";
import type { PricingPlan } from "../types";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui";
import {
  buildAuthLandingUrl,
  parseAuthPlan,
  persistAuthReturnTo,
} from "@/features/auth/utils/authNavigation";

// Import Swiper core styles
import "swiper/css";

/**
 * Keeps card heights aligned while preserving Swiper's visibility semantics.
 */
const swiperStyles = `
  .pricing-swiper .swiper-slide {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    height: auto;
  }
  .pricing-swiper .swiper-wrapper {
    transition-timing-function: ease-out;
    align-items: stretch;
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
    pricePerMonth: 4.99,
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
    pricePerMonth: 9.99,
    benefits: [
      "Everything in Pro",
      "Advanced analytics insights",
      "Priority support + faster response",
      "Early access to new premium features",
    ],
    buttonText: "Subscribe",
  },
];

interface PricingSectionProps {
  onRequestSignup: () => void;
}

export default function PricingSection({ onRequestSignup }: PricingSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [carouselState, setCarouselState] = useState({
    canGoNext: true,
    canGoPrevious: false,
  });
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Handle plan selection — navigates to the billing pricing page
   * where users can sign up / log in and then proceed to checkout.
   */
  const handlePlanSelect = (planId: string) => {
    const plan = parseAuthPlan(planId);
    if (!plan) return;

    const returnTo = persistAuthReturnTo(`/app/pricing?plan=${plan}`);
    onRequestSignup();
    navigate(buildAuthLandingUrl('signup', returnTo, plan));

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById('auth')?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
        document.getElementById('auth-signup-tab')?.focus({ preventScroll: true });
      });
    });
  };

  const syncCarouselState = (swiper: SwiperInstance) => {
    setCarouselState({
      canGoNext: !swiper.isEnd,
      canGoPrevious: !swiper.isBeginning,
    });
  };

  return (
    <section className="overflow-hidden border-y border-(--mc-color-border) bg-(--mc-color-surface)/55 py-14 sm:py-16 lg:py-20">
      <style>{swiperStyles}</style>

      <div className="mx-auto mb-8 flex w-full max-w-[82rem] items-end justify-between gap-4 px-4 sm:mb-10 sm:px-6 lg:px-10">
        <div className="min-w-0 text-left">
          <span aria-hidden="true" className="mc-brand-stripes mb-5 scale-75 origin-left" />
          <h2 id="landing-pricing-title" className="text-3xl font-extrabold tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl">
            {t("Choose Your Plan")}
          </h2>
        </div>
        <div className="flex shrink-0 gap-2" role="group" aria-label={t("Choose Your Plan")}>
          <IconButton
            type="button"
            variant="secondary"
            label={t('Previous')}
            disabled={!carouselState.canGoPrevious}
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <ChevronLeft className="size-5" />
          </IconButton>
          <IconButton
            type="button"
            variant="secondary"
            label={t('Next')}
            disabled={!carouselState.canGoNext}
            onClick={() => swiperRef.current?.slideNext()}
          >
            <ChevronRight className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[90rem]">
        <Swiper
          className="pricing-swiper !overflow-visible px-4 sm:px-6 lg:px-10"
          modules={[A11y, Keyboard]}
          aria-labelledby="landing-pricing-title"
          tabIndex={0}
          slidesPerView={1.08}
          spaceBetween={12}
          speed={prefersReducedMotion ? 0 : 500}
          breakpoints={{
            480: { slidesPerView: 1.35, spaceBetween: 16 },
            720: { slidesPerView: 2.15, spaceBetween: 18 },
            1100: { slidesPerView: 3, spaceBetween: 20 },
          }}
          keyboard={{
            enabled: true,
            onlyInViewport: true,
            pageUpDown: false,
          }}
          a11y={{
            enabled: true,
            containerMessage: t('Choose Your Plan'),
            nextSlideMessage: t('Next'),
            prevSlideMessage: t('Previous'),
            slideLabelMessage: '{{index}} / {{slidesLength}}',
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            syncCarouselState(swiper);
          }}
          onSlideChange={syncCarouselState}
          onBreakpoint={syncCarouselState}
          onResize={syncCarouselState}
          grabCursor
          touchEventsTarget="container"
          simulateTouch
          allowTouchMove
          watchSlidesProgress
        >
          {PRICING_PLANS.map((plan) => (
            <SwiperSlide key={plan.id} className="h-auto py-3">
              {({ isVisible }) => (
                <PricingCard
                  plan={plan}
                  onSelect={handlePlanSelect}
                  isInteractive={isVisible}
                />
              )}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
