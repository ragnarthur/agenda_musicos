import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Datum = { label: string; value: number };

export default function TopListBars({
  data,
  valueLabel = 'Qtd',
  max = 6,
}: {
  data: Datum[];
  valueLabel?: string;
  max?: number;
}) {
  const sliced = data.slice(0, max);
  if (sliced.length === 0) return null;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sliced} layout="vertical" margin={{ top: 6, right: 8, left: 8, bottom: 6 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'rgba(226,232,240,0.7)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fill: 'rgba(226,232,240,0.85)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 12,
            }}
            formatter={value => [value ?? 0, valueLabel]}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 10, 10]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
