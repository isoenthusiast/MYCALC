# Contributing to MYCALC

Small, focused improvements are welcome: calculators, formula fixes, accessibility, translation improvements, and clearer reports.

## Development

1. Fork the repository and create a feature branch.
2. Run `npm ci` and `npm run dev`.
3. Make your change and add verification appropriate to it.
4. Run `npm test`, `npm run build`, and relevant browser tests.
5. Open a pull request explaining the user-visible behavior and validation.

## Adding a calculator

- Give it a separate HTML entry under `calculators/<name>/` and reuse the shared shell and styles.
- Keep formulas in a pure module under `src/calculations/`; keep DOM and storage access out of the engine.
- Add all interface and report text to **all three** language dictionaries. Use `ms`, `en`, and `zh` (Simplified Chinese).
- Use visible units, associated input labels, localized errors, and keyboard-accessible controls.
- When balances evolve over time, provide the complete schedule, totals, assumptions, and a complete export. Pagination must not truncate exports.
- Use integer sen for money and document rounding and timing assumptions.
- Show the source, supported period, and effective date for any official rates or rules. Do not label a historical or illustrative rate as current.
- Do not add tracking, accounts, external scripts, or transmissions of personal calculation inputs as a side effect of a calculator.
- Mark the tool available in the homepage only after it works. Planned tools should remain plain text, without dead links.

## Tests

Verify independent examples and meaningful invariants, including zero rates, rounding, final balances, extra repayments, invalid inputs, and complete exports. For financial schedules, total principal plus extra principal must equal the original amount, and total payments must equal principal plus interest.

Browser tests should cover language switching without input loss, mobile overflow, report completeness, downloads, and keyboard access when affected. Translated labels should describe the same calculation in each language; mathematical outputs must not depend on the chosen language.

## Pull requests

Describe the problem, the new behavior, supported assumptions, and checks run. Include an official source when changing Malaysian statutory rules. Never include credentials or real personal financial records in fixtures, screenshots, or reports.
