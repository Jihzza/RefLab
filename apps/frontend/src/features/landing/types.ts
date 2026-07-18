/**
 * Landing Page Types
 *
 * TypeScript interfaces for the landing page components.
 */

/**
 * PricingPlan - Data structure for a pricing tier
 *
 * Used by PricingCard and PricingSection components
 * to display subscription options.
 */
export interface PricingPlan {
  /** Unique identifier for the plan */
  id: string;

  /** Display name (e.g., "Free", "Pro", "Enterprise") */
  name: string;

  /** Monthly price in euros (0 for free tier) */
  pricePerMonth: number;

  /** List of features/benefits included in this plan */
  benefits: string[];

  /** Whether this plan is highlighted/recommended */
  isHighlighted?: boolean;

  /** Whether the plan is announced but not available for purchase yet */
  isComingSoon?: boolean;

  /** Button text (e.g., "Get Started", "Subscribe", "Contact Us") */
  buttonText: string;
}
