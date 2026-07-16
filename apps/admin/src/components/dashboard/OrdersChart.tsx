"use client";

import { useMemo, useState } from "react";

export type OrdersChartPoint = {
  label: string;
  value: number;
};

export type OrdersChartMetric = {
  label: string;
  value: string;
  active?: boolean;
};

export type OrdersChartPeriod = {
  id: string;
  label: string;
  points: OrdersChartPoint[];
  metrics: OrdersChartMetric[];
};

type Point = { x: number; y: number };

function createSmoothPath(points: Point[]) {
  if (points.length === 0) return "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const controlOffset = (point.x - previous.x) / 3;
    return `${path} C ${previous.x + controlOffset} ${previous.y}, ${point.x - controlOffset} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

export default function OrdersChart({ periods }: { periods: OrdersChartPeriod[] }) {
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? "");
  const period = periods.find((item) => item.id === periodId) ?? periods[0];

  const chart = useMemo(() => {
    const width = 760;
    const top = 12;
    const bottom = 156;
    const left = 42;
    const right = 12;
    const values = period?.points.map((point) => point.value) ?? [];
    const maximum = Math.max(30, ...values);
    const range = bottom - top;
    const step = period && period.points.length > 1
      ? (width - left - right) / (period.points.length - 1)
      : 0;
    const points = period?.points.map((point, index) => ({
      x: left + index * step,
      y: bottom - (point.value / maximum) * range,
    })) ?? [];
    const linePath = createSmoothPath(points);
    const first = points[0];
    const last = points.at(-1);
    const areaPath = first && last
      ? `${linePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`
      : "";
    const ticks = [maximum, maximum * (2 / 3), maximum / 3, 0];

    return { width, top, bottom, left, right, maximum, points, linePath, areaPath, ticks };
  }, [period]);

  if (!period) return null;

  return (
    <section className="rounded-[9px] border border-white/[0.09] bg-[linear-gradient(145deg,#111111,#0C0C0C)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-[15px] font-bold text-white">Pedidos pagos</h2>
        <select
          value={period.id}
          onChange={(event) => setPeriodId(event.target.value)}
          aria-label="Período do gráfico"
          className="h-8 rounded-md border border-white/[0.08] bg-[#1A1A1A] px-3 text-[10px] font-semibold text-white outline-none transition focus:border-[#A9EC17]/50"
        >
          {periods.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${chart.width} 184`}
          role="img"
          aria-label={`Pedidos pagos em ${period.label.toLowerCase()}`}
          className="h-auto min-h-[190px] w-full"
        >
          <defs>
            <linearGradient id="orders-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A9EC17" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#A9EC17" stopOpacity="0" />
            </linearGradient>
          </defs>

          {chart.ticks.map((tick, index) => {
            const y = chart.top + ((chart.bottom - chart.top) / 3) * index;
            return (
              <g key={tick}>
                <line x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                <text x="0" y={y + 4} fill="rgba(255,255,255,0.45)" fontSize="10">
                  R$ {Math.round(tick)}
                </text>
              </g>
            );
          })}

          <path d={chart.areaPath} fill="url(#orders-area)" />
          <path d={chart.linePath} fill="none" stroke="#A9EC17" strokeWidth="2.2" strokeLinecap="round" />

          {chart.points.map((point, index) => (
            <g key={`${period.points[index].label}-${index}`}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="#A9EC17" />
              <text x={point.x} y="177" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">
                {period.points[index].label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {period.metrics.map((metric) => (
          <article
            key={metric.label}
            className={`rounded-md border p-3.5 ${metric.active ? "border-[#A9EC17]/15 bg-[#A9EC17]/[0.025]" : "border-white/[0.09] bg-black/[0.08]"}`}
          >
            <p className={`text-[9px] font-bold uppercase ${metric.active ? "text-[#A9EC17]/70" : "text-white/45"}`}>{metric.label}</p>
            <p className={`mt-1 text-[15px] font-bold ${metric.active ? "text-[#A9EC17]" : "text-white"}`}>{metric.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
