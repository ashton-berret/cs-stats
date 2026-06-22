import type { EChartsOption } from "echarts";

const baseText = {
  color: "var(--color-text-secondary)",
};

const colors = ["#F2A900", "#4A9EFF", "#2ED573", "#FF6B35", "#9B5DE5", "#5BC0BE", "#E0A93B", "#F15BB5"];

export function getChartTheme(_theme: "dark" | "light"): EChartsOption {
  return {
    color: colors,
    textStyle: baseText,
  };
}
