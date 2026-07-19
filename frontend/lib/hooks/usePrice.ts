import { useCurrencyStore } from "@/lib/store/currency.store";

export function usePrice() {
  const { currency, convert, format, fetchRates } = useCurrencyStore();

  const formatPrice = (amount: number, fromCurrency: string = "NGN") => {
    return format(amount, fromCurrency);
  };

  const convertPrice = (amount: number, fromCurrency: string = "NGN") => {
    return convert(amount, fromCurrency);
  };

  return { currency, formatPrice, convertPrice, fetchRates };
}