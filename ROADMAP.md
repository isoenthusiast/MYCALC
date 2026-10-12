# Calculator roadmap

## Available

- Trilingual homepage and category directory.
- Home Loan Simulator with extra repayments, full amortization report, monthly and annual views, print/PDF, and CSV.

## Planned categories

| Category | Planned calculators |
| --- | --- |
| Makan bill splitter | Equal and itemised splitting, shared items and charges, settlement between people |
| Salaried income | Take-home salary, EPF and voluntary contributions, income tax/PCB, retirement estimation |
| Home ownership | Loan eligibility estimates, upfront purchase costs, total cost of ownership |
| Electric vehicles | Journey energy/cost, kWh/100 km, cost/km, range, home/public charging, provider-specific tariffs |
| Savings | Targets, lump sums and recurring deposits, simple/compound interest, withdrawals, custom periods |

Contribution frequency and interest-crediting frequency will be separate settings in savings tools. Loan eligibility will expose its affordability assumptions. Electricity tariffs will identify the provider, region, and effective date.

## Shared requirements for future calculators

- BM / EN / 简体中文 in the interface, validation, reports and exports.
- Responsive, keyboard-accessible interfaces with visible units.
- Complete tables whenever a balance changes over time.
- Transparent assumptions and documented rounding.
- Source and effective date for changing rates or statutory rules.
- Calculation inputs remain in the browser by default.

## Bank-rate data

The first release accepts user-entered rates. A later release may introduce a reviewed catalogue of official bank product rates or a licensed product feed. Reference rates and advertised starting rates must be distinguished from a borrower's approved rate. Any integration must validate freshness and redistribution terms before use.
