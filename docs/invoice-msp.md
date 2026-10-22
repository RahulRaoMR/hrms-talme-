# MSP deduction before GST

The invoice flow follows the supplied `017TTPL2627- Micron MIB April Billing Signed.pdf`. MSP reduces the service taxable value before GST. The added-fee behavior and the former deduction after GST are disabled for this flow.

## Calculation before and after

Before: MSP could be added to the service subtotal, or deducted from net payable after GST. The added fee could also have its own GST selection.

After:

```text
Service / item total
- MSP deduction
= Taxable value after MSP
+ existing GST / CGST+SGST / IGST on the reduced taxable value
+/- existing invoice round-off
= Invoice total
- existing TDS
- payments received
= Balance due
```

- Percentage MSP uses the service subtotal. Rates support 0–100%, with up to four decimal places. Fixed MSP accepts a non-negative amount with two decimal places and cannot exceed the service subtotal.
- MSP amounts remain positive in the existing database column, as required by its check constraint. The form summary and PDF display them negatively, for example `MSP fees (-2.32%)` and `(-1,219.39)`.
- Integer paise arithmetic calculates and proportionally allocates MSP across the service rows. GST is calculated on each reduced HSN/rate/place-of-supply group and allocated back to its rows in paise, so row taxes and the tax summary reconcile exactly. Existing GST selection, exemptions, explicit CGST/SGST overrides and interstate logic remain in use.
- With MSP disabled or zero, the existing tax calculations and rounding are retained, including their existing per-row rounding.
- MSP is included once in the invoice total. It is not deducted a second time from net payable and is not recorded as a customer payment. The existing TDS percentage still uses the service subtotal; this correction does not change the existing TDS policy.
- The API recalculates the amount and always saves `mspTreatment=DEDUCTION` and `mspTax=NONE`. Legacy `FEE`/separate-MSP-tax values cannot reactivate the removed added-fee behavior.

## Reference calculation and rounding

The 12 quantity/rate lines in the supplied PDF total **52,560.00**.

| Calculation | Amount (INR) |
| --- | ---: |
| Service / item total | 52,560.00 |
| MSP fees (-2.32%) | (-1,219.39) |
| Taxable value after MSP | 51,340.61 |
| IGST @18% selected through the existing GST logic | 9,241.31 |
| Round off | 0.08 |
| Invoice total | **60,582.00** |

The reference prints MSP as `(-1219)`, omitting its paise, although its taxable value reflects the full deduction of 1,219.39. It also prints IGST 9,241.30 and round-off 0.09. Mathematically, 18% of 51,340.61 is 9,241.3098, which rounds to **9,241.31**, so the app uses round-off **0.08**. The final invoice total still matches **60,582.00**. No special tax rate or one-paisa correction is hard-coded.

## Form and PDF

The MSP controls are in the existing New/Edit Tax Invoice form, **below Services & Items, above Payment & Other Details**, alongside the existing Invoice Summary.

- MSP Applicable defaults to **No**.
- Yes reveals Percentage/Fixed Amount, percentage rate or fixed deduction, calculated negative percentage deduction and optional channel/platform.
- The summary shows service total, negative MSP, reduced taxable value, existing GST and round-off, invoice total, TDS and payment balance.
- The added-fee treatment selector and separate MSP GST selector have been removed.
- Preview, draft download and saved PDF use the shared calculation and print the negative MSP line before GST. Long platform names wrap within the existing PDF layout.
- Edit/reopen loads stored type, rate, amount and channel. Saving recalculates the invoice and regenerates its PDF. Previously saved PDFs and stored records are not bulk-rewritten; an old MSP invoice is corrected when reviewed and saved through this form.

## Database

This correction reuses `mspApplicable`, `mspType`, `mspRate`, `mspAmount`, `mspChannel`, `mspTreatment` and `mspTax`.

**No new migration, schema change, reset or bulk invoice/payment update is required or performed.** Already-applied migrations are left untouched. The application explicitly stores the deduction setting instead of relying on the old database default for `mspTreatment`.

## Files changed by this correction

| File | Change |
| --- | --- |
| `lib/invoice-model.js` | Deduct MSP before GST, allocate paise across tax groups, validate deduction limits, share the negative MSP label |
| `lib/invoice-records.js` | Enforce deduction-only invoice saves and recalculate amounts on the server |
| `components/pages/vms-page.jsx` | Remove added-fee controls, display negative MSP before GST, preserve existing form styling |
| `lib/invoice-pdf.js` | Print negative MSP before reduced taxable value and GST; remove the old deduction after GST |
| `lib/invoice-list.js` | Clarify that MSP is already included in the reduced invoice total; no dashboard arithmetic change |
| `tests/invoice-msp.test.mjs` | Deduction, mixed-rate allocation, actual reference, legacy added-fee inputs, payments and historical invoice regressions |
| `tests/invoice-msp-browser.test.mjs` | Enter the actual reference lines through New Tax Invoice, save/reopen/edit, preview and download checks, mobile layout |
| `tests/helpers/invoice-msp-reference.mjs` | Quantity/rate/customer fixture transcribed from the supplied PDF |
| `docs/invoice-msp.md` | Calculation, verification evidence and the reference rounding discrepancy |

Other files already modified by the earlier MSP implementation are outside this correction's change list.

## Verification

- 59 invoice/dashboard regression tests passed; two opt-in live PostgreSQL/API checks were not enabled.
- Both browser checks passed: the actual Micron inputs through New Tax Invoice and the existing cross-branch invoice regression. New/edit/save/reopen, percentage and fixed deductions, preview, downloads, partial payments, disabling MSP and 390px/320px layouts were exercised.
- Production Next.js build passed, including its built-in type-check stage. There are no separate lint/type-check scripts in this JavaScript project.
- The supplied PDF was rendered and visually inspected before implementation. The running application's MSP fields/summary, PDF preview, mobile layout and rendered saved/downloaded PDF were visually inspected. Evidence is kept under the ignored `artifacts/invoice-msp-correction/` directory: `msp-fields-and-summary.png`, `pdf-preview-msp-page.png`, `editor-390.png`, `editor-320.png`, `micron-msp-saved.pdf` and `downloaded-pdf-page-2.png`.
- Regression checks verify no-MSP totals, tax overrides, both branches, TDS, payments, attachments, authentication and historical PDF output. An unchanged historical PDF retains its exact saved bytes; a PDF generated with MSP disabled has identical text to one without MSP fields.
- MSP-specific checks include percentages, fixed deductions, zero/100%, invalid inputs, rate/item changes, disabling MSP, partial/full/unpaid invoices, interstate and intrastate GST, mixed HSN/rates and paise reconciliation across 120 varied item configurations.

Run the invoice tests:

```powershell
node --experimental-vm-modules --test tests/invoice*.test.mjs
```

The browser check uses `INVOICE_MSP_BROWSER_TESTS=true`, a running app at `INVOICE_TEST_BASE_URL`, and the existing `PLAYWRIGHT_MODULE` / `PLAYWRIGHT_EXECUTABLE_PATH` overrides. API calls are intercepted and routed to the real invoice services backed by an in-memory test database; no live invoices are created or edited.
