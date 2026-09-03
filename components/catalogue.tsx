"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Feather,
  GitCompareArrows,
  Mountain,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { NativeSelect } from "@/components/ui/native-select";

import { Checkbox } from "@/components/ui/checkbox";

import Comparison from "@/components/comparison";

import { ProductImage, money, spec } from "@/components/gear-ui";

import { filterCatalogue, minimum as lowest } from "@/shared/filter.mjs";

import type { Product } from "@/shared/types";

export default function Catalogue({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState(initialProducts);

  const [query, setQuery] = useState("");

  const [category, setCategory] = useState("Wings");

  const [brand, setBrand] = useState("All brands");

  const [cert, setCert] = useState("All");

  const [sort, setSort] = useState("featured");

  const [selected, setSelected] = useState<string[]>([]);

  const [limit, setLimit] = useState(12);

  const [maxPrice, setMaxPrice] = useState(""),
    [maxWeight, setMaxWeight] = useState(""),
    [allUpWeight, setAllUpWeight] = useState("");

  const [currentOnly, setCurrentOnly] = useState(true),
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

    try {
      const urlSelection = new URLSearchParams(window.location.search).get(
        "selection",
      );

      const stored = JSON.parse(
        urlSelection || localStorage.getItem("flybubble-shortlist-v1") || "[]",
      );

      if (Array.isArray(stored)) {
        const valid = stored
          .filter(
            (x) =>
              x &&
              typeof x.id === "string" &&
              initialProducts.some((p) => p.id === x.id),
          )
          .slice(0, 4);

        const first = initialProducts.find((p) => p.id === valid[0]?.id);

        const same = valid.filter(
          (x) =>
            initialProducts.find((p) => p.id === x.id)?.category ===
            first?.category,
        );

        setSelected([...new Set(same.map((x) => x.id))]);

        setSizes(
          Object.fromEntries(
            same
              .filter((x) => typeof x.size === "string")
              .map((x) => [x.id, x.size]),
          ),
        );

        if (urlSelection && same.length) {
          setCompareOpen(true);
          setCategory(first!.category);
        }
      }
    } catch {
      /* Invalid or unavailable browser storage does not block the catalogue. */
    }

    setReady(true);

    return () => controller.abort();
  }, [initialProducts]);

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
    () => setLimit(12),
    [
      query,
      brand,
      cert,
      category,
      maxPrice,
      maxWeight,
      allUpWeight,
      currentOnly,
    ],
  );

  const brands = useMemo(
    () =>
      [
        ...new Set(
          products.filter((p) => p.category === category).map((p) => p.brand),
        ),
      ].sort(),
    [products, category],
  );

  const filtered: Product[] = useMemo(
    () =>
      filterCatalogue(products, {
        category,
        brand,
        cert,
        query,
        sort,
        currentOnly,
        maxPrice,
        maxWeight,
        allUpWeight,
      }),
    [
      products,
      category,
      query,
      brand,
      cert,
      sort,
      currentOnly,
      maxPrice,
      maxWeight,
      allUpWeight,
    ],
  );

  const reset = () => {
    setBrand("All brands");
    setCert("All");
    setQuery("");
    setMaxPrice("");
    setMaxWeight("");
    setAllUpWeight("");
    setCurrentOnly(true);
  };

  const openDetails = (product: Product, size: string) => {
    setDetails(product);

    setSizes((current) => ({ ...current, [product.id]: size }));
  };

  const toggle = (id: string) => {
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

    if (!selected.includes(id)) {
      const matching = filtered.find((p) => p.id === id);

      if (matching)
        setSizes((s) => ({ ...s, [id]: matching.variants[0].size }));
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
      <main id="catalogue" className="workspace">
        <div className="intro">
          <div>
            <div className="eyebrow">THE GEAR FINDER</div>
            <h1>
              Find your next flight<span>.</span>
            </h1>
            <p>
              Explore the details. Compare your shortlist. Find the gear that
              fits.
            </p>
          </div>
          <div className="source-tag">
            <span />{" "}
            {source === "mysql"
              ? "Connected database"
              : "SQL catalogue snapshot"}
            <small>Prices and availability may have changed</small>
          </div>
        </div>

        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss notice">
              ×
            </button>
          </div>
        )}
        <div className="category-tabs">
          <button
            onClick={() => {
              setCategory("Wings");
              setBrand("All brands");
              setCert("All");
            }}
            className={category === "Wings" ? "active" : ""}
          >
            <Wind size={20} /> Paragliding wings{" "}
            <span>{products.filter((p) => p.category === "Wings").length}</span>
          </button>
          <button
            onClick={() => {
              setCategory("Reserves");
              setBrand("All brands");
              setCert("All");
            }}
            className={category === "Reserves" ? "active" : ""}
          >
            <ShieldCheck size={19} /> Reserve parachutes{" "}
            <span>
              {products.filter((p) => p.category === "Reserves").length}
            </span>
          </button>
          <div className="tabs-note">
            A clearer view of your next setup <ChevronRight size={15} />
          </div>
        </div>

        <div className="catalogue-layout">
          <aside className="filters">
            <div className="filter-heading">
              <h2>
                <SlidersHorizontal size={17} /> Refine your search
              </h2>
              <button onClick={reset}>Reset</button>
            </div>
            <section>
              <h3>Brand</h3>
              <NativeSelect
                aria-label="Filter by brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              >
                <option>All brands</option>
                {brands.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </NativeSelect>
            </section>
            {category === "Wings" && (
              <section>
                <h3>
                  EN certification <CircleHelp size={14} />
                </h3>
                <div className="cert-options">
                  {["All", "A", "B", "C", "D"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCert(c)}
                      className={c === cert ? "selected" : ""}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className="filter-hint">
                  Compare the certification for each size.
                </p>
              </section>
            )}
            <section className="advanced-filter">
              <h3>All-up weight (kg)</h3>
              <Input
                aria-label="All-up flying weight in kilograms"
                type="number"
                min="1"
                max="400"
                placeholder="e.g. 90"
                value={allUpWeight}
                onChange={(e) => setAllUpWeight(e.target.value)}
              />
              <p className="filter-hint">
                Pilot + wing + harness + all equipment. Matches the recorded
                load range.
              </p>
            </section>
            <section className="advanced-filter">
              <h3>Maximum equipment weight</h3>
              <NativeSelect
                aria-label="Maximum equipment weight"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
              >
                <option value="">Any weight</option>
                {[1, 1.5, 2, 3, 4, 5, 6].map((w) => (
                  <option key={w} value={w}>
                    Up to {w} kg
                  </option>
                ))}
              </NativeSelect>
            </section>
            <section className="advanced-filter">
              <h3>Maximum recorded price</h3>
              <Input
                aria-label="Maximum recorded price in pounds"
                type="number"
                min="1"
                step="100"
                placeholder="Any price (£)"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </section>
            <label className="current-toggle">
              <Checkbox
                checked={currentOnly}
                onCheckedChange={(v) => setCurrentOnly(!!v)}
              />{" "}
              Current models only
            </label>
            <div className="guide-card">
              <Mountain size={26} />
              <h3>
                Small details.
                <br />
                Big differences.
              </h3>
              <p>
                Add up to 4 products to compare their specifications side by
                side.
              </p>
              <span>
                Start with your shortlist <ArrowRight size={15} />
              </span>
            </div>
            <div className="filter-footnote">
              <ShieldCheck size={16} />
              <p>
                Product specifications only.
                <br />
                Personal and internal records excluded.
              </p>
            </div>
          </aside>

          <div className="results">
            <div className="search-row">
              <div className="search-box">
                <Search size={19} />
                <Input
                  aria-label="Search products"
                  placeholder="Search by brand or model…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLimit(12);
                  }}
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="results-toolbar">
              <p>
                <strong>{filtered.length}</strong>{" "}
                {category === "Wings" ? "wings" : "reserves"} to explore{" "}
                <span>
                  · {currentOnly ? "Current models" : "Including past models"}
                </span>
              </p>
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

            <div className="product-grid">
              {filtered.slice(0, limit).map((p) => {
                const v = p.variants[0];
                const product = products.find((item) => item.id === p.id) ?? p;
                const added = selected.includes(p.id);
                return (
                  <article
                    className={`product-card ${added ? "is-selected" : ""}`}
                    key={p.id}
                  >
                    <button
                      className="card-details-hitbox"
                      onClick={() => openDetails(product, v.size)}
                      aria-label={`View details for ${p.brand} ${p.model}`}
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
                        aria-label={`${added ? "Remove" : "Add"} ${p.brand} ${p.model} ${added ? "from" : "to"} comparison`}
                        aria-pressed={added}
                        className={`quick-add ${added ? "checked" : ""}`}
                        onClick={() => toggle(p.id)}
                        disabled={!added && selected.length >= 4}
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
                          aria-label={`View details for ${p.brand} ${p.model}`}
                        >
                          {p.model}
                        </button>
                      </h2>
                      <p className="product-type">
                        {v.type ||
                          (p.category === "Wings"
                            ? "Paragliding wing"
                            : "Reserve parachute")}{" "}
                        <span>· {p.variants.length} matching sizes</span>
                      </p>
                      <div className="key-specs">
                        <div>
                          <span>
                            <Feather size={12} /> Weight from
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
                            from
                          </small>
                          <strong>{money(lowest(p, "price"))}</strong>
                        </div>
                        <Button
                          variant={added ? "default" : "outline"}
                          className="compare-button"
                          onClick={() => toggle(p.id)}
                          disabled={!added && selected.length >= 4}
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

            {filtered.length === 0 && (
              <div className="empty-state">
                <Search size={30} />
                <h2>No matching gear</h2>
                <p>Try another model name or clear your filters.</p>
                <Button onClick={reset}>Clear filters</Button>
              </div>
            )}

            {filtered.length > limit && (
              <Button
                variant="outline"
                className="load-more"
                onClick={() => setLimit(limit + 12)}
              >
                Explore more {category.toLowerCase()} <ArrowRight />
              </Button>
            )}

            <p className="catalogue-disclaimer">
              Specifications vary by size. Recorded prices are a guide, not a
              live offer. Check the manufacturer’s documentation and seek
              qualified advice before choosing flying equipment.
            </p>
          </div>
        </div>
      </main>
      <footer className="footer">
        <span>
          flybubble. <b>COMPARE</b>
        </span>
        <span>A little more knowledge. A better day in the air.</span>
        <span>Built around your catalogue</span>
      </footer>

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
        open={compareOpen && selection.length > 0}
        onClose={() => setCompareOpen(false)}
        sizes={sizes}
        onSize={(id, size) => setSizes((s) => ({ ...s, [id]: size }))}
        onRemove={toggle}
      />
      <Comparison
        products={details ? [details] : []}
        open={!!details}
        onClose={() => setDetails(null)}
        sizes={sizes}
        onSize={(id, size) => setSizes((s) => ({ ...s, [id]: size }))}
      />
    </>
  );
}
