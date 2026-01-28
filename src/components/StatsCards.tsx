import React from 'react';
import { FileKey, FileQuestion, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardsProps {
  envKeyCount: number;
  exampleKeyCount: number;
  missingInExampleCount: number;
  missingInLocalCount: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  envKeyCount,
  exampleKeyCount,
  missingInExampleCount,
  missingInLocalCount,
}) => {
  const stats = [
    {
      label: 'Keys in .env',
      value: envKeyCount,
      icon: FileKey,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Keys in .env.example',
      value: exampleKeyCount,
      icon: FileQuestion,
      color: 'text-secondary-foreground',
      bgColor: 'bg-secondary/50',
    },
    {
      label: 'Missing in Example',
      value: missingInExampleCount,
      icon: missingInExampleCount > 0 ? AlertCircle : CheckCircle,
      color: missingInExampleCount > 0 ? 'text-warning' : 'text-success',
      bgColor: missingInExampleCount > 0 ? 'bg-warning/10' : 'bg-success/10',
    },
    {
      label: 'Missing in Local',
      value: missingInLocalCount,
      icon: missingInLocalCount > 0 ? AlertCircle : CheckCircle,
      color: missingInLocalCount > 0 ? 'text-destructive' : 'text-success',
      bgColor: missingInLocalCount > 0 ? 'bg-destructive/10' : 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`${stat.bgColor} rounded-lg border border-border p-4`}
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground font-medium">
              {stat.label}
            </span>
          </div>
          <p className={`text-2xl font-display font-bold ${stat.color}`}>
            {stat.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;
