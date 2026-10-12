# MYCALC

Everyday calculators for Malaysians, in **Bahasa Malaysia / English / 简体中文**.

Kalkulator harian untuk rakyat Malaysia. Pengiraan telus, tanpa akaun.

为马来西亚打造的日常计算器。计算过程清晰，无需注册。

## Available in this release

- A searchable homepage covering Makan, Salaried Income, Home Ownership, Electric Vehicles, and Savings.
- **Home Loan Simulator:** loan amount, annual interest rate, term, first repayment date, and recurring extra repayments.
- Full monthly amortization, calendar-year summaries, interest saved, and payoff timing.
- A report view with inputs, every monthly repayment, totals, and calculation assumptions.
- **Complete CSV export** and print/save as PDF, independent of screen pagination.
- All interface text, validation, report labels, and CSV labels in BM, EN, and Simplified Chinese.
- Responsive layouts, system/light/dark themes, and keyboard-accessible controls.

Other calculators are explicitly marked **Planned**. They are not working calculators yet.

## Run locally

Requires Node.js 22 or later. The app itself has **no runtime dependencies** and makes no third-party data requests.

```sh
git clone https://github.com/isoenthusiast/MYCALC.git
cd MYCALC
npm ci
npm run dev
```

Open `http://127.0.0.1:4310`. Use an HTTP server rather than opening the HTML through `file://`, because the app uses JavaScript modules.

Direct links:

- `/` — calculator directory
- `/calculators/home-loan/` — loan simulator
- `?lang=ms`, `?lang=en`, or `?lang=zh` — select a language
- `/?category=home` — filter the directory to a category

Only language and appearance preferences are stored on the device. Loan inputs are kept in page memory, are not saved, and are not sent to a server. Exported reports are created locally by the browser. A hosting provider may maintain ordinary access logs; MYCALC adds no analytics or tracking.

## Build and test

```sh
npm test                         # Calculation, translation and report tests
npm run build                    # Static production files in dist/
npx playwright install chromium # One-time browser setup for local tests
npm run test:e2e                  # Browser tests
```

When using an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. CI installs its own matching browser.

The production build copies only the application files. Deploy the contents of `dist/` to any static host that serves directory `index.html` files. Relative assets and navigation also support deployment under a repository subpath. The tracked `.openai/hosting.json` identifies the maintainer's private Sites preview; forks should configure their own hosting rather than reuse that Site ID.

## How the loan simulation works

This is a **constant-rate, monthly reducing-balance simulation**, using the rate entered by the user. The example rate is illustrative; this release does not fetch or recommend bank offers.

For principal `P`, monthly rate `r = annualRate / 1200`, and `n = years × 12`:

```text
scheduled instalment = P × r / (1 − (1 + r)^−n)
at 0% interest       = P / n
```

- Monetary balances and schedule amounts are integer **sen**.
- Monthly interest uses an exact decimal fraction of the input rate before rounding half up to the nearest sen.
- The annuity formula computes the scheduled instalment, rounded to the nearest sen.
- Each period applies interest, then the scheduled payment, then the recurring extra payment.
- Extra payments are capped at the outstanding principal and shorten the term; they do not change the scheduled instalment.
- The final instalment is adjusted to clear the outstanding balance, including accumulated rounding differences.
- Dates label equal monthly periods. A repayment on the 31st uses the last day of a shorter month, then returns to the 31st where possible.
- Annual summaries use calendar years, including partial first and last years.
- “Principal repaid” excludes “Extra principal”. Their totals together equal the original loan amount.

Actual bank schedules can differ because of daily interest, repricing, fees, insurance/takaful, flexi-account arrangements, disbursement timing, or early-settlement rules. These are outside this release's calculation model. The assumptions are included in every full report and CSV export.

CSV files contain input metadata, results, assumptions, every monthly row, and the annual summary. Schedule amounts use decimal points without grouping separators. A UTF-8 BOM preserves Chinese text in spreadsheet applications, and text cells are escaped against formula injection. Print reports use a landscape layout with repeating column headings.

## Repository layout

```text
index.html                       Homepage
calculators/home-loan/index.html Loan simulator entry point
assets/                          Shared styles and local icon
src/i18n.js                      BM / EN / 中文 translations and formatting
src/shell.js                     Shared navigation and preferences
src/home.js                      Directory, categories and search
src/loan-ui.js                   Simulator interactions
src/calculations/home-loan.js    Pure calculation engine
src/reports/loan-report.js       Tables, print report and CSV generation
scripts/                        Development server and static build
tests/                          Unit, report and browser tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for adding a calculator and [ROADMAP.md](ROADMAP.md) for planned categories.

## License

[MIT](LICENSE).
