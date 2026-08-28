import PricingClient from "./PricingClient"

export const metadata = {
  title: "Pricing — Foodlog",
  description:
    "Scan your plate and see the calories. 5 free scans, then from KSh 20. Pay with M-Pesa. No card, no auto-charge.",
}

export default function PricingPage() {
  return <PricingClient />
}
