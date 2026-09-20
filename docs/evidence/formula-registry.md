# Formula registry

| Formula | Version | Applicability and output |
|---|---|---|
| BMI = kg / m² | 1.0 | optional adult context metric only; no diagnosis or child thresholds |
| Mifflin–St Jeor | 1.0 | adult resting-energy estimate; sex-specific published constants represented as equation inputs; not for children/pregnancy/clinical prescription |
| sugar/fat grams | 1.0 | energy × fraction ÷ 4 or 9; estimate inherits energy/logging uncertainty |
| salt grams | 1.0 | sodium mg ÷ 400, approximate |
| moderate-equivalent minutes | 1.0 | moderate + 2 × vigorous; strength remains separate |
| sleep debt | 1.0 | sum max(0, recorded need − actual); planning estimate, not diagnosis |
| social jetlag | 1.0 | circular absolute midpoint difference |
| WHO-5 | 2024.1 | raw sum and raw × 4; exact 5 responses 0–5 |
| OECD-modified consumption units | 1.0 | 1 + 0.5 × additional 14+ + 0.3 × under 14 |
| financial runway | 1.0 | liquid resources ÷ essential monthly outflow; descriptive, no universal healthy cutoff |
| housing-cost ratio | 1.0 | housing cost ÷ disposable income; no benchmark without jurisdiction |
| z / robust z / EWMA | 1.0 | personal-baseline statistics with zero-denominator handling |
| DCR | 1.0 | demand ÷ capacity per resource; planning indicator, not medical fact |

Source code and golden cases are in `packages/domain/src/calculations.ts` and `calculations.test.ts`.
