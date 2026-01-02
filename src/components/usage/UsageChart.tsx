import { UsageStat } from '@/hooks/useUsage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface UsageChartProps {
  data: UsageStat[];
}

export function UsageChart({ data }: UsageChartProps) {
  // Transform data for display
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    cost: d.total_cost,
    tokens: d.total_tokens,
  }));

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Daily Usage Cost</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                 formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                 cursor={{ fill: 'transparent' }}
              />
              <Bar dataKey="cost" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
