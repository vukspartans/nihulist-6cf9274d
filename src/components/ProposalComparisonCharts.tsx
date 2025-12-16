import { useMemo } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface Proposal {
  id: string;
  supplier_name: string;
  price: number;
  timeline_days: number;
  evaluation_score?: number | null;
  evaluation_rank?: number | null;
  evaluation_result?: any;
}

interface ProposalComparisonChartsProps {
  proposals: Proposal[];
}

export const ProposalComparisonCharts = ({ proposals }: ProposalComparisonChartsProps) => {
  // Prepare data for bar chart
  const barChartData = useMemo(() => {
    return proposals
      .filter(p => p.evaluation_score !== null && p.evaluation_score !== undefined)
      .sort((a, b) => (a.evaluation_rank || 999) - (b.evaluation_rank || 999))
      .map(p => ({
        name: p.supplier_name.length > 20 ? p.supplier_name.substring(0, 20) + '...' : p.supplier_name,
        fullName: p.supplier_name,
        score: p.evaluation_score || 0,
        rank: p.evaluation_rank || 999,
        price: Math.round(p.price / 1000), // In thousands
        timeline: p.timeline_days,
      }));
  }, [proposals]);

  // Prepare data for radar chart (comparing top 3 proposals)
  const { radarChartData, top3 } = useMemo(() => {
    const filteredTop3 = proposals
      .filter(p => p.evaluation_rank !== null && p.evaluation_rank !== undefined && p.evaluation_rank <= 3)
      .sort((a, b) => (a.evaluation_rank || 999) - (b.evaluation_rank || 999))
      .slice(0, 3);

    if (filteredTop3.length === 0) return { radarChartData: null, top3: [] };

    const maxPrice = Math.max(...proposals.map(p => p.price));
    const maxTimeline = Math.max(...proposals.map(p => p.timeline_days));

    // Transform data for radar chart (each proposal is a separate series)
    const categories = ['Price', 'Timeline', 'AI Score', 'Experience', 'Quality'];
    const transformedData = categories.map(category => {
      const result: any = { category };
      filteredTop3.forEach((proposal) => {
        const evalData = proposal.evaluation_result;
        let value = 0;
        switch (category) {
          case 'Price':
            value = Math.round((1 - proposal.price / maxPrice) * 100);
            break;
          case 'Timeline':
            value = Math.round((1 - proposal.timeline_days / maxTimeline) * 100);
            break;
          case 'AI Score':
            value = proposal.evaluation_score || 0;
            break;
          case 'Experience':
            value = evalData?.analysis?.experience_assessment ? 75 : 50;
            break;
          case 'Quality':
            value = evalData?.analysis?.scope_quality ? 80 : 50;
            break;
        }
        result[proposal.supplier_name] = value;
      });
      return result;
    });
    
    return { radarChartData: transformedData, top3: filteredTop3 };
  }, [proposals]);

  if (barChartData.length === 0) {
    return null;
  }

  const chartConfig = {
    score: {
      label: 'AI Score',
      color: 'hsl(var(--chart-1))',
    },
    price: {
      label: 'Price (thousands ILS)',
      color: 'hsl(var(--chart-2))',
    },
    timeline: {
      label: 'Timeline (days)',
      color: 'hsl(var(--chart-3))',
    },
  };

  return (
    <div className="space-y-6 mt-6" dir="rtl">
      {/* Bar Chart - AI Scores */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">AI Scores Comparison</h3>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={barChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis domain={[0, 100]} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey="score" 
              fill="var(--color-score)" 
              radius={[4, 4, 0, 0]}
              name="AI Score"
            />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Radar Chart - Top 3 Proposals */}
      {radarChartData && radarChartData.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Top 3 Proposals - Multi-Dimensional Comparison</h3>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <RadarChart data={radarChartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {top3.map((proposal, index) => {
                const colors = ['#8884d8', '#82ca9d', '#ffc658'];
                return (
                  <Radar
                    key={index}
                    dataKey={proposal.supplier_name}
                    stroke={colors[index]}
                    fill={colors[index]}
                    fillOpacity={0.3}
                    name={proposal.supplier_name}
                  />
                );
              })}
            </RadarChart>
          </ChartContainer>
        </div>
      )}

      {/* Price vs Timeline Scatter (simplified as bar chart) */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Price vs Timeline</h3>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={barChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis yAxisId="left" orientation="left" label={{ value: 'Price (K ILS)', angle: -90 }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Timeline (days)', angle: 90 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar yAxisId="left" dataKey="price" fill="var(--color-price)" name="Price (K ILS)" />
            <Bar yAxisId="right" dataKey="timeline" fill="var(--color-timeline)" name="Timeline (days)" />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
};

