import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type CityDatum = {
  label: string;
  pending: number;
  other: number;
  total: number;
};

export default function TopCitiesStackedBars({
  items,
  max = 8,
}: {
  items: Array<{ city: string; state: string; total: number; pending: number }>;
  max?: number;
}) {
  const data: CityDatum[] = items.slice(0, max).map(c => ({
    label: `${c.city}-${c.state}`,
    pending: c.pending,
    other: Math.max(0, c.total - c.pending),
    total: c.total,
  }));

  if (data.length === 0) return null;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(226,232,240,0.75)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={46}
          />
          <YAxis
            tick={{ fill: 'rgba(226,232,240,0.7)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(value, name) => {
              if (name === 'pending') return [value, 'Pendentes'];
              if (name === 'other') return [value, 'Outras'];
              return [value, name];
            }}
            labelFormatter={label => String(label).replace('-', ' / ')}
          />
          <Bar dataKey="other" stackId="a" fill="rgba(99,102,241,0.45)" radius={[10, 10, 0, 0]} />
          <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Pendentes
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.45)' }}
          />
          Outras
        </div>
      </div>
    </div>
  );
}
