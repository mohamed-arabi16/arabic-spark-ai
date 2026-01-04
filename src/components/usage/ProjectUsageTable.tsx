import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectBreakdown } from '@/hooks/useUsage';
import { Briefcase } from 'lucide-react';

interface ProjectUsageTableProps {
  data: ProjectBreakdown[];
}

export function ProjectUsageTable({ data }: ProjectUsageTableProps) {
  const { t } = useTranslation();

  return (
    <Card className="col-span-1 lg:col-span-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle>{t('usage.projectUsageTitle')}</CardTitle>
        </div>
        <CardDescription>{t('usage.projectUsageDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('usage.noProjectData')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('usage.projectName')}</TableHead>
                <TableHead className="text-right">{t('usage.tokens')}</TableHead>
                <TableHead className="text-right">{t('usage.cost')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.project_id}>
                  <TableCell className="font-medium">{item.project_name}</TableCell>
                  <TableCell className="text-right">{item.tokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${item.cost.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
