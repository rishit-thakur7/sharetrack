import React from 'react';
import { motion } from 'framer-motion';

const PremiumCard = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 },
        borderColor: 'rgba(255,255,255,0.2)'
      }}
      className={`bg-zinc-800/20 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default PremiumCard;