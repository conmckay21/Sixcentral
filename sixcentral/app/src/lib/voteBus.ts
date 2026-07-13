/**
 * Tiny in-app pub-sub so a vote in the article reader updates every card on
 * the home screen the instant you swipe back, without waiting on the content
 * API's cache window. The reader emits, home subscribes and patches its rails.
 */
type Counts = { up: number; down: number };
type Listener = (slug: string, counts: Counts) => void;

const listeners = new Set<Listener>();

export const voteBus = {
  emit(slug: string, counts: Counts) {
    listeners.forEach((l) => l(slug, counts));
  },
  on(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
