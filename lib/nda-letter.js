// Transcribed from the supplied three-page Talme NDA. Keep the reference terms
// intact when personalising a letter; optional text supplements these clauses.
function referenceContent(data) {
  return {
    introduction: [
      `This Agreement is effective when signed on ${data.agreementDate} by and between ${data.companyName} (hereinafter referred as the “Company”), a private limited company having its registered office at ${data.companyAddress} and ${data.employeeName}${data.employeeAddress ? `, residing at ${data.employeeAddress}` : ""} (hereinafter referred as the “Employee”), collectively referred to as the “Parties”.`,
      `The Company has appointed ${data.employeeName}, whose employment is effective from ${data.startDate} and this agreement is intended to protect the confidential information disclosed by the Company in the course of employment to ${data.employeeName}.`,
      "In consideration of the remuneration paid by the Company, the receipt and adequacy of which is hereby acknowledged, the Employee hereto agrees as follows:"
    ],
    clauses: [
      ["Confidential Information", `The Parties agree that information disclosed orally or in writing or made available by the Company (“${data.companyName}”) to another Party (“Employee”), including, but not limited to, information acquired from employees; trade secrets; strategic plans; invention plans and disclosures; customer information; computer programs; software codes; databases; suppliers; software; distribution channels; marketing studies; intellectual property; information relating to process and products, designs, business plans, business opportunities, marketing plans, finances, research, development, know-how or personnel; confidential information originally received from third parties; information relating to any type of technology, and all other material whether written or oral, tangible or intangible, shall be deemed “Confidential Information”. In addition, the existence and terms of this Agreement shall also be treated as Confidential Information. The parties agree that any Confidential Information disclosed prior to the execution of this Agreement during the course of employment was intended to be and shall be subject to the terms and conditions of this Agreement.`],
      ["Restrictions and Exceptions", "The Employee agrees to maintain the confidentiality of the Confidential Information and to prevent its unauthorized dissemination or use for a period of Three (3) years from the date of last disclosure by the Company."],
      ["Non-Disclosure", "The Employee expressly agrees that he/she shall not use Confidential Information provided by the Company in the development or delivery or for personal gain from providing of any products or services for his/her own account or for the account of any third party. The Employee shall protect the Confidential Information by using the same degree of care, but no less than reasonable care, to prevent the unauthorized use, dissemination or publication of the Confidential Information as the Employee uses to protect its own Confidential Information. The Employee shall limit its internal disclosure of the Confidential Information to only those employees and agents who have a need to know the information for the limited purpose of executing his/her job responsibility."],
      ["Ownership of Confidential Information", `All Confidential Information, and all material items delivered by the Company to the Employee, remains the property of the Company and no license or other rights in the Confidential Information are granted to the Employee by this Agreement or by the act of disclosure. Companies POC or any of the employee must not be influenced for any act of groups. If found, ${data.companyName} has all rights to take legal actions against such employees.`],
      ["Return of materials and documents", "Upon the written request of the Company, the Employee shall return to it (or, at the request of the Company, erase or destroy) all materials that contain or embody any Confidential Information of the Company, including but not limited to all computer programs, documentation, financial statement, forms, notes, plans, drawings, customer information and copies thereof. Return or destruction of such material shall not relieve the Employee of its obligations of confidentiality. Upon the request of the Company, the Employee will certify that it has complied with the provisions of this paragraph."],
      ["Non-Circumvention", "The Employee agree to not circumvent the Company and work with business associates, clients, and other third-party vendors introduced by the Company. This non-circumvention provision shall expire at the end of Three (3) years from the termination of this Agreement."],
      ["Non-Solicitation", "For a period of Three (3) years after the termination of this Agreement, the Employee agrees that he/she will not solicit for work, or provide service or advice or assist others with the opportunity to do the same, any Client of any the Company."],
      ["No Tampering", "While Employee is employed by the Company and for Three year following the termination of Employee’s employment with the Company, the Employee shall not (a) request, induce or attempt to influence any supplier of goods or services to the Company to curtail or cancel any business they may transact with the Company; (b) request, induce or attempt to influence any customers of the Company that have done business with or potential customers which have been in contact with the Company to curtail or cancel any business they may transact with the Company; or (c) request, induce or attempt to influence any employee of the Company to terminate his or her employment with the Company."],
      ["Remedy", "The Employee hereby acknowledge that unauthorized disclosure or use of Confidential Information or a breach of this Agreement is a fraud perpetrated on the Company, which could cause significant and irreparable financial harm. Accordingly, the Employee agree that the Company shall have the right to seek and obtain injunctive relief from breaches of this Agreement in addition to any money damages in excess of Rs.10 lakh per each instance of breach of agreement, other rights and remedies it may have from a court of competent jurisdiction."],
      ["Termination", "This Agreement shall survive and remain in effect and expressly terminated in writing and signed by all Parties, or until Three (3) years from the date of termination of employment between the Company and the Employee."],
      ["General", "This Agreement contains the entire agreement between the parties and supersedes any prior written or oral agreements between them concerning the subject matter contained herein. The provisions of this Agreement may be waived, altered, amended or repealed, in whole or in part, only upon the written consent of all parties. The waiver of any party of a breach or violation of any provision of this Agreement shall not operate as or be construed to be a waiver of any subsequent breach hereof. This Agreement constitutes the product of negotiations of the parties hereto and any enforcement hereof will be interpreted in a neutral manner and not more strongly for against any party based upon the source of the drafts man-ship of this Agreement. If any provision of this Agreement shall be held invalid or unenforceable by a court of competent jurisdiction, the remaining provisions hereof shall continue to be fully effective."]
    ],
    clientRestriction: `Employee should not indulge in any activities of recruitment or business with the clients of ${data.companyName} for a period of (3) year from the relieving dates. If found, ${data.companyName} has all authorization to take legal action against the employee for the breach of practices.`,
    acknowledgment: "The Employee acknowledges that the Company shall or may in reliance of this agreement provide Employee access to trade secrets, customers and other confidential data and good will Employee agrees to retain said information as confidential and not to use said information on his or her own behalf or disclose same to any third party.",
    acceptance: "I have read and fully understood the above terms and conditions, and I accept the same without any reservations."
  };
}

