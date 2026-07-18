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
import { Check } from "lucide-react";
import { Button } from "@/components/ui";

interface PricingCardProps {
  /** The pricing plan data to display */
  plan: PricingPlan;
  /** Callback when the CTA button is clicked */
  onSelect: (planId: string) => void;
  /** Removes hidden carousel cards from the accessibility and keyboard trees. */
  isInteractive?: boolean;
}

export default function PricingCard({ plan, onSelect, isInteractive = true }: PricingCardProps) {
  const { t, i18n } = useTranslation();
  const {
    id,
    name,
    pricePerMonth,
    benefits,
    isHighlighted,
    isComingSoon,
    buttonText,
  } = plan;
  const formattedPrice = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(pricePerMonth);

  return (
    <article aria-hidden={!isInteractive || undefined} className={`relative flex h-full min-h-[30rem] flex-col overflow-hidden rounded-(--mc-radius-card) bg-(--mc-color-surface) p-6 shadow-(--mc-shadow-soft) sm:p-7 ${
      isHighlighted
        ? "border border-(--mc-color-accent) ring-1 ring-(--mc-color-accent)/25"
        : "border border-(--mc-color-border)"
    }`}>
      {isHighlighted && (
        <>
          <span aria-hidden="true" className="absolute right-0 top-0 h-1.5 w-24 -skew-x-[28deg] bg-(--mc-color-accent)" />
          <span aria-hidden="true" className="absolute right-1 top-0 h-1.5 w-6 -skew-x-[28deg] bg-(--mc-color-danger)" />
        </>
      )}

      <h3
        className={`text-xl font-extrabold tracking-[-0.02em] ${
          isHighlighted ? "text-(--mc-color-accent)" : "text-(--mc-color-text)"
        }`}
      >
        {t(name)}
      </h3>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="mc-tabular text-4xl font-extrabold tracking-[-0.045em] text-(--mc-color-text)">
          {isComingSoon
            ? t('Coming soon')
            : pricePerMonth === 0
              ? t("Free")
              : formattedPrice}
        </span>
        {!isComingSoon && pricePerMonth > 0 && (
          <span className="text-sm text-(--mc-color-text-muted)">{t("/ month")}</span>
        )}
      </div>

      <div className="my-5 h-px bg-[linear-gradient(90deg,var(--mc-color-border-strong),transparent)]" />

      {isComingSoon ? (
        <p className="mb-7 flex-grow text-sm leading-6 text-(--mc-color-text-secondary)">
          {t('We are preparing this plan carefully. Features, pricing and terms will be published before launch.')}
        </p>
      ) : (
        <ul className="mb-7 flex-grow space-y-3.5">
          {benefits.map((benefit, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm leading-5 text-(--mc-color-text-secondary)"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-(--mc-color-success)/40 bg-(--mc-color-success)/10 text-(--mc-color-success)">
                <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span>{t(benefit)}</span>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant={isHighlighted ? "primary" : "secondary"}
        size="lg"
        fullWidth
        tabIndex={isInteractive ? undefined : -1}
        disabled={isComingSoon}
        onClick={() => onSelect(id)}
      >
        {t(buttonText)}
      </Button>
    </article>
  );
}
