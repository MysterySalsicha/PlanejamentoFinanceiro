// src/components/ui/FloatingActionButton.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Plus, FileText, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FABProps {
  onNewTransaction: () => void;
  onImport: () => void;
}

export const FloatingActionButton = ({ onNewTransaction, onImport }: FABProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const subButtonVariants: Variants = {
    open: (i: number) => ({
      y: -60 * (i + 1),
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    }),
    closed: {
      y: 0,
      opacity: 0,
      transition: { type: 'spring', stiffness: 500, damping: 30 },
    },
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              custom={1}
              variants={subButtonVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="absolute bottom-0 right-0"
              onClick={onImport}
            >
              <div className="flex items-center gap-2 cursor-pointer group">
                  <span className="bg-white text-xs px-2 py-1 rounded shadow-md hidden group-hover:block">Importar</span>
                  <Button className="w-12 h-12 rounded-full shadow-lg bg-green-500 hover:bg-green-600">
                    <FileText />
                  </Button>
              </div>
            </motion.div>
            <motion.div
              custom={0}
              variants={subButtonVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="absolute bottom-0 right-0"
              onClick={onNewTransaction}
            >
                <div className="flex items-center gap-2 cursor-pointer group">
                    <span className="bg-white text-xs px-2 py-1 rounded shadow-md hidden group-hover:block">Novo Lançamento</span>
                    <Button className="w-12 h-12 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600">
                        <FilePlus />
                    </Button>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full shadow-2xl bg-slate-800 hover:bg-slate-700"
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }}>
          <Plus size={28} />
        </motion.div>
      </Button>
    </div>
  );
};
