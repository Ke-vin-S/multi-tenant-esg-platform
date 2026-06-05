'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/lib/utils';
import { useDarkMode, chartColors } from '@/hooks/useDarkMode';

export interface EmissionLineChartPoint {
  month: string;
  totalCo2eKg: number;
}

export function EmissionLineChart({ data }: { data: EmissionLineChartPoint[] }) {
  const c = chartColors(useDarkMode());
  const chartData = data.map((p) => ({ month: p.month, tonnes: p.totalCo2eKg / 1000 }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axisText }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: c.axisText }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${c.tooltipBorder}`, background: c.tooltipBg, color: c.tooltipText }}
            labelStyle={{ color: c.tooltipText }}
            itemStyle={{ color: c.tooltipText }}
            formatter={(v: number) => [`${formatNumber(v)} tCO₂e`, 'Emissions']}
          />
          <Line
            type="monotone"
            dataKey="tonnes"
            stroke={c.line}
            strokeWidth={2}
            dot={{ r: 3, fill: c.line }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
