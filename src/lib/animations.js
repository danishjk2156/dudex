/**
 * Micro-Animations Helper Module (UI/UX Enterprise POS Edition)
 * Provides pure visual polish while adhering to accessibility & reduced-motion preferences:
 * 1. Staggered Page Load for metric cards, catalog grids, and lists
 * 2. Thermal Receipt Ejection with clip-path downwards reveal
 * 3. Tactile Button & Card spring click feedback
 * Zero external dependencies (uses native Web Animations API with clean fallbacks).
 */

const prefersReducedMotion = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
};

/**
 * Staggered entrance animation for cards, metrics, and catalog grids
 * @param {string|Element|Element[]|NodeList} targets - CSS selector or DOM elements
 * @param {object} options - Custom options (duration, stagger, delay)
 */
export const animateStaggerEntrance = (targets, options = {}) => {
  if (prefersReducedMotion() || typeof window === 'undefined') return;

  try {
    let elements = [];
    if (typeof targets === 'string') {
      elements = Array.from(document.querySelectorAll(targets));
    } else if (targets instanceof NodeList || Array.isArray(targets)) {
      elements = Array.from(targets);
    } else if (targets && targets.nodeType === 1) {
      elements = [targets];
    }

    if (!elements.length) return;

    const yOffset = options.y !== undefined ? options.y : 14;
    const duration = (options.duration || 0.38) * 1000;
    const stagger = (options.stagger !== undefined ? options.stagger : 0.04) * 1000;
    const baseDelay = (options.delay || 0.02) * 1000;

    elements.forEach((el, index) => {
      if (!el || !el.animate) return;
      el.animate(
        [
          { opacity: 0, transform: `translateY(${yOffset}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration,
          delay: baseDelay + index * stagger,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'both',
        }
      );
    });
  } catch (e) {
    console.debug('Entrance animation skipped:', e);
  }
};

/**
 * Thermal Receipt Ejection: Animates receipt paper sliding vertically out of an invisible slot
 * with a downwards clip-path reveal.
 * @param {Element} receiptEl - The thermal receipt paper container
 * @param {Element} slotEl - Optional slot indicator element
 */
export const animateReceiptEjection = (receiptEl, slotEl = null) => {
  if (prefersReducedMotion() || !receiptEl || !receiptEl.animate) return;

  try {
    if (slotEl && slotEl.animate) {
      slotEl.animate(
        [
          { transform: 'scaleX(0.85)', opacity: 0.6 },
          { transform: 'scaleX(1)', opacity: 1 },
        ],
        {
          duration: 200,
          easing: 'ease-out',
        }
      );
    }

    receiptEl.animate(
      [
        {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
          transform: 'translateY(-24px)',
          opacity: 0.85,
        },
        {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          transform: 'translateY(0)',
          opacity: 1,
        },
      ],
      {
        duration: 520,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards',
      }
    );
  } catch (e) {
    console.debug('Receipt ejection animation skipped:', e);
  }
};

/**
 * Tactile Button & Card click feedback
 * @param {Event|Element} targetOrEvent
 */
export const animateTactilePress = (targetOrEvent) => {
  if (prefersReducedMotion()) return;
  const el = targetOrEvent?.currentTarget || targetOrEvent;
  if (!el || !el.animate) return;

  try {
    el.animate(
      [
        { transform: 'scale(0.975)' },
        { transform: 'scale(1)' },
      ],
      {
        duration: 180,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    );
  } catch (e) {
    console.debug('Tactile press animation skipped:', e);
  }
};
