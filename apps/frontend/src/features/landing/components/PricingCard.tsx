/**
 * PricingCard - Individual pricing plan display card
 *
 * Displays a single pricing tier with name, price, benefits, and CTA button.
 * Supports a highlighted variant for the recommended plan.
 *
 * Layout:
 * ┌─────────────────────────────┐
 * │         Plan Name           │
 * │        €XX / month          │
 * │  ─────────────────────────  │
 * │  ✓ Benefit 1                │
 * │  ✓ Benefit 2                │
 * │  ✓ Benefit 3                │
 * │  ─────────────────────────  │
 * │       [Subscribe]           │
 * └─────────────────────────────┘
 */

import type { PricingPlan } from "../types";
import { useTranslation } from "react-i18next";

interface PricingCardProps {
  /** The pricing plan data to display */
  plan: PricingPlan;
  /** Callback when the CTA button is clicked */
  onSelect: (planId: string) => void;
}

export default function PricingCard({ plan, onSelect }: PricingCardProps) {
  const { t } = useTranslation();
  const { id, name, pricePerMonth, benefits, isHighlighted, buttonText } = plan;

  return (
    <div
      className={`
        flex flex-col min-h-[360px] p-6 rounded-(--radius-card) shadow-(--shadow-soft) bg-(--bg-surface)
        ${
          isHighlighted
            ? "border-2 border-(--brand-yellow) ring-2 ring-(--brand-yellow)/20"
            : "border border-(--border-subtle)"
        }
      `}
    >
      {/* Plan name */}
      <h3
        className={`
          text-xl font-semibold text-center mb-2
          ${isHighlighted ? "text-(--brand-yellow)" : "text-(--text-primary)"}
        `}
      >
        {t(name)}
      </h3>

      {/* Price display */}
      <div className="text-center mb-4">
        <span className="text-3xl font-bold text-(--text-primary)">
          {pricePerMonth === 0 ? t("Free") : `€${pricePerMonth}`}
        </span>
        {pricePerMonth > 0 && (
          <span className="text-(--text-muted) text-sm">{t("/ month")}</span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-(--border-subtle) my-4"></div>

      {/* Benefits list */}
      <ul className="space-y-3 mb-6 flex-grow">
        {benefits.map((benefit, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-(--text-secondary)"
          >
            {/* Checkmark icon */}
            <svg
              className="w-5 h-5 text-(--success) flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>{t(benefit)}</span>
          </li>
        ))}
      </ul>

      {/* CTA button */}
      <button
        onClick={() => onSelect(id)}
        className={`
          w-full py-2 px-4 rounded-(--radius-button) font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-(--brand-yellow) focus:ring-offset-2
          ${
            isHighlighted
              ? "bg-(--brand-yellow) text-(--bg-primary) hover:bg-(--brand-yellow-soft)"
              : "border border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-hover)"
          }
        `}
      >
        {t(buttonText)}
      </button>
    </div>
  );
}
