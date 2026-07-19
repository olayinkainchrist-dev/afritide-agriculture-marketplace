import { create } from "zustand";
import { persist } from "zustand/middleware";
import apiClient from "@/lib/api/client";

const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

interface CurrencyState {
  currency:      string;
  rates:         Record<string, number>;
  lastFetched:   number | null;
  setCurrency:   (currency: string) => void;
  fetchRates:    () => Promise<void>;
  convert:       (amount: number, fromCurrency: string) => number;
  format:        (amount: number, fromCurrency: string) => string;
}

const SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GBP: "£", EUR: "€",
  GHS: "₵", KES: "KSh", ZAR: "R",
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency:    "NGN",
      rates:       {},
      lastFetched: null,

      setCurrency: (currency: string) => set({ currency }),

      fetchRates: async () => {
        const { lastFetched } = get();
        const ONE_HOUR = 60 * 60 * 1000;

        // Use cache if less than 1 hour old
        if (lastFetched && Date.now() - lastFetched < ONE_HOUR) return;

        try {
          const res = await apiClient.get("/exchange-rates");
          if (res.data?.data?.rates) {
            set({ rates: res.data.data.rates, lastFetched: Date.now() });
          }
        } catch {
          // silent fail — use cached or no conversion
        }
      },

      convert: (amount: number, fromCurrency: string) => {
        const { currency, rates } = get();
        if (fromCurrency === currency) return amount;
        if (!rates || Object.keys(rates).length === 0) return amount;

        // Convert from source currency to NGN first
        let ngnAmount = amount;
        if (fromCurrency !== "NGN") {
          const fromRate = rates[fromCurrency];
          if (!fromRate) return amount;
          ngnAmount = amount / fromRate;
        }

        // Convert NGN to target currency
        if (currency === "NGN") return ngnAmount;
        const toRate = rates[currency];
        if (!toRate) return amount;
        return ngnAmount * toRate;
      },

      format: (amount: number, fromCurrency: string) => {
        const { currency, convert } = get();
        const converted = convert(amount, fromCurrency);
        const symbol    = SYMBOLS[currency] || currency;
        return `${symbol}${converted.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`;
      },
    }),
    {
      name:       "afritide-currency",
      partialize: (state) => ({
        currency:    state.currency,
        rates:       state.rates,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

export { SUPPORTED_CURRENCIES, SYMBOLS };