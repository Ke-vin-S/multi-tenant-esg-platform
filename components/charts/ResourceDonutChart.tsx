'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber } from '@/lib/utils';
import { useDarkMode, chartColors } from '@/hooks/useDarkMode';

export interface ResourceDonutSlice {
  name: string;
  value: number;
}

export function ResourceDonutChart({ data }: { data: ResourceDonutSlice[] }) {
  const c = chartColors(useDarkMode());
  const tonnes = data.map((d) => ({ name: d.name, value: d.value / 1000 }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={tonnes} innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
            {tonnes.map((_, i) => (
              <Cell key={i} fill={c.pie[i % c.pie.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${c.tooltipBorder}`, background: c.tooltipBg, color: c.tooltipText }}
            itemStyle={{ color: c.tooltipText }}
            formatter={(v: number) => [`${formatNumber(v)} tCO₂e`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: c.axisText }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
