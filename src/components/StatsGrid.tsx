import React from "react";
import { StatItem, StatItemProps } from "./StatItem";

type StatsGridProps = {
  stats: Omit<StatItemProps, "onClick" | "onMouseEnter">[];
  handleStatCardClick: (status: string) => void;
  handlePrefetch: (status: string) => void;
};

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, handleStatCardClick, handlePrefetch }) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {stats.map((stat, index) => (
        <StatItem
          key={stat.name}
          {...stat}
          onClick={handleStatCardClick}
          onMouseEnter={handlePrefetch}
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
  );
};
