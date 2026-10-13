import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';
import { clsx } from 'clsx';
import { useReducedMotion } from '../../lib/motion';

export default function Accordion({ items = [], className = '' }) {
  const [open, setOpen] = useState(null);
  const prefersReduced = useReducedMotion();

  return (
    <div className={clsx('space-y-3', className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const id = `acc-${i}`;
        return (
          <div
            key={id}
            className={clsx('card overflow-hidden transition-colors duration-200', isOpen && 'border-brand/30')}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`${id}-panel`}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-bold text-white">{item.title}</span>
              <FaChevronDown
                className={clsx(
                  'h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200',
                  isOpen && 'rotate-180 text-brand'
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                // Height is animated, not just opacity. The panel used to fade
                // in while the rest of the list snapped to its new position,
                // so opening a question made everything below it jump. With
                // the height in the tween the items beneath slide down and the
                // whole FAQ reads as one document.
                <motion.div
                  id={`${id}-panel`}
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: prefersReduced ? 0 : 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-400">{item.content}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}