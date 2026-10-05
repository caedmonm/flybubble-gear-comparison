"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronRight,
  Feather,
  GitCompareArrows,
  Mountain,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wind,
} from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { catalogueItems } from "@/shared/catalogue-view.mjs";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { NativeSelect } from "@/components/ui/native-select";

import Comparison from "@/components/comparison";
import CatalogueFilters from "@/components/catalogue-filters";
import { catalogueFacets } from "@/shared/facets.mjs";
import { emptyReserveFilters } from "@/components/catalogue-filters/reserve-state";
import {
  hasCatalogueUrlState,
  readUrlFilters,
  readUrlSelection,
  readCatalogueSelection,
  writeCatalogueUrl,
} from "@/shared/catalogue-url.mjs";
import ShareLinkButton from "@/components/share-link-button";

import { ProductImage, money, spec } from "@/components/gear-ui";

import { filterCatalogue, minimum as lowest } from "@/shared/filter.mjs";

import type { Product } from "@/shared/types";

export default function Catalogue({
  initialProducts,
  category,
  initialSearch,
}: {
  initialProducts: Product[];
  category: "Wings" | "Reserves";
  initialSearch?: string;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);

  const [query, setQuery] = useState("");

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [filterSizes, setFilterSizes] = useState<string[]>([]);
  const [colours, setColours] = useState<string[]>([]);
  const [areaRange, setAreaRange] = useState<number[] | null>(null);
  const [aspectRatioRange, setAspectRatioRange] = useState<number[] | null>(
    null,
  );
  const [cellsRange, setCellsRange] = useState<number[] | null>(null);
  const [dgac, setDgac] = useState("");
  const [certScheme, setCertScheme] = useState("EN");
  const [weightRange, setWeightRange] = useState<number[] | null>(null);
  const [constructions, setConstructions] = useState<string[]>([]);
  const [reserveFilters, setReserveFilters] = useState(emptyReserveFilters);

  const [cert, setCert] = useState<string[]>([]);

  const [sort, setSort] = useState("name");
  const [showEachSize, setShowEachSize] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);

  const [limit, setLimit] = useState(24);

  const [maxPrice, setMaxPrice] = useState(""),
    [allUpWeight, setAllUpWeight] = useState("");

  const [forSaleOnly, setForSaleOnly] = useState(false);

  const [modelStatus, setModelStatus] = useState("All"),
    [compareOpen, setCompareOpen] = useState(false),
    [details, setDetails] = useState<Product | null>(null);

  const [sizes, setSizes] = useState<Record<string, string>>({}),
    [ready, setReady] = useState(false);

  const [source, setSource] = useState("snapshot"),
    [notice, setNotice] = useState("");

  const selection = selected
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/catalogue", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{
          products: Product[];
          source: string;
          warning?: string;
        }>;
      })
      .then((data) => {
        if (Array.isArray(data.products)) {
          setProducts(data.products);
          setSource(data.source);
          if (data.warning) setNotice(data.warning);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setNotice("The API could not be reached. Showing the SQL snapshot.");
      });

    function restoreUrl(initial = false) {
      const params = new URLSearchParams(
        initialSearch ?? window.location.search,
      );
      const filters = readUrlFilters(params);
      setQuery(filters.query);
      setSelectedBrands(filters.selectedBrands);
      setFilterSizes(filters.filterSizes);
      setColours(filters.colours);
      setAreaRange(filters.areaRange);
      setAspectRatioRange(filters.aspectRatioRange);
      setCellsRange(filters.cellsRange);
      setCertScheme(filters.certScheme);
      setCert(filters.cert);
      setDgac(filters.dgac);
      const legacyWeight =
        category === "Wings"
          ? filters.wingMaxWeight
          : filters.reserveFilters.maxWeightGrams;
      setWeightRange(
        filters.weightRange ||
          (legacyWeight !== "" &&
          Number.isFinite(Number(legacyWeight)) &&
          Number(legacyWeight) >= 0
            ? [0, Number(legacyWeight) / (category === "Wings" ? 1 : 1000)]
            : null),
      );
      setConstructions(filters.constructions);
      setMaxPrice(filters.maxPrice);
      setAllUpWeight(filters.allUpWeight);
      setModelStatus(filters.modelStatus);
      setForSaleOnly(filters.forSaleOnly);
      setSort(filters.sort);
      setShowEachSize(filters.showEachSize);
      setReserveFilters({ ...filters.reserveFilters, maxWeightGrams: "" });
      setDetails(null);

      let raw = params.get("selection");
      if (initial && !hasCatalogueUrlState(params)) {
        try {
          raw = localStorage.getItem("flybubble-shortlist-v1");
        } catch {
          /* Storage can be disabled. */
        }
      }
      const entries = params.has("item")
        ? readCatalogueSelection(params, initialProducts)
        : readUrlSelection(raw, initialProducts);
      setSelected(entries.map((entry) => entry.id));
      setSizes(
        Object.fromEntries(entries.map((entry) => [entry.id, entry.size])),
      );
      // Links predating the view parameter opened the comparison directly.
      const open =
        (params.has("selection") || params.has("item")) &&
        params.get("view") !== "search" &&
        entries.length > 0;
      setCompareOpen(open);
      const first = initialProducts.find(
        (product) => product.id === entries[0]?.id,
      );
      if (open && first && first.category !== category) {
        const path = first.category === "Reserves" ? "/reserves" : "/wings";
        router.replace(`${path}?${params}`);
        return;
      }
      setReady(true);
    }

    restoreUrl(true);
    const onPopState = () => restoreUrl();
    window.addEventListener("popstate", onPopState);
    return () => {
      controller.abort();
      window.removeEventListener("popstate", onPopState);
    };
  }, [initialProducts, category, router, initialSearch]);

  function shareTarget(
    entries: { id: string; size?: string }[],
    open: boolean,
  ) {
    const params = writeCatalogueUrl(
      new URLSearchParams(),
      {
        query,
        selectedBrands,
        filterSizes,
        colours,
        areaRange,
        aspectRatioRange,
        cellsRange,
        certScheme,
        cert,
        dgac,
        weightRange,
        constructions,
        wingMaxWeight: "",
        maxPrice,
        allUpWeight,
        modelStatus,
        forSaleOnly,
        sort,
        showEachSize,
        reserveFilters,
      },
      entries.map((entry) => ({
        ...entry,
        id:
          products.find((product) => product.id === entry.id)?.shareId ||
          entry.id,
      })),
      open,
    );
    // An explicit search view keeps empty shared searches independent of device storage.
    params.set("view", open ? "compare" : "search");
    const shareCategory = open
      ? products.find((product) => product.id === entries[0]?.id)?.category ||
        category
      : category;
    return new URL(
      `${shareCategory === "Wings" ? "/wings" : "/reserves"}?${params}`,
      window.location.origin,
    );
  }

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(
          "flybubble-shortlist-v1",
          JSON.stringify(selected.map((id) => ({ id, size: sizes[id] }))),
        );
      } catch {
        /* Device storage may be disabled. */
      }
    }
  }, [selected, sizes, ready]);

  useEffect(
    () => setLimit(24),
    [
      query,
      showEachSize,
      selectedBrands,
      filterSizes,
      colours,
      areaRange,
      aspectRatioRange,
      cellsRange,
      certScheme,
      weightRange,
      constructions,
      cert,
      dgac,
      category,
      maxPrice,
      reserveFilters,
      allUpWeight,
      modelStatus,
      forSaleOnly,
    ],
  );

  const activeFilters = useMemo(
    () => ({
      category,
      brands: selectedBrands,
      sizes: filterSizes,
      colours,
      certScheme,
      areaRange,
      aspectRatioRange,
      cellsRange,
      cert,
      dgac,
      query,
      sort,
      modelStatus,
      forSaleOnly,
      maxPrice: category === "Wings" ? maxPrice : "",
      weightRange,
      constructions,
      allUpWeight: category === "Wings" ? allUpWeight : "",
      reserve: reserveFilters,
    }),
    [
      category,
      selectedBrands,
      filterSizes,
      colours,
      certScheme,
      areaRange,
      aspectRatioRange,
      cellsRange,
      cert,
      dgac,
      query,
      sort,
      modelStatus,
      forSaleOnly,
      maxPrice,
      weightRange,
      constructions,
      allUpWeight,
      reserveFilters,
    ],
  );
  const facets = useMemo(
    () => catalogueFacets(products, activeFilters),
    [products, activeFilters],
  );
  const brands = facets.brands;
  const wingOptions = facets;
  const filtered: Product[] = useMemo(
    () => filterCatalogue(products, activeFilters),
    [products, activeFilters],
  );

  const items = useMemo(
    () => catalogueItems(filtered, showEachSize, sort),
    [filtered, showEachSize, sort],
  );

  const reset = () => {
    setSelectedBrands([]);
    setFilterSizes([]);
    setColours([]);
    setAreaRange(null);
    setAspectRatioRange(null);
    setCellsRange(null);
    setCertScheme("EN");
    setDgac("");
    setWeightRange(null);
    setConstructions([]);
    setCert([]);
    setQuery("");
    setMaxPrice("");
    setReserveFilters(emptyReserveFilters());
    setAllUpWeight("");
    setModelStatus("All");
    setForSaleOnly(false);
  };

  const openDetails = (product: Product, size: string) => {
    setDetails(product);

    setSizes((current) => ({ ...current, [product.id]: size }));
  };

  const toggle = (id: string, size?: string) => {
    const product = products.find((p) => p.id === id);

    if (
      !selected.includes(id) &&
      product &&
      selection.length &&
      product.category !== selection[0].category
    ) {
      setNotice(
        "Compare one equipment category at a time. Clear your shortlist to start a new comparison.",
      );
      return;
    }

    // Clicking another size of a shortlisted model selects that size.
    if (size && selected.includes(id) && sizes[id] !== size) {
      setSizes((current) => ({ ...current, [id]: size }));
      return;
    }

    if (!selected.includes(id)) {
      if (selected.length >= 4) return;
      const matching = filtered.find((p) => p.id === id);

      if (matching)
        setSizes((s) => ({ ...s, [id]: size ?? matching.variants[0].size }));
    }

    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length < 4
          ? [...s, id]
          : s,
    );
  };

  return (
    <>
      <div className="banner">
        <div className="banner-brand">
          <a href="https://flybubble.com/" className="banner-logo-link">
            <Image
              className="banner-logo"
              src="/flybubble-logo-white.avif"
              alt="Flybubble"
              width={660}
              height={139}
              unoptimized
            />
          </a>
          <span className="banner-title">Gear Comparison</span>
        </div>
        <div className="category-tabs" aria-label="Equipment categories">
          <Link
            href="/wings"
            aria-current={category === "Wings" ? "page" : undefined}
            className={category === "Wings" ? "active" : ""}
          >
            {/* <Wind size={20} /> */}
            Wings
            {/* <span>{products.filter((p) => p.category === "Wings").length}</span> */}
          </Link>
          <Link
            href="/reserves"
            aria-current={category === "Reserves" ? "page" : undefined}
            className={category === "Reserves" ? "active" : ""}
          >
            {/* <ShieldCheck size={19} />  */}
            Reserves
            {/* <span>
            {products.filter((p) => p.category === "Reserves").length}
          </span> */}
          </Link>
        </div>
        <div className="search-box banner-search">
          <Search size={19} />
          <Input
            aria-label="Search products"
            placeholder="Search by brand or model…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(24);
            }}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              ×
            </button>
          )}
        </div>
      </div>

      <main id="catalogue" className="workspace">
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss notice">
              ×
            </button>
          </div>
        )}

        <div className="catalogue-layout">
          <aside className="filters">
            <div className="filter-heading">
              <h2>
                <SlidersHorizontal size={17} /> Refine your search
              </h2>
              <button onClick={reset}>Reset</button>
            </div>
            <CatalogueFilters
              category={category}
              facets={facets}
              brands={brands}
              selectedBrands={selectedBrands}
              filterSizes={filterSizes}
              colours={colours}
              certScheme={certScheme}
              cert={cert}
              dgac={dgac}
              setDgac={setDgac}
              allUpWeight={allUpWeight}
              weightRange={weightRange}
              constructions={constructions}
              maxPrice={maxPrice}
              modelStatus={modelStatus}
              forSaleOnly={forSaleOnly}
              areaRange={areaRange}
              aspectRatioRange={aspectRatioRange}
              cellsRange={cellsRange}
              wingOptions={wingOptions}
              setSelectedBrands={setSelectedBrands}
              setFilterSizes={setFilterSizes}
              setColours={setColours}
              setCertScheme={setCertScheme}
              setCert={setCert}
              setAllUpWeight={setAllUpWeight}
              setWeightRange={setWeightRange}
              setConstructions={setConstructions}
              setMaxPrice={setMaxPrice}
              setModelStatus={setModelStatus}
              setForSaleOnly={setForSaleOnly}
              setAreaRange={setAreaRange}
              setAspectRatioRange={setAspectRatioRange}
              setCellsRange={setCellsRange}
              reserveFilters={reserveFilters}
              setReserveFilters={setReserveFilters}
            />
          </aside>

          <div className="results">
            <div className="results-toolbar">
              <p>
                <strong>{items.length}</strong>{" "}
                {showEachSize
                  ? category === "Wings"
                    ? "wing sizes"
                    : "reserve sizes"
                  : category === "Wings"
                    ? "wings"
                    : "reserves"}{" "}
                to explore{" "}
                <span>
                  ·{" "}
                  {modelStatus === "All"
                    ? "All models"
                    : modelStatus === "Current"
                      ? "Current models"
                      : "Past models"}
                </span>
              </p>
              <ShareLinkButton
                getTarget={() =>
                  shareTarget(
                    selected.map((id) => ({ id, size: sizes[id] })),
                    false,
                  )
                }
              />
              <div className="catalogue-view-controls">
                <label className="size-view-toggle">
                  <Switch
                    size="sm"
                    checked={showEachSize}
                    onCheckedChange={setShowEachSize}
                    aria-label="Show each size"
                  />
                  Show each size
                </label>
                <label className="sort-label">
                  <ArrowDownUp size={15} />
                  <NativeSelect
                    aria-label="Sort products"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="featured">Catalogue order</option>
                    <option value="price">Price: low to high</option>
                    <option value="weight">Lightest first</option>
                    <option value="name">Brand & model A–Z</option>
                  </NativeSelect>
                </label>
              </div>
            </div>

            <div className="product-grid">
              {items.slice(0, limit).map((p) => {
                const v = p.variants[0];
                const product = products.find((item) => item.id === p.id) ?? p;
                const added =
                  selected.includes(p.id) &&
                  (!showEachSize || sizes[p.id] === v.size);
                const cardName = `${p.brand} ${p.model}${showEachSize ? `, size ${v.size}` : ""}`;
                return (
                  <article
                    className={`product-card ${added ? "is-selected" : ""}`}
                    key={showEachSize ? v.id : p.id}
                  >
                    <button
                      className="card-details-hitbox"
                      onClick={() => openDetails(product, v.size)}
                      aria-label={`View details for ${cardName}`}
                    />
                    <div className="product-photo">
                      <ProductImage product={p} />
                      <span className="cert-badge">
                        {p.category === "Wings"
                          ? v.certification
                            ? v.certClass && !/EN/i.test(v.certification)
                              ? `EN ${v.certification}`
                              : v.certification
                            : "Not recorded"
                          : v.type || "Reserve"}
                      </span>
                      <button
                        aria-label={`${added ? "Remove" : "Add"} ${cardName} ${added ? "from" : "to"} comparison`}
                        aria-pressed={added}
                        className={`quick-add ${added ? "checked" : ""}`}
                        onClick={() =>
                          toggle(p.id, showEachSize ? v.size : undefined)
                        }
                        disabled={
                          !selected.includes(p.id) && selected.length >= 4
                        }
                      >
                        {added ? (
                          <Check size={17} />
                        ) : (
                          <GitCompareArrows size={17} />
                        )}
                      </button>
                    </div>
                    <div className="product-info">
                      <div className="brand-name">{p.brand}</div>
                      <h2>
                        <button
                          onClick={() => openDetails(product, v.size)}
                          aria-label={`View details for ${cardName}`}
                        >
                          {p.model}
                          {showEachSize && ` · ${v.size}`}
                        </button>
                      </h2>
                      <p className="product-type">
                        {v.type ||
                          (p.category === "Wings"
                            ? "Paragliding wing"
                            : "Reserve parachute")}{" "}
                        {!showEachSize && (
                          <span>· {p.variants.length} matching sizes</span>
                        )}
                      </p>
                      <div className="key-specs">
                        <div>
                          <span>
                            <Feather size={12} />{" "}
                            {showEachSize ? "Weight" : "Weight from"}
                          </span>
                          <strong>{spec(lowest(p, "weight"), " kg")}</strong>
                        </div>
                        <div>
                          <span>
                            {p.category === "Wings"
                              ? "Aspect ratio"
                              : "Max load"}
                          </span>
                          <strong>
                            {p.category === "Wings"
                              ? spec(v.aspectRatio)
                              : spec(v.maxLoad, " kg")}
                          </strong>
                        </div>
                        <div>
                          <span>
                            {p.category === "Wings" ? "Cells" : "Sink rate"}
                          </span>
                          <strong>
                            {p.category === "Wings"
                              ? spec(v.cells)
                              : spec(v.sinkRate, " m/s")}
                          </strong>
                        </div>
                      </div>
                      <div className="card-bottom">
                        <div>
                          <small>
                            Recorded {p.category === "Wings" ? "RRP" : "retail"}{" "}
                            {!showEachSize && "from"}
                          </small>
                          <strong>{money(lowest(p, "price"))}</strong>
                        </div>
                        <Button
                          variant={added ? "default" : "outline"}
                          className="compare-button"
                          onClick={() =>
                            toggle(p.id, showEachSize ? v.size : undefined)
                          }
                          disabled={
                            !selected.includes(p.id) && selected.length >= 4
                          }
                        >
                          {added ? <Check /> : <GitCompareArrows />}
                          {added ? "Added" : "Compare"}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {items.length === 0 && (
              <div className="empty-state">
                <Search size={30} />
                <h2>No matching gear</h2>
                <p>Try another model name or clear your filters.</p>
                <Button onClick={reset}>Clear filters</Button>
              </div>
            )}

            {items.length > limit && (
              <Button
                variant="outline"
                className="load-more"
                onClick={() => setLimit(limit + 24)}
              >
                Explore more {category.toLowerCase()} <ArrowRight />
              </Button>
            )}

            <p className="catalogue-disclaimer">
              Specifications vary by size. Recorded prices and product data is
              provided in good faith as a useful tool, errors may exist and 100%
              accuracy isn't guaranteed. We should advise pilots to consult a
              gear expert for professional advice before buying.
            </p>
            <p className="catalogue-terms">
              <a
                href="https://flybubble.com/policies/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>
            </p>
          </div>
        </div>
      </main>

      {selected.length > 0 && (
        <div className="comparison-tray">
          <div>
            <GitCompareArrows />
            <strong>Your shortlist</strong>
            <span>{selected.length} / 4 selected</span>
            <div className="tray-chips">
              {selection.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  title={`Remove ${p.brand} ${p.model}`}
                >
                  {p.model} ×
                </button>
              ))}
            </div>
          </div>
          <Button variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
          <Button
            className="primary-action"
            disabled={selection.length < 2}
            onClick={() => setCompareOpen(true)}
          >
            Compare {selected.length} products <ArrowRight />
          </Button>
        </div>
      )}

      <Comparison
        products={selection}
        getShareTarget={(entries) => shareTarget(entries, true)}
        open={compareOpen && selection.length > 0}
        onClose={() => setCompareOpen(false)}
        sizes={sizes}
        onSize={(id, size) => setSizes((s) => ({ ...s, [id]: size }))}
        onRemove={toggle}
      />
      <Comparison
        products={details ? [details] : []}
        getShareTarget={(entries) => shareTarget(entries, true)}
        open={!!details}
        onClose={() => setDetails(null)}
        sizes={sizes}
        onSize={(id, size) => setSizes((s) => ({ ...s, [id]: size }))}
      />
    </>
  );
}
