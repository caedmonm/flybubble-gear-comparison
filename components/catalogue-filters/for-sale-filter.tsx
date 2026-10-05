"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { CatalogueFilterProps } from "./types";

export default function ForSaleFilter({
  facets,
  forSaleOnly,
  setForSaleOnly,
}: Pick<CatalogueFilterProps, "facets" | "forSaleOnly" | "setForSaleOnly">) {
  return (
    <section>
      <label className="current-toggle for-sale-toggle">
        <Checkbox
          disabled={!facets.forSale && !forSaleOnly}
          checked={forSaleOnly}
          onCheckedChange={(value) => setForSaleOnly(!!value)}
        />{" "}
        Sold by Flybubble
      </label>
    </section>
  );
}
