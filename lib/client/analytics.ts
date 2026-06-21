type GtagEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
};

declare global {
  interface Window {
    gtag?: (command: "event", action: string, params: Record<string, string | number | undefined>) => void;
  }
}

export function trackEvent({ action, category, label, value }: GtagEvent) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value
  });
}
