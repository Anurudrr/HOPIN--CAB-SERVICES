import { describe, expect, expectTypeOf, it } from "vitest";

import { supportedCities, type SupportedCity } from "./cities";

describe("cities", () => {
  it("contains exactly the supported launch cities", () => {
    expect(supportedCities).toEqual([
      "Mumbai",
      "Delhi",
      "Bangalore",
      "Hyderabad",
      "Pune",
    ]);
  });

  it("exposes the supported city union type", () => {
    expectTypeOf<SupportedCity>().toEqualTypeOf<
      "Mumbai" | "Delhi" | "Bangalore" | "Hyderabad" | "Pune"
    >();
  });
});
