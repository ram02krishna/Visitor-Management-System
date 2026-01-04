import React from 'react';
import { StatItem, StatItemProps } from './StatItem';

type StatsGridProps = {
  stats: Omit<StatItemProps, 'onClick' | 'onViewDetails'>[];
  handleStatCardClick: (status: string) => void;
};

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, handleStatCardClick }) => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={stat.name} style={{ animationDelay: `${index * 0.1}s` }}>
          <StatItem {...stat} onClick={() => stat.status && handleStatCardClick(stat.status)} />
        </div>
      ))}
    </div>
  );
};
