const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const BASIC_RATE = 0.5;
const HRA_RATE = 0.5;
const CONVEYANCE_RATE = 0.0833;
const PF_RATE = 0.12;
const PF_WAGE_CAP_YEARLY = 180000;
const EDLI_RATE = 0.005;
const EMPLOYEE_ESI_RATE = 0.0025;
const ESI_GROSS_LIMIT_MONTHLY = 21000;
const MEDICAL_INSURANCE_YEARLY = 6000;
const PROFESSIONAL_TAX_YEARLY = 2400;
const PROFESSIONAL_TAX_LIMIT_MONTHLY = 25000;

function roundAmount(value) {
  return Math.round(value || 0);
}

function toDisplayAmount(value) {
  const yearly = roundAmount(value);
  return {
    yearly,
    monthly: roundAmount(yearly / 12)
  };
}

export function formatInr(value) {
  return inrFormatter.format(value || 0);
}

export function sanitizeAnnualCtc(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function calculateCtcBreakdown(annualCtc, candidateName = "") {
  const normalizedCtc = Math.max(0, Number(annualCtc) || 0);
  const basicYearlyExact = normalizedCtc * BASIC_RATE;
  const hraYearlyExact = basicYearlyExact * HRA_RATE;
  const pfWageYearlyExact = Math.min(basicYearlyExact, PF_WAGE_CAP_YEARLY);
  const employerPfYearlyExact = pfWageYearlyExact * PF_RATE;
  const edliYearlyExact = pfWageYearlyExact * EDLI_RATE;
  const epfAdminYearlyExact = pfWageYearlyExact * EDLI_RATE;
  const employerTotalYearlyExact = employerPfYearlyExact + edliYearlyExact + epfAdminYearlyExact;
  const grossPayYearlyExact = normalizedCtc - employerTotalYearlyExact;
  const grossPayDisplay = toDisplayAmount(grossPayYearlyExact);
  const conveyanceYearlyExact = basicYearlyExact * CONVEYANCE_RATE;
  const specialAllowanceYearlyExact =
    grossPayYearlyExact - basicYearlyExact - hraYearlyExact - conveyanceYearlyExact;
  const employeePfYearlyExact = employerPfYearlyExact;
  const employeeEsiYearlyExact =
    grossPayDisplay.monthly <= ESI_GROSS_LIMIT_MONTHLY ? grossPayYearlyExact * EMPLOYEE_ESI_RATE : 0;
  const professionalTaxYearlyExact =
    grossPayDisplay.monthly > PROFESSIONAL_TAX_LIMIT_MONTHLY ? PROFESSIONAL_TAX_YEARLY : 0;
  const employeeTotalYearlyExact =
    employeePfYearlyExact +
    MEDICAL_INSURANCE_YEARLY +
    employeeEsiYearlyExact +
    professionalTaxYearlyExact;
  const netPayYearlyExact = grossPayYearlyExact - employeeTotalYearlyExact;

  const basicDisplay = toDisplayAmount(basicYearlyExact);
  const hraDisplay = toDisplayAmount(hraYearlyExact);
  const conveyanceDisplay = toDisplayAmount(conveyanceYearlyExact);
  const specialAllowanceDisplay = toDisplayAmount(specialAllowanceYearlyExact);
  const employeePfDisplay = toDisplayAmount(employeePfYearlyExact);
  const medicalDisplay = toDisplayAmount(MEDICAL_INSURANCE_YEARLY);
  const employeeEsiDisplay = toDisplayAmount(employeeEsiYearlyExact);
  const professionalTaxDisplay = toDisplayAmount(professionalTaxYearlyExact);
  const employeeTotalDisplay = toDisplayAmount(employeeTotalYearlyExact);
  const netPayDisplay = toDisplayAmount(netPayYearlyExact);
  const employerPfDisplay = toDisplayAmount(employerPfYearlyExact);
  const employerEsiDisplay = toDisplayAmount(0);
  const edliDisplay = toDisplayAmount(edliYearlyExact);
  const epfAdminDisplay = toDisplayAmount(epfAdminYearlyExact);
  const employerTotalDisplay = toDisplayAmount(employerTotalYearlyExact);
  const totalCompensationDisplay = toDisplayAmount(normalizedCtc);

  const employeeContributionItems = [
    {
      label: "Employee's Contribution to PF",
      ...employeePfDisplay,
      reason: "12% of basic cap at 15000"
    },
    {
      label: "Medical Insurance",
      ...medicalDisplay,
      reason: ""
    }
  ];

  if (employeeEsiDisplay.yearly > 0) {
    employeeContributionItems.push({
      label: "ESI",
      ...employeeEsiDisplay,
      reason: "0.25% of Gross Pay when Gross Pay is up to 21000"
    });
  }

  employeeContributionItems.push(
    {
      label: "KA Professional Tax",
      ...professionalTaxDisplay,
      reason: "If Gross Pay is above 25000"
    },
    {
      label: "Total",
      ...employeeTotalDisplay,
      reason: "",
      emphasis: true
    },
    {
      label: "Net Pay",
      ...netPayDisplay,
      reason: "",
      emphasis: true
    }
  );

  const employerContributionItems = [
    {
      label: "Employer Contribution to PF",
      ...employerPfDisplay,
      reason: "12% of basic cap at 15000"
    }
  ];

  if (employeeEsiDisplay.yearly > 0) {
    employerContributionItems.push({
      label: "ESI",
      ...employerEsiDisplay,
      reason: ""
    });
  }

  employerContributionItems.push(
    {
      label: "EDLI - Employer Contribution",
      ...edliDisplay,
      reason: "0.5% of PF Wage"
    },
    {
      label: "EPF Admin Charges",
      ...epfAdminDisplay,
      reason: "0.5% of PF Wage"
    },
    {
      label: "Total",
      ...employerTotalDisplay,
      reason: "",
      emphasis: true
    },
    {
      label: "Total Compensation",
      ...totalCompensationDisplay,
      reason: "Gross pay + Total statutory (Employers)",
      emphasis: true
    }
  );

  return {
    name: candidateName.trim(),
    annualCtc: normalizedCtc,
    totalCompensationMonthly: totalCompensationDisplay.monthly,
    sections: [
      {
        label: "Earnings",
        items: [
          {
            label: "Basic",
            ...basicDisplay,
            reason: "50% on CTC"
          },
          {
            label: "HRA",
            ...hraDisplay,
            reason: "50% on Basic"
          },
          {
            label: "Conveyance Allowance",
            ...conveyanceDisplay,
            reason: "8.33% on Basic"
          },
          {
            label: "Special Allowance",
            ...specialAllowanceDisplay,
            reason: "Gross - (Basic+HRA+CA)"
          },
          {
            label: "Total Gross Pay",
            ...grossPayDisplay,
            reason: "",
            emphasis: true
          }
        ]
      },
      {
        label: "Employee Contribution",
        items: employeeContributionItems
      },
      {
        label: "Employer Contribution",
        items: employerContributionItems
      }
    ]
  };
}
