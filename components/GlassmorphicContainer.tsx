import React from 'react';
import { motion } from 'framer-motion';

interface GlassmorphicContainerProps {
  children: React.ReactNode;
  className?: string;
  blurIntensity?: 'light' | 'medium' | 'heavy';
  opacity?: number;
  animated?: boolean;
  hoverEffect?: boolean;
}

export const GlassmorphicContainer: React.FC<GlassmorphicContainerProps> = ({
  children,
  className = '',
  blurIntensity = 'heavy',
  opacity = 0.05,
  animated = true,
  hoverEffect = true,
}) => {
  const blurClasses = {
    light: 'backdrop-blur-sm',
    medium: 'backdrop-blur-xl',
    heavy: 'backdrop-blur-3xl',
  };

  const baseClasses = `
    ${blurClasses[blurIntensity]}
    bg-white/${Math.round(opacity * 100)}
    border border-white/10
    shadow-2xl shadow-black/50
    rounded-2xl
    relative
    overflow-hidden
    transition-all duration-300
    ${hoverEffect ? 'hover:bg-white/10 hover:border-white/20 hover:shadow-white/5' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const Container = animated ? motion.div : 'div';

  return (
    <Container className={baseClasses}>
      {animated && (
        <motion.div
          animate={{
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"
        />
      )}
      <div className="relative z-10">{children}</div>
    </Container>
  );
};
