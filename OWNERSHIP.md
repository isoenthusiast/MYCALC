# MYCALC — workspace ownership

The public-facing copy of this workspace's ownership record. The internal estate record
stays with the workspace on the owner's machine and is not published here.

Owner: Edward — ratified 25 November 2026.

Everyday Malaysian calculators in Bahasa Malaysia, English and Simplified Chinese, with
transparent calculations and no account requirement.

- **Project documentation:** [README.md](README.md)
- **Repository:** `https://github.com/isoenthusiast/MYCALC.git` — branch `main`
- **Status (documentary, 2026-11-07):** the Home Loan Simulator is implemented, with monthly
  amortization, calendar-year totals, recurring extras, complete CSV and print reports. Other
  category calculators are explicitly **Planned**. No runtime dependencies and no third-party
  data requests; hosting availability was not checked.
- **Boundaries:** constant-rate monthly reducing-balance model, integer sen with explicit
  rounding. Extra repayments shorten the term. Inputs stay in page memory; only language and
  theme preferences persist. Bank fees, daily interest, repricing and flexi terms are outside
  this model. Do not treat category cards as working products or the illustrative rate as a
  bank offer.
