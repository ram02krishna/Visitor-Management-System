import { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { subDays } from "date-fns";

type ChartData = {
  date: string;
  visits: number;
};

export function VisitsChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitData = async () => {
      setLoading(true);
      const today = new Date();
      const sevenDaysAgo = subDays(today, 7);

      const { data, error } = await supabase
        .from("visits")
        .select("created_at")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) {
        console.error("Error fetching visit data:", error);
        setChartData([]);
        setLoading(false);
        return;
      }

      const dailyCounts = data.reduce((acc: { [key: string]: number }, visit) => {
        const date = new Date(visit.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const formattedData = Object.entries(dailyCounts)
        .map(([date, visits]) => ({
          date,
          visits,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setChartData(formattedData);
      setLoading(false);
    };

    fetchVisitData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Visits</CardTitle>
        <CardDescription>Number of visits in the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading chart...</div>
        ) : (
          <ChartContainer
            config={{
              visits: {
                label: "Visits",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="min-h-[200px] w-full"
          >
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
