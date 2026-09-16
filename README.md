# Flybubble Compare

A Next.js gear finder for comparing paragliding wings and reserves. It can run from the included sanitized catalogue snapshot or read the approved public product fields from MySQL at runtime.

## Run locally

Requires Node.js 22 and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
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

Use a database user with `SELECT` access only to the three tables in `shared/projection.json`. The app validates TLS certificates, disallows multiple SQL statements, runs reads in read-only transactions, and exposes only allowlisted fields. If live MySQL is temporarily unavailable, `/api/catalogue` returns the bundled snapshot with a visible warning instead of taking down the site.

DigitalOcean reference: [Node.js buildpack and runtime support](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/), [environment and database bindable variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/), and [health checks](https://docs.digitalocean.com/products/app-platform/how-to/manage-health-checks/).

## Import a new snapshot

```sh
python scripts/import-snapshot.py /path/to/export.sql
```

The parser reads the export as text and never executes SQL. `shared/projection.json` is the authoritative table and column allowlist used by the importer and live API. Missing required tables or columns, or a mismatch with the export's declared row counts, stop the import before the snapshot is overwritten. Commit the resulting sanitized snapshot to update the offline fallback. `scripts/fetch-images.py` retrieves public product photos only from trusted Flybubble Shopify product URLs.

The bundled snapshot uses `DataBe-PrimaryKeys.sql`: 1,228 wing sizes and 176 reserve sizes across 325 models. Its native primary keys and expanded text columns are compatible with the existing live queries. Product and size IDs remain based on category, brand, model, and size, so existing shortlist entries and comparison links retain their identifiers.

## Features and data caveats

- Search, category, brand, EN class, maximum price, equipment weight, and all-up weight filters.
- Filters must match a single size record; different sizes cannot jointly satisfy incompatible filters.
- Compare up to four products within one category, choose exact sizes, show only differences, export CSV, or copy a comparison link.
- Open any product by itself to inspect its size-specific details and follow its Flybubble product link when available.
- A device-local shortlist is stored in browser storage. Shared URLs include only public product identifiers and sizes.
- “Current” means current in the supplied database; it is not verified live availability. Model years, recorded prices, and product images may be historical.
- Wings use recorded RRP; reserves use the recorded retail field. Flybubble's current price may be lower.
- This tool does not assess pilot suitability. Confirm certification, load ranges, and reserve compatibility with the manufacturer and a qualified professional.

## Validation

```sh
npm test
python -m unittest discover -s tests -p "test_*.py"
npm run typecheck
npm run build
```

Tests cover the updated catalogue, stable IDs across primary-key formats, record preservation, unit conversion, same-size filter semantics, safe field projection, URL validation, redacted-password failure, and the snapshot catalogue service. The Python importer tests use synthetic exports to check legacy and native keys, text columns, missing fields, and incomplete exports.
