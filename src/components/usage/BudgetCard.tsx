import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface BudgetCardProps {
  currentCost: number;
}

export function BudgetCard({ currentCost }: BudgetCardProps) {
  const { t } = useTranslation();
  const [budget, setBudget] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Load budget from localStorage on mount
  useEffect(() => {
    const savedBudget = localStorage.getItem('usage_budget');
    if (savedBudget) {
      setBudget(parseFloat(savedBudget));
    } else {
      setBudget(50); // Default $50
    }
  }, []);

  const handleSave = () => {
    const newBudget = parseFloat(inputValue);
    if (isNaN(newBudget) || newBudget <= 0) {
      toast.error(t('usage.invalidBudget'));
      return;
    }
    setBudget(newBudget);
    localStorage.setItem('usage_budget', newBudget.toString());
    setIsEditing(false);
    toast.success(t('usage.budgetSaved'));
  };

  const percentage = budget > 0 ? (currentCost / budget) * 100 : 0;
  const isApproaching = percentage >= 80;
  const isExceeded = percentage >= 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>{t('usage.budgetTitle')}</CardTitle>
          </div>
          {!isEditing && (
             <Button variant="outline" size="sm" onClick={() => {
               setInputValue(budget.toString());
               setIsEditing(true);
             }}>
               {t('common.edit')}
             </Button>
          )}
        </div>
        <CardDescription>{t('usage.budgetDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="flex gap-2">
            <div className="relative flex-1">
               <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
               <Input
                 type="number"
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 className="pl-7"
               />
            </div>
            <Button onClick={handleSave}>{t('common.save')}</Button>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>{t('common.cancel')}</Button>
          </div>
        ) : (
          <div className="space-y-1">
             <div className="flex justify-between text-sm font-medium">
                <span>${currentCost.toFixed(2)} {t('usage.used')}</span>
                <span>${budget.toFixed(2)} {t('usage.limit')}</span>
             </div>
             <Progress value={Math.min(percentage, 100)} className={isExceeded ? "bg-red-200" : ""} />
             <div className="flex justify-between items-center text-xs mt-2">
                {isExceeded ? (
                   <span className="text-destructive flex items-center gap-1">
                     <AlertTriangle className="h-3 w-3" />
                     {t('usage.budgetExceeded')}
                   </span>
                ) : isApproaching ? (
                   <span className="text-amber-500 flex items-center gap-1">
                     <AlertTriangle className="h-3 w-3" />
                     {t('usage.approachingLimit', { percentage: percentage.toFixed(0) })}
                   </span>
                ) : (
                   <span className="text-green-600 flex items-center gap-1">
                     <CheckCircle className="h-3 w-3" />
                     {t('usage.withinBudget')}
                   </span>
                )}
                <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
