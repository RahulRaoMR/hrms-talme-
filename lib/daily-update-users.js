export function normalizeDailyUpdateUser(value) {
  return String(value || "").trim().toLowerCase();
}

export function dailyUpdateUserOptions(employees = [], updates = [], currentEmail = "") {
  const people = [];
  const identities = new Map();

  function addPerson(name, values) {
    const aliases = [...new Set(values.map(normalizeDailyUpdateUser).filter(Boolean))];
    if (!aliases.length) return;

    let person = aliases.map((alias) => identities.get(alias)).find(Boolean);
    if (!person) {
      person = { value: aliases[0], label: String(name || aliases[0]).trim(), identities: [] };
      people.push(person);
    }
    for (const alias of aliases) {
      if (!person.identities.includes(alias)) person.identities.push(alias);
      identities.set(alias, person);
    }
  }

  for (const employee of employees) {
    addPerson(employee.name || employee.employeeDetails?.employeeName, [
      employee.email, employee.employeeDetails?.email, employee.employeeId, employee.id
    ]);
  }
  for (const update of updates) {
    addPerson(update.authorName, [update.authorEmail]);
  }

  const currentIdentity = normalizeDailyUpdateUser(currentEmail);
  const currentPerson = identities.get(currentIdentity);
  return [
    { value: "all", label: "Everyone", identities: [] },
    { value: "mine", label: "Myself", identities: currentPerson?.identities || [currentIdentity].filter(Boolean) },
    ...people
      .filter((person) => person !== currentPerson)
      .sort((first, second) => first.label.localeCompare(second.label, "en", { sensitivity: "base", numeric: true }))
  ];
}

export function matchesDailyUpdateUser(update, selection, options) {
  if (selection === "all") return true;
  const identity = normalizeDailyUpdateUser(update.authorEmail);
  const selected = options.find((option) => option.value === selection);
  return Boolean(identity && selected?.identities.includes(identity));
}
