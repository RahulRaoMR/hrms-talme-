import assert from "node:assert/strict";
import test from "node:test";
import { dailyUpdateUserOptions, matchesDailyUpdateUser } from "../lib/daily-update-users.js";

const employees = [
  { id: "1", employeeId: "TTPL-1", name: "Pooja", email: "pooja@talme.test" },
  { id: "2", employeeId: "TTPL-2", name: "Amrutha", email: "amrutha@talme.test" },
  { id: "3", employeeId: "TTPL-3", name: "Nandhini", email: "nandhini@talme.test" },
  { id: "4", employeeId: "TTPL-4", name: "Harshitha", email: "harshitha@talme.test" }
];

test("lists every employee, including people who have never posted, in alphabetical order", () => {
  const options = dailyUpdateUserOptions(employees, [{ authorName: "Old Pooja Name", authorEmail: "pooja@talme.test" }]);
  assert.deepEqual(options.map((option) => option.label), ["Everyone", "Myself", "Amrutha", "Harshitha", "Nandhini", "Pooja"]);
});

test("preserves historical authors, deduplicates email casing, and represents the signed-in employee as Myself", () => {
  const options = dailyUpdateUserOptions([...employees, { ...employees[0], email: " POOJA@TALME.TEST " }], [
    { authorName: "Pooja", authorEmail: "POOJA@talme.test " },
    { authorName: "Former Colleague", authorEmail: "former@talme.test" },
    { authorName: "Invalid Record", authorEmail: "" }
  ], " POOJA@talme.test ");
  assert.deepEqual(options.map((option) => option.label), ["Everyone", "Myself", "Amrutha", "Former Colleague", "Harshitha", "Nandhini"]);
  assert.equal(matchesDailyUpdateUser({ authorEmail: "pooja@talme.test" }, "mine", options), true);
  assert.equal(matchesDailyUpdateUser({ authorEmail: "ttpl-1" }, "mine", options), true);
  assert.equal(matchesDailyUpdateUser({ authorEmail: "amrutha@talme.test" }, "mine", options), false);
});

test("employees without an email remain selectable by employee ID and match their login identity", () => {
  const options = dailyUpdateUserOptions([
    { id: "5", employeeId: "TTPL-5", name: "Employee Without Email" },
    { id: "6", employeeId: "TTPL-6", name: "Employee With Details", employeeDetails: { email: "details@talme.test" } }
  ], [{ authorName: "Employee Without Email", authorEmail: "ttpl-5" }]);
  assert.equal(options.length, 4);
  assert.equal(options[2].label, "Employee With Details");
  assert.equal(matchesDailyUpdateUser({ authorEmail: " TTPL-5 " }, "ttpl-5", options), true);
  assert.equal(matchesDailyUpdateUser({ authorEmail: "TTPL-6" }, "details@talme.test", options), true);
});

test("selected employees only show their updates while Everyone retains all updates", () => {
  const options = dailyUpdateUserOptions(employees);
  const updates = employees.map((employee) => ({ authorEmail: employee.email }));
  assert.deepEqual(updates.filter((update) => matchesDailyUpdateUser(update, "amrutha@talme.test", options)), [updates[1]]);
  assert.equal(updates.filter((update) => matchesDailyUpdateUser(update, "all", options)).length, 4);
  assert.equal(matchesDailyUpdateUser({}, "mine", options), false);
  assert.equal(matchesDailyUpdateUser(updates[0], "unknown", options), false);
});

test("empty directories still offer Everyone, Myself, and known authors", () => {
  const options = dailyUpdateUserOptions([], [{ authorName: "Author", authorEmail: "author@talme.test" }], "me@talme.test");
  assert.deepEqual(options.map((option) => option.label), ["Everyone", "Myself", "Author"]);
  assert.equal(matchesDailyUpdateUser({ authorEmail: " ME@talme.test " }, "mine", options), true);
});
