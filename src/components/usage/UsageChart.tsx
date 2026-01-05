import { UsageStat } from '@/hooks/useUsage';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatLocalizedCurrency, formatLocalizedDate } from '@/lib/formatters';

interface UsageChartProps {
  data: UsageStat[];
}

export function UsageChart({ data }: UsageChartProps) {
  const { t, i18n } = useTranslation();

  // Transform data for display
  const chartData = data.map(d => ({
    date: formatLocalizedDate(d.date, i18n.language),
    cost: d.total_cost,
    tokens: d.total_tokens,
  }));

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>{t('usage.dailyCost')}</CardTitle>
      </CardHeader>
      <CardContent className="ps-2">
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
                tickFormatter={(value) => formatLocalizedCurrency(value, i18n.language)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                 formatter={(value: number) => [formatLocalizedCurrency(value, i18n.language), t('usage.cost')]}
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
