import { ModelBreakdown } from '@/hooks/useUsage';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatLocalizedCurrency } from '@/lib/formatters';

interface UsageBreakdownProps {
  data: ModelBreakdown[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function UsageBreakdown({ data }: UsageBreakdownProps) {
  const { t, i18n } = useTranslation();

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{t('usage.costByModel')}</CardTitle>
        <CardDescription>{t('usage.costByModelSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cost"
                nameKey="model"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatLocalizedCurrency(value, i18n.language)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
