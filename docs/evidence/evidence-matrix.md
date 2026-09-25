# Initial evidence matrix

| Registry ID/version | Classification | Population | Encoded rule | Authority/source | Main limitation |
|---|---|---|---|---|---|
| `who-pa-adults-2020` / 2020.1 | Evidence-based guideline | adults 18–64 | 150–300 moderate or 75–150 vigorous equivalent minutes; strength separately ≥2 days | [WHO 2020 guidelines](https://www.who.int/publications/i/item/9789240015128) | adaptation required for individual ability and restrictions |
| `who5-2024` / 2024.1 | Validated measurement | validated locale/context required | five 0–5 items; raw sum; normalized = raw × 4 | [WHO-5 2024](https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01) | screening/monitoring, not diagnosis |
| `aasm-srs-adult-sleep-2015` / 2015.1 | Evidence-based consensus | healthy adults 18–60 | regularly ≥7 h; no encoded upper-limit penalty | [AASM/SRS consensus](https://doi.org/10.5664/jcsm.4758) | need varies; not a sleep-disorder assessment |
| `who-healthy-diet-2026` / 2026.09 | WHO guidance summary | general population with applicability checks | free sugars <10% energy; adult fat ≤30%; sodium <2 g; adults fruit/veg ≥400 g | [WHO healthy diet fact sheet, 26 January 2026](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) | access, culture, age, pregnancy, and clinical needs matter |
| `no-universal-life-purpose` / 1.0 | No universal standard | all | user defined | governance policy | impact can be discussed; worldview cannot be ranked |

The OECD-modified scale is implemented as a descriptive financial calculation: first household member 1, additional age 14+ member 0.5, child under 14 member 0.3. It is not labelled a universal adequacy threshold. Source: [OECD household distribution handbook](https://www.oecd.org/en/publications/oecd-handbook-on-the-compilation-of-household-distributional-results-on-income-consumption-and-saving-in-line-with-national-accounts-totals_5a3b9119-en/full-report/component-4.html).

The TypeScript registry is the sole runtime source. `standard_definition` is unused, and no independent reviewer has approved these records for release. The AASM/SRS source was confirmed as a June 2015 issue; the registry stores month precision rather than an invented day. WHO-5 is limited to numeric scoring with explicit English locale for persistence. The WHO publication's CC BY-NC-SA 3.0 IGO terms require deployment-specific licensing review.
