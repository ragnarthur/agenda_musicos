import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Datum = { stage: string; value: number };

export default function BookingsPipeline({
  totalRequests,
  totalBookings,
  confirmedBookings,
  completedBookings,
  cancelledBookings,
}: {
  totalRequests: number;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}) {
  const data: Datum[] = [
    { stage: 'Pedidos', value: totalRequests },
    { stage: 'Reservas', value: totalBookings },
    { stage: 'Confirmadas', value: confirmedBookings },
    { stage: 'Concluidas', value: completedBookings },
    { stage: 'Canceladas', value: cancelledBookings },
  ];

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 12 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="stage"
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
            formatter={(value) => [value, 'Qtd']}
          />
          <Bar dataKey="value" fill="#22c55e" radius={[10, 10, 8, 8]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

