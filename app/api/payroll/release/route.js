export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  return Response.json({
    released: true,
    message: "Payroll release accepted.",
    periodLabel: body.periodLabel || ""
  });
}
