import assert from "node:assert/strict";
import test from "node:test";

import { normalizeDashboardRole } from "../lib/dashboard-roles.mjs";

test("normalizes enterprise dashboard role aliases", () => {
  assert.equal(normalizeDashboardRole("Chief Executive Officer"), "CEO");
  assert.equal(normalizeDashboardRole("Admin"), "Admin");
  assert.equal(normalizeDashboardRole("Administrator"), "Admin");
  assert.equal(normalizeDashboardRole("Super Admin"), "Admin");
  assert.equal(normalizeDashboardRole("Enterprise Admin"), "Admin");
  assert.equal(normalizeDashboardRole("HR"), "HR");
  assert.equal(normalizeDashboardRole("HR Admin"), "HR");
  assert.equal(normalizeDashboardRole("Human Resources"), "HR");
  assert.equal(normalizeDashboardRole("ATS"), "Recruiter");
  assert.equal(normalizeDashboardRole("Recruiter"), "Recruiter");
  assert.equal(normalizeDashboardRole("Payroll"), "Payroll");
  assert.equal(normalizeDashboardRole("Finance"), "Payroll");
  assert.equal(normalizeDashboardRole("Finance Approver"), "Payroll");
  assert.equal(normalizeDashboardRole("Operations Manager"), "Manager");
  assert.equal(normalizeDashboardRole("Manager"), "Manager");
  assert.equal(normalizeDashboardRole("Employee"), "Employee");
  assert.equal(normalizeDashboardRole("Employee HRMS"), "Employee");
  assert.equal(normalizeDashboardRole("Unknown Custom Role"), "Admin");
});
