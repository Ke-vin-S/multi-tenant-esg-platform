'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber } from '@/lib/utils';
import { useDarkMode, chartColors } from '@/hooks/useDarkMode';

export interface SectorBarRow {
  name: string;
  scope1?: number;
  scope2?: number;
  scope3?: number;
}

export function SectorBarChart({ data }: { data: SectorBarRow[] }) {
  const c = chartColors(useDarkMode());
  const tonnes = data.map((r) => ({
    name: r.name,
    'Scope 1': (r.scope1 ?? 0) / 1000,
    'Scope 2': (r.scope2 ?? 0) / 1000,
    'Scope 3': (r.scope3 ?? 0) / 1000,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={tonnes} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: c.axisText }} tickLine={false} axisLine={false} />
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
            formatter={(v: number) => [`${formatNumber(v)} tCO₂e`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: c.axisText }} />
          <Bar dataKey="Scope 1" stackId="a" fill={c.bar.scope1} />
          <Bar dataKey="Scope 2" stackId="a" fill={c.bar.scope2} />
          <Bar dataKey="Scope 3" stackId="a" fill={c.bar.scope3} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
