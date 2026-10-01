# Technical Document — Portfolio Dashboard

## Approach

The dashboard is built as a single Next.js app: the App Router's API route
(`/api/portfolio`) acts as the Node.js backend, fetching from Yahoo Finance
and Google Finance, computing every derived field (Investment, Present
Value, Gain/Loss, Portfolio %), and grouping by sector server-side. The
frontend is a thin client that polls this one endpoint every 15 seconds and
renders what it's given — it does no financial computation of its own, so
there's exactly one place in the codebase where "how do we calculate
Gain/Loss" is answered.

## Architecture Decisions

**Why Next.js API routes instead of a separate Express server.**
The brief lists "Backend: Node.js" as a requirement. A Next.js API route
*is* a Node.js server function — it runs server-side, has full access to
`npm` packages like `axios` and `yahoo-finance2`, and is never bundled into
the client JavaScript. Standing up a second Express server would mean two
processes, two ports, and CORS configuration between them, for no
functional benefit here. If this were a much bigger system (e.g. serving
many different frontends, or needing to run independent of Next.js
entirely), pulling the API into its own Express/Fastify service would be
the right call — the interface (`GET /api/portfolio`) would not need to
change for the frontend at all.

**Why the derived numbers are computed server-side, not client-side.**
If the frontend recomputed Gain/Loss from raw CMP + purchase price, we'd
have the calculation logic in two places (or worse, three, if a future
mobile app joined in), with a real risk of them drifting apart during a
future change. Computing once, server-side, and shipping the finished
numbers to the client removes that risk entirely.

**Why a hand-written `<table>` instead of `react-table`.**
`react-table` (TanStack Table) is genuinely the right tool when a table
needs sorting, column resizing, pinning, or pagination — interactions the
brief doesn't require. The actual hard part of this assignment is the data
pipeline behind the table (two unreliable data sources, sector grouping,
graceful degradation), not table interactivity. Keeping the table itself
"boring" keeps that pipeline the most-visible, most-explainable part of the
code — important given this assignment is evaluated by an interview where
the candidate has to explain what they built.

## Technical Challenges and How They Were Solved

### 1. Yahoo Finance and Google Finance both lack official public APIs

- **Yahoo Finance:** solved with `yahoo-finance2`, a mature, widely-used
  open-source library that wraps Yahoo's internal endpoints. It is
  unofficial and can break if Yahoo changes those endpoints — this is
  called out directly in code comments in `lib/yahooFinance.ts`.
- **Google Finance:** has no equivalent library, official or unofficial,
  because it doesn't expose the same kind of internal JSON endpoints Yahoo
  does. The only option is scraping the rendered HTML. `lib/googleFinance.ts`
  does this with `axios` (fetch the page) + `cheerio` (parse it), searching
  for label text ("P/E ratio") rather than a hardcoded CSS class, since
  Google's class names are auto-generated and change frequently — matching
  by label text is more resilient, though not immune to Google changing
  the wording or overall page structure.

### 2. Rate limiting on unofficial sources

With ~26 holdings and a 15-second refresh cycle, naive fetching would mean
52 outbound calls (26 Yahoo + 26 Google) every 15 seconds, per open browser
tab. This is exactly the kind of load that gets scrapers rate-limited or
IP-blocked. `lib/cache.ts` implements an in-memory TTL cache: a value
fetched less than 15 seconds ago is served from memory, not re-fetched. On
top of that, every successful fetch also writes a longer-lived "stale
fallback" value, so a failed fetch can still show the last known number
instead of a blank cell.

### 3. Graceful degradation when a fetch fails

This was not a hypothetical concern — during development in a sandboxed
environment with no outbound network access to Yahoo/Google's actual
servers, every single fetch failed with a 403. This turned out to be a
useful real-world test: the API correctly returned `cmp: null`,
`peRatio: null`, and a descriptive `error` string, while still correctly
computing `investment` and `portfolioPercent` from the static holding data
(which never depends on a live fetch). The frontend shows "—" for missing
live fields and a small amber indicator when a row is showing a stale
cached value rather than a fresh one. Nothing crashes; the dashboard
degrades to "known data only" rather than an error page.

### 4. Parallelizing ~26 × 2 fetches without them taking 10+ seconds

Fetching sequentially (one stock's Yahoo call, then its Google call, then
the next stock...) would make each 15-second refresh cycle take far longer
than 15 seconds once you account for network latency on ~52 calls. The API
route uses `Promise.all` across all holdings and, within each holding,
across both sources — bounding total request time to roughly the slowest
single call rather than the sum of all of them.

### 5. Data accuracy and disclaimers

Scraped/unofficial data can be wrong, delayed, or momentarily unavailable
mid-deploy on the source's end. The dashboard surfaces this directly rather
than hiding it: a `stale` flag and visible indicator per row, and a
portfolio-wide "partial failure" banner if any symbol failed this cycle.

## Trade-offs and What Would Change for a Real Production System

- **In-memory cache → Redis (or similar):** the current cache only lives in
  one server process's memory. Fine for a single instance; would not share
  state correctly across multiple horizontally-scaled instances behind a
  load balancer. The `get`/`set` interface in `cache.ts` is written so this
  swap wouldn't require touching any calling code.
- **Scraping → licensed data feed:** for a real product handling real
  investment decisions, paying for a licensed NSE/BSE data feed (or a paid
  financial data API) would be the responsible long-term choice — scraping
  is appropriate for a prototype/assignment, not for production financial
  infrastructure people rely on to make investment decisions.
- **WebSockets instead of polling:** considered, but rejected for this
  scope. Since the *upstream* sources (Yahoo/Google) are themselves
  pull-based, not push-based, a WebSocket would only move where the polling
  happens (server → client instead of client → server), without removing
  the underlying poll against Yahoo/Google. It would add real complexity
  (persistent connections, reconnect handling) without a matching benefit
  at this scale — worth revisiting if a genuinely push-based data feed is
  ever the upstream source.

## Edge Cases Considered

- A stock whose CMP fetch fails but whose P/E fetch succeeds (and vice
  versa) — handled independently per source, not as an all-or-nothing row.
- A sector where every stock's Present Value is currently null (e.g. every
  fetch failed) — sector total Present Value correctly shows "—" rather
  than a misleading ₹0.
- BSE numeric codes vs NSE alphabetic symbols — detected automatically
  from the code's shape once at data-load time (`portfolioData.ts`), so
  every downstream consumer just reads `exchange` rather than re-parsing
  the code.
