import { randomUUID } from "node:crypto";

export function invoiceTestDatabase() {
  let state = { invoices: [], documents: [], audit: [] };
  let clock = Date.now();
  const now = () => new Date(++clock);
  const metadata = ({ data, ...document }) => structuredClone(document);
  const fullInvoice = (row) => row ? { ...structuredClone(row), documents: state.documents.filter((document) => document.invoiceId === row.id).map(metadata) } : null;
  const matches = (row, where) => Object.entries(where || {}).every(([key, value]) => key === "updatedAt" ? new Date(row[key]).getTime() === new Date(value).getTime() : key === "id" && value?.notIn ? !value.notIn.includes(row.id) : row[key] === value);
  const db = {
    failDocumentWrite: false,
    get state() { return state; },
    invoice: {
      async findMany() { return state.invoices.map(fullInvoice); },
      async findUnique({ where }) { return fullInvoice(state.invoices.find((row) => matches(row, where))); },
      async create({ data }) {
        if (state.invoices.some((row) => row.invoiceNo === data.invoiceNo)) throw Object.assign(new Error("Duplicate invoice"), { code: "P2002" });
        const row = { ...structuredClone(data), id: randomUUID(), createdAt: now(), updatedAt: now() };
        state.invoices.push(row);
        return fullInvoice(row);
      },
      async updateMany({ where, data }) {
        const row = state.invoices.find((row) => matches(row, where));
        if (!row) return { count: 0 };
        Object.assign(row, structuredClone(data), { updatedAt: now() });
        return { count: 1 };
      },
      async delete({ where }) {
        state.invoices = state.invoices.filter((row) => row.id !== where.id);
        state.documents = state.documents.filter((row) => row.invoiceId !== where.id);
      }
    },
    invoiceDocument: {
      async findMany() { return state.documents.map((row) => ({ ...metadata(row), invoice: structuredClone(state.invoices.find((invoice) => invoice.id === row.invoiceId)) })); },
      async findFirst({ where }) { return structuredClone(state.documents.find((row) => matches(row, where)) || null); },
      async create({ data }) {
        if (db.failDocumentWrite) throw new Error("Document write failed");
        const row = { ...structuredClone(data), id: randomUUID(), createdAt: now(), updatedAt: now() };
        state.documents.push(row);
        return structuredClone(row);
      },
      async update({ where, data }) { Object.assign(state.documents.find((row) => row.id === where.id), structuredClone(data), { updatedAt: now() }); },
      async deleteMany({ where }) { state.documents = state.documents.filter((row) => !matches(row, where)); }
    },
    auditLog: { async create({ data }) { state.audit.push(structuredClone(data)); } },
    async $transaction(action) {
      const previous = structuredClone(state);
      try { return await action(db); } catch (error) { state = previous; throw error; }
    }
  };
  return db;
}
