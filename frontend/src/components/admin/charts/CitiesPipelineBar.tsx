import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Datum = { name: string; value: number; color: string };

export default function CitiesPipelineBar({
  partner,
  expansion,
  planning,
}: {
  partner: number;
  expansion: number;
  planning: number;
}) {
  const data: Datum[] = [
    { name: 'Parceiras', value: partner, color: '#6366f1' }, // indigo-500
    { name: 'Expansao', value: expansion, color: '#22c55e' }, // green-500
    { name: 'Planejamento', value: planning, color: '#a855f7' }, // purple-500
  ];

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(226,232,240,0.85)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
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
            formatter={(value) => [value, 'Cidades']}
            labelStyle={{ color: 'rgba(226,232,240,0.9)' }}
          />
          <Bar dataKey="value" radius={[10, 10, 8, 8]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
