import { NextResponse } from "next/server";
import {
  dashboardChartSets,
  demoSeed,
  payrollChartSets
} from "@/lib/demo-data";
import { getDashboardMetrics } from "@/lib/query-data";

export async function GET() {
  const metrics = await getDashboardMetrics();

  return NextResponse.json({
    metrics,
    charts: dashboardChartSets,
    payrollCharts: payrollChartSets,
    seed: demoSeed
  });
}
