# Flybubble Compare

A Next.js gear finder for comparing paragliding wings and reserves. It can run from the included sanitized catalogue snapshot or read the approved public product fields from MySQL at runtime.

## Run locally

Requires Node.js 22 or later and Yarn Classic (1.x).

```sh
yarn install --frozen-lockfile
cp .env.example .env.local
yarn dev
```

Open `http://localhost:3000`. With `DATA_SOURCE=snapshot` no database is required.

## Deploy to DigitalOcean App Platform

The repository includes a production multi-stage `Dockerfile`. It builds a standard Next.js standalone server and listens on App Platform's expected port `8080`. The UI and `/api/catalogue` endpoint run in the same service, so no second API component, internal URL, CORS configuration, or API token is required.

1. Push this directory to a GitHub or GitLab repository and create a DigitalOcean App Platform **Web Service** from it. If this directory sits inside a larger repository, set the source directory to `gear-compare`.
2. Let App Platform detect the root `Dockerfile`. No custom build or run command is needed.
3. Set the HTTP port to `8080` and the HTTP health-check path to `/api/health`.
4. Leave `DATA_SOURCE=snapshot` for the bundled catalogue, or configure the MySQL variables below for live data.
5. Set `SITE_ORIGIN` to the final HTTPS origin. App Platform's `${APP_URL}` bindable value is suitable before adding a custom domain.

The Docker image runs as a non-root user and contains only the standalone server, static assets, public product images, and runtime dependencies.

The build uses Yarn Classic and the committed `yarn.lock`. Keep `yarn.lock` in version control and included in the Docker build context; no `package-lock.json` is required.

### Connect the DigitalOcean MySQL database

Attach the existing managed database to the app, add the app as a trusted source, and set these encrypted runtime variables. Replace `flybubble-db` with the database component name shown in App Platform:

| Key | Value |
| --- | --- |
| `DATA_SOURCE` | `mysql` |
| `DB_HOST` | `${flybubble-db.HOSTNAME}` |
| `DB_PORT` | `${flybubble-db.PORT}` |
| `DB_NAME` | `${flybubble-db.DATABASE}` |
| `DB_USER` | `${flybubble-db.USERNAME}` |
| `DB_PASSWORD` | `${flybubble-db.PASSWORD}` |
| `DB_CA_CERT` | `${flybubble-db.CA_CERT}` |
| `SITE_ORIGIN` | `${APP_URL}` |

Use a database user with `SELECT` access only to the four tables in `shared/projection.json`, including `DSColours` for wing colourways. The app validates TLS certificates, disallows multiple SQL statements, runs reads in read-only transactions, and exposes only allowlisted fields. If live MySQL is temporarily unavailable, `/api/catalogue` returns the bundled snapshot with a visible warning instead of taking down the site.

DigitalOcean reference: [Node.js buildpack and runtime support](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/), [environment and database bindable variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/), and [health checks](https://docs.digitalocean.com/products/app-platform/how-to/manage-health-checks/).

## Import a new snapshot

```sh
python scripts/import-snapshot.py /path/to/export.sql
```

The parser reads the export as text and never executes SQL. `shared/projection.json` is the authoritative table and column allowlist used by the importer and live API. Missing required tables or columns, or a mismatch with the export's declared row counts, stop the import before the snapshot is overwritten. Commit the resulting sanitized snapshot to update the offline fallback. `scripts/fetch-images.py` retrieves public product photos only from trusted Flybubble Shopify product URLs.

The bundled snapshot uses `DataBe-PrimaryKeys.sql`: 1,228 wing sizes and 176 reserve sizes across 325 models. Its native primary keys and expanded text columns are compatible with the existing live queries. Product and size IDs remain based on category, brand, model, and size, so existing shortlist entries and comparison links retain their identifiers.

## Features and data caveats

- Search, category, multiple brands (wings and reserves), maximum price, equipment weight, and all-up weight filters.
- Wings and reserves have a “Sold by Flybubble” filter based on their recorded `Sell` flag. It is separate from the All / Current / Past model-status filter available for both categories. Model status defaults to All and the sale filter starts unchecked; Reset restores those defaults.
- Reserve filters include multiple types, steerability, a single pilot AUW (as for wings), maximum equipment weight in grams, packed volume min/max in litres, minimum flat area, reserve load min/max, and one maximum-price budget. AUW must fit inside a single size’s load range; 90% / 95% / 100% caps AUW at that percentage of the reserve’s maximum load (default 100%, inactive without AUW). Load min requires `minLoad >= input`; load max requires `maxLoad <= input` to exclude oversized reserves.
- Wings and reserves have separate routes at `/wings` and `/reserves`. The home route redirects to wings, and older comparison links retain their selected products and open the appropriate category. New comparison links use the category route.
- A reserve’s full recorded volume range must fit inside the entered volume limits. Single recorded volumes use the same value for both endpoints. Published volumes are approximate; actual packed volume and harness compatibility must be checked. The Charly DIAMONDcross ST light 125 source volume of 4,700 cm³ is normalized to 4.7 L, as confirmed by the [manufacturer’s technical table](https://finsterwalder-charly.de/en/4-produkte/rettungsgeraete/673-charly-diamondcross-the-steerable-cruciform-canopy-video.html). Private purchase-cost fields are not included; “Cost Max” is treated as the customer’s price budget.
- Wings also support multiple sizes and recorded colourways, EN/LTF classes, DGAC, and Other certification (CCC, Load Test Only, Uncertified), plus min–max sliders for flat surface, flat aspect ratio, and cell count.
- Colourways come from `DSColours` at model level; they do not represent current stock or availability in a particular size. Missing certification is not treated as uncertified. Active specification ranges exclude missing values.
- The surface filter excludes known source outliers above 100 m² for Skywalk ARAK AIR and MESCAL6. Their original values remain in product details; correcting these source values automatically restores surface filtering for those sizes.
- Filters must match a single size record; different sizes cannot jointly satisfy incompatible filters.
- Compare up to four products within one category, choose exact sizes, show only differences, export CSV, or copy a comparison link.
- Open any product by itself to inspect its size-specific details and follow its Flybubble product link when available.
- A device-local shortlist is stored in browser storage. Shared URLs include only public product identifiers and sizes.
- “Current” means current in the supplied database; it is not verified live availability. Model years, recorded prices, and product images may be historical.
- Wings use recorded RRP; reserves prefer the recorded `FBPrice`, falling back to `Ourprice` when missing. These recorded prices are used consistently in filters, cards, comparison and price sorting. Live shop prices may differ.
- This tool does not assess pilot suitability. Confirm certification, load ranges, and reserve compatibility with the manufacturer and a qualified professional.

## Validation

```sh
yarn test
python -m unittest discover -s tests -p "test_*.py"
yarn typecheck
yarn build
```

Tests cover the updated catalogue, stable IDs across primary-key formats, record preservation, unit conversion, same-size filter semantics, safe field projection, URL validation, redacted-password failure, and the snapshot catalogue service. The Python importer tests use synthetic exports to check legacy and native keys, text columns, missing fields, and incomplete exports.
