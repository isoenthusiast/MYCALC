# MYCALC

Owner: Edward — ratified by Edward on 25 November 2026 (Homey proposed; Edward
confirmed, so this records Edward's decision rather than an agent's assignment).

Everyday Malaysian calculators in Bahasa Malaysia, English and Simplified Chinese, with
transparent calculations and no account requirement.

- **Canonical location:** `/srv/orrery/workspaces/MYCALC`
- **Project documentation:** [README.md](README.md)
- **Vault map:** [Projects/MYCALC/Workspace.md](/srv/orrery/vaults/obsidian-vault/Projects/MYCALC/Workspace.md)
- **Repository:** `https://github.com/isoenthusiast/MYCALC.git` — branch `main`
- **Public collection entry:** [public/MYCALC](../public/MYCALC) — symlink
- **Status (documentary, 2026-11-07):** the Home Loan Simulator is implemented, with monthly
  amortization, calendar-year totals, recurring extras, complete CSV and print reports. Other
  category calculators are explicitly **Planned**. No runtime dependencies and no third-party
  data requests; hosting availability was not checked.
- **Boundaries:** constant-rate monthly reducing-balance model, integer sen with explicit
  rounding. Extra repayments shorten the term. Inputs stay in page memory; only language and
  theme preferences persist. Bank fees, daily interest, repricing and flexi terms are outside
  this model. Do not treat category cards as working products or the illustrative rate as a
  bank offer.

**Estate classification:** curated 2026-11-07 · **Reviewed:** 2026-11-25 by Homey