function wrap(text, font, size, width, firstWidth = width) {
  const lines = [];
  let line = "";
  let available = firstWidth;
  // Splitting long tokens also keeps unusually long names/addresses in bounds.
  for (const word of String(text || "").trim().split(/\s+/).filter(Boolean)) {
    if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > available) {
      lines.push(line);
      line = "";
      available = width;
    }
    let remainder = word;
    while (font.widthOfTextAtSize(remainder, size) > available) {
      let part = "";
      for (const character of remainder) {
        if (part && font.widthOfTextAtSize(part + character, size) > available) break;
        part += character;
      }
      lines.push(part);
      remainder = remainder.slice(part.length);
      available = width;
    }
    line = line ? `${line} ${remainder}` : remainder;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawNdaLetter(pdfDoc, { regular, bold }, data, decoratePage) {
  const dimensions = [595.5, 842.2499787];
  const margin = 54;
  const width = dimensions[0] - margin * 2;
  const size = 10.3;
  const leading = 13.1;
  const bottom = 88;
  let page;
  let y;

  function newPage(first = false) {
    page = pdfDoc.addPage(dimensions);
    decoratePage(page);
    y = page.getHeight() - 112;
    if (first) {
      for (const [title, offset, titleSize] of [["NCNDA", 0, 10], ["NON-DISCLOSURE AGREEMENT", 18, 12]]) {
        page.drawText(title, { x: (page.getWidth() - bold.widthOfTextAtSize(title, titleSize)) / 2, y: y - offset, font: bold, size: titleSize });
      }
      y -= 42;
    }
  }

  function paragraph(text, prefix = "", font = regular, gap = 8) {
    const prefixWidth = prefix ? bold.widthOfTextAtSize(prefix, size) + 2 : 0;
    const lines = wrap(text, font, size, width, width - prefixWidth);
    // A heading always travels with at least the first two lines of its text.
    if (y - leading * (Math.min(lines.length, 2) - 1) < bottom) newPage();
    lines.forEach((line, index) => {
      if (y < bottom) newPage();
      if (index === 0 && prefix) page.drawText(prefix, { x: margin, y, font: bold, size });
      page.drawText(line, { x: margin + (index === 0 ? prefixWidth : 0), y, font, size });
      y -= leading;
    });
    y -= gap;
  }

  const content = referenceContent(data);
  const clause = (index) => paragraph(content.clauses[index][1], `${index + 1}. ${content.clauses[index][0]}: `);
  newPage(true);
  content.introduction.forEach((text) => paragraph(text));
  [0, 1, 2].forEach(clause);
  paragraph(content.clientRestriction);

  // Preserve the reference's three logical pages, with overflow pages as needed.
  newPage();
  [3, 4, 5, 6, 7, 8, 9].forEach(clause);
  newPage();
  clause(10);
  paragraph(content.acknowledgment);
  if (data.body) {
    String(data.body).split(/\n+/).filter((text) => text.trim()).forEach((text, index) => {
      paragraph(text, index === 0 ? "Additional Confidentiality Terms: " : "");
    });
  }

  // Keep acceptance and the blank signing area together, clear of the footer.
  const acceptanceLines = wrap(content.acceptance, bold, size, width, width - bold.widthOfTextAtSize("ACCEPTANCE: ", size) - 2);
  const employeeLines = wrap(`Name: ${data.employeeName}`, regular, size, width / 2 - 12);
  const companyLines = wrap(`For ${data.companyName}`, bold, size, width / 2 - 12);
  const placeLines = wrap(`Place: ${data.acceptancePlace || "____________________"}`, regular, size, width);
  const dateLines = wrap(`Date: ${data.agreementDate}`, regular, size, width);
  const titleLines = wrap(data.signatoryTitle || "", regular, size, width / 2 - 12);
  const signingHeight = (acceptanceLines.length + placeLines.length + dateLines.length + Math.max(employeeLines.length, companyLines.length + titleLines.length + 1)) * leading + 144;
  if (y - signingHeight < bottom) newPage();
  paragraph(content.acceptance, "ACCEPTANCE: ", bold, 24);
  paragraph(`Date: ${data.agreementDate}`, "", regular, 16);
  paragraph(`Place: ${data.acceptancePlace || "____________________"}`, "", regular, 72);
  page.drawText("Signature: ____________________", { x: margin, y, font: regular, size });
  y -= 32;
  employeeLines.forEach((line, index) => page.drawText(line, { x: margin, y: y - index * leading, font: regular, size }));
  companyLines.forEach((line, index) => page.drawText(line, { x: page.getWidth() / 2 + 12, y: y - index * leading, font: bold, size }));
  titleLines.forEach((line, index) => page.drawText(line, { x: page.getWidth() / 2 + 12, y: y - (companyLines.length + index + 1) * leading, font: regular, size }));
}
