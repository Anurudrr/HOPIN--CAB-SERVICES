export const supportedCities = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Pune",
] as const;

export type SupportedCity = (typeof supportedCities)[number];
