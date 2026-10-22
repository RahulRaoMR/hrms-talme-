// Quantities/rates and customer details read from the supplied Micron invoice.
export const referenceInvoice = {
  branchId: "banashankari", invoiceNo: "017TTPL2627", invoiceDate: "2026-06-01",
  state: "Gujarat", tax: "GST@18%", tds: "NONE (0%)", roundOff: true, mode: "Credit",
  mspApplicable: true, mspType: "PERCENTAGE", mspRate: "2.32", mspChannel: ""
};
export const referenceParty = {
  name: "Micron Semiconductors Technology India Private Limited",
  billing: "AV-11, BOL Ind. Estate, Sanand GIDC Road, Sanand GIDC, Ahmedabad, Gujarat - 382110",
  gstin: "24AAQCM3409E1ZL", pan: "AAQCM3409E", state: "Gujarat", shipping: ""
};
export const referenceRows = [[8, 180], [48, 180], [4, 300], [40, 180], [8, 180], [48, 180], [4, 300], [32, 180], [8, 180], [48, 180], [4, 300], [32, 180]].map(([qty, price], index) => ({
  id: index + 1, item: "Contract staffing", hsn: "998513", qty: String(qty), price: String(price),
  description: `April contract staffing - service line ${index + 1}`, tax: "Select", unit: "NONE"
}));
