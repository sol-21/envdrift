import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlyingKey {
  id: string;
  key: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface FlyingKeysAnimationProps {
  keys: FlyingKey[];
  onComplete: () => void;
}

const FlyingKeysAnimation: React.FC<FlyingKeysAnimationProps> = ({
  keys,
  onComplete,
}) => {
  const [completedCount, setCompletedCount] = React.useState(0);

  React.useEffect(() => {
    if (completedCount >= keys.length && keys.length > 0) {
      onComplete();
    }
  }, [completedCount, keys.length, onComplete]);

  return (
    <AnimatePresence>
      {keys.map((flyingKey, index) => (
        <motion.div
          key={flyingKey.id}
          initial={{
            position: 'fixed',
            left: flyingKey.startX,
            top: flyingKey.startY,
            opacity: 1,
            scale: 1,
            zIndex: 1000,
          }}
          animate={{
            left: flyingKey.endX,
            top: flyingKey.endY,
            opacity: [1, 1, 0],
            scale: [1, 1.2, 0.8],
          }}
          transition={{
            duration: 0.8,
            delay: index * 0.1,
            ease: [0.22, 1, 0.36, 1],
          }}
          onAnimationComplete={() => setCompletedCount((c) => c + 1)}
          className="pointer-events-none"
        >
          <div className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold shadow-lg glow-primary">
            {flyingKey.key}
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

export default FlyingKeysAnimation;
