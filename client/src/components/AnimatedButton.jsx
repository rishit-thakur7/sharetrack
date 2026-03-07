import React from 'react';
import { motion } from 'framer-motion';

const AnimatedButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  className = '',
  disabled = false,
  icon = null
}) => {
  const baseClasses = "relative overflow-hidden group rounded-xl font-semibold transition-all duration-300 px-6 py-3";
  
  const variants = {
    primary: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700',
    secondary: 'bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:bg-zinc-700/50',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
  };

  const disabledClasses = 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-800';

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${className} ${
        disabled ? disabledClasses : variants[variant] || variants.primary
      }`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {icon && <span className="w-5 h-5">{icon}</span>}
        {children}
      </span>
      {!disabled && variant === 'primary' && (
        <motion.div
          className="absolute inset-0 bg-zinc-600 opacity-0 group-hover:opacity-20"
          initial={{ x: '-100%' }}
          whileHover={{ x: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );
};

export default AnimatedButton;