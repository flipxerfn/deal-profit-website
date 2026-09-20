import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../lib/motion';

export function Dialog({ open, onOpenChange, className = '', children, ...props }) {
  const prefersReduced = useReducedMotion();
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: prefersReduced ? 0 : 0.2 },
  };

  const contentVariants = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { duration: prefersReduced ? 0 : 0.2, ease: 'easeOut' },
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <AnimatePresence>
        <motion.div
          ref={contentRef}
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={clsx(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-2xl border border-white/10 bg-charcoal p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]',
            className
          )}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </AnimatePresence>,
    document.body
  );
}

export function DialogTrigger({ asChild, children, onClick, ...props }) {
  if (asChild) {
    return React.cloneElement(children, { onClick: (e) => { children.props.onClick?.(e); onClick?.(e); } });
  }
  return <button onClick={onClick} {...props}>{children}</button>;
}

export function DialogContent({ className = '', children, ...props }) {
  return <div className={clsx('', className)} {...props}>{children}</div>;
}

export function DialogHeader({ className = '', children, ...props }) {
  return <div className={clsx('mb-4', className)} {...props}>{children}</div>;
}

export function DialogTitle({ className = '', children, ...props }) {
  return <h2 className={clsx('text-lg font-extrabold text-white', className)} {...props}>{children}</h2>;
}

export function DialogDescription({ className = '', children, ...props }) {
  return <p className={clsx('mt-1 text-sm text-zinc-400', className)} {...props}>{children}</p>;
}

export function DialogFooter({ className = '', children, ...props }) {
  return <div className={clsx('mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end', className)} {...props}>{children}</div>;
}

export function DialogClose({ className = '', children, onClick, ...props }) {
  return (
    <button
      className={clsx('absolute right-4 top-4 rounded p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5', className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

export default Dialog;