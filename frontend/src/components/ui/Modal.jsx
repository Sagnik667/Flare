import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus first element ONLY when the modal transitions to open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      
      const focusableElementsString = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const modalElement = modalRef.current;
      
      if (modalElement) {
        const focusableElements = modalElement.querySelectorAll(focusableElementsString);
        if (focusableElements.length > 0) {
          // Focus the first element (or close button)
          focusableElements[0].focus();
        }
      }

      return () => {
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  // Handle ESC, Tab loops, and scroll locking while open
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusableElementsString = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
          const focusableElements = modalRef.current.querySelectorAll(focusableElementsString);
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={`relative w-full ${sizes[size]} bg-bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 id="modal-title" className="text-lg font-bold text-text-primary">
                {title}
              </h3>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-bg-raised transition-colors focus:ring-1 focus:ring-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[70vh] text-left">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
