import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type Datum = { name: string; value: number; color: string };

export default function RequestsStatusDonut({
  pending,
  approved,
  rejected,
}: {
  pending: number;
  approved: number;
  rejected: number;
}) {
  const data: Datum[] = [
    { name: 'Pendentes', value: pending, color: '#f59e0b' }, // amber-500
    { name: 'Aprovadas', value: approved, color: '#10b981' }, // emerald-500
    { name: 'Rejeitadas', value: rejected, color: '#ef4444' }, // red-500
  ].filter(d => d.value > 0);

  const total = pending + approved + rejected;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
      <div className="md:col-span-3 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.95)', // slate-900
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                color: '#fff',
                fontSize: 12,
              }}
              formatter={(value, name) => [value, name]}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={3}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={1}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="md:col-span-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Total</p>
          <p className="mt-1 text-3xl font-bold text-white">{total}</p>

          <div className="mt-4 space-y-2 text-sm">
            {[
              { label: 'Pendentes', value: pending, color: 'bg-amber-500' },
              { label: 'Aprovadas', value: approved, color: 'bg-emerald-500' },
              { label: 'Rejeitadas', value: rejected, color: 'bg-red-500' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                  {row.label}
                </div>
                <span className="font-semibold text-white tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
