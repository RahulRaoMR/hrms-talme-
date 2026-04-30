import {
  dashboardChartSets,
  demoSeed,
  payrollChartSets
} from "@/lib/demo-data";
import { getDashboardMetrics } from "@/lib/query-data";

export async function getDashboardModuleData() {
  return {
    metrics: await getDashboardMetrics(),
    charts: dashboardChartSets,
    payrollCharts: payrollChartSets,
    seed: demoSeed
  };
}
