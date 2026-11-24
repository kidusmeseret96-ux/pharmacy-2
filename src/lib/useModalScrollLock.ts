import { useEffect } from 'react';

function findScrollableInside(overlay: HTMLElement, target: EventTarget | null): HTMLElement | null {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== overlay) {
    const style = window.getComputedStyle(node);
    const canScrollY =
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight + 1;
    if (canScrollY) {
      return node;
    }
    node = node.parentElement;
  }

  // Cursor wasn't over a scrollable child inside the modal (e.g., over the backdrop or header):
  // find the primary scrollable container inside this modal/menu overlay.
  const candidates = overlay.querySelectorAll<HTMLElement>(
    '.yoya-scroll-contain, [class*="overflow-y-auto"], [class*="overflow-y-scroll"]'
  );
  for (const el of candidates) {
    if (el.scrollHeight > el.clientHeight + 1) {
      return el;
    }
  }

  if (overlay.scrollHeight > overlay.clientHeight + 1) {
    return overlay;
  }
  return null;
}

/**
 * Global modal & drawer scroll isolation:
 * 1) Locks document root/body scroll whenever any .fixed.inset-0.z-50 overlay is mounted.
 * 2) Auto-focuses newly opened overlays (preventScroll) so keyboard/trackpad scroll targets the modal immediately.
 * 3) Routes wheel scrolling anywhere on screen exclusively to the active overlay, never the page behind it.
 */
export function useModalScrollLock() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let lastFocusedOverlay: HTMLElement | null = null;

    const syncLock = () => {
      const overlays = document.querySelectorAll<HTMLElement>('.fixed.inset-0.z-50');
      const hasOverlay = overlays.length > 0;
      document.documentElement.classList.toggle('yoya-scroll-locked', hasOverlay);
      document.body.classList.toggle('yoya-scroll-locked', hasOverlay);

      if (hasOverlay) {
        const topOverlay = overlays[overlays.length - 1];
        if (topOverlay !== lastFocusedOverlay) {
          lastFocusedOverlay = topOverlay;
          const activeEl = document.activeElement;
          if (!activeEl || !topOverlay.contains(activeEl)) {
            const focusTarget =
              topOverlay.querySelector<HTMLElement>('[tabindex="-1"], .yoya-modal-panel, .yoya-scroll-contain') ??
              topOverlay;
            if (!focusTarget.hasAttribute('tabindex')) {
              focusTarget.setAttribute('tabindex', '-1');
            }
            focusTarget.focus({ preventScroll: true });
          }
        }
      } else {
        lastFocusedOverlay = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const overlays = document.querySelectorAll<HTMLElement>('.fixed.inset-0.z-50');
      if (overlays.length === 0) return;

      const topOverlay = overlays[overlays.length - 1];
      const scroller = findScrollableInside(topOverlay, e.target);

      if (!scroller) {
        e.preventDefault();
        return;
      }

      // If pointer is outside the scroller (e.g. on the dimmed backdrop or sticky modal header),
      // forward the wheel delta directly into the modal's scrollable area without requiring a click.
      const targetNode = e.target instanceof Node ? e.target : null;
      const insideScroller = targetNode ? scroller.contains(targetNode) : false;

      if (!insideScroller) {
        e.preventDefault();
        scroller.scrollTop += e.deltaY;
        return;
      }

      // Inside scroller: prevent wheel chaining to the background document at top/bottom bounds
      const atTop = scroller.scrollTop <= 0 && e.deltaY < 0;
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 && e.deltaY > 0;
      if (atTop || atBottom) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const overlays = document.querySelectorAll<HTMLElement>('.fixed.inset-0.z-50');
      if (overlays.length === 0) return;

      const topOverlay = overlays[overlays.length - 1];
      const scroller = findScrollableInside(topOverlay, e.target);
      const targetNode = e.target instanceof Node ? e.target : null;
      if (!scroller || (targetNode && !scroller.contains(targetNode))) {
        e.preventDefault();
      }
    };

    syncLock();
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      document.documentElement.classList.remove('yoya-scroll-locked');
      document.body.classList.remove('yoya-scroll-locked');
    };
  }, []);
}
