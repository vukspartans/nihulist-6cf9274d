import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/[0.02] hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-primary via-accent to-primary/50" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-3xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            {typeof value === 'number' ? value.toLocaleString('he-IL') : value}
          </div>
          {description && (
            <CardDescription className="text-xs">
              {description}
            </CardDescription>
          )}
          {trend && (
            <p
              className={`text-xs mt-1 font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}% from last month
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
