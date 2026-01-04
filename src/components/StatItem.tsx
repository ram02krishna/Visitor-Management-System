import React from 'react';
import { TrendingUp } from 'lucide-react';

export type StatItemProps = {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  status?: string;
  onClick: (status: string) => void;
};

export const StatItem = React.memo(({ name, value, icon: Icon, color, status, onClick }: StatItemProps) => {
  // Map colors to gradient backgrounds
  const getGradientClass = () => {
    if (color.includes('green')) return 'bg-gradient-to-br from-emerald-500 to-green-600';
    if (color.includes('yellow')) return 'bg-gradient-to-br from-amber-500 to-orange-600';
    if (color.includes('indigo')) return 'bg-gradient-to-br from-indigo-500 to-purple-600';
    if (color.includes('red')) return 'bg-gradient-to-br from-red-500 to-rose-600';
    return 'bg-gradient-to-br from-sky-500 to-blue-600';
  };

  const getShadowClass = () => {
    if (color.includes('green')) return 'shadow-emerald-500/20';
    if (color.includes('yellow')) return 'shadow-amber-500/20';
    if (color.includes('indigo')) return 'shadow-indigo-500/20';
    if (color.includes('red')) return 'shadow-red-500/20';
    return 'shadow-sky-500/20';
  };

  return (
    <div
      key={name}
      className={`glass rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group animate-fadeInUp ${
        status ? 'cursor-pointer' : ''
      }`}
      onClick={() => status && onClick(status)}
      aria-label={status ? `View ${name.toLowerCase()}` : undefined}
      tabIndex={status ? 0 : undefined}
    >
      <div className="p-6">
        <div className="flex items-center">
          <div className={`p-4 rounded-2xl ${getGradientClass()} shadow-lg ${getShadowClass()} transition-all duration-300`}>
            <Icon className="h-7 w-7 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">{name}</h3>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-slate-100 transition-transform duration-300">{value}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-2 bg-gray-50/50 dark:bg-slate-800/50 rounded-b-2xl border-t border-gray-100 dark:border-slate-600">
        <div className="flex items-center text-xs text-gray-500 dark:text-slate-400">
          <TrendingUp className="h-3 w-3 mr-1 transition-colors duration-300" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
});
