export type GameToastTone = "success" | "info" | "warning" | "error";

export type GameToast = {
  id: string;
  tone: GameToastTone;
  title: string;
  message?: string;
  ttlMs: number;
};

export function addToast(queue: GameToast[], toast: GameToast, max = 3) {
  return [toast, ...queue.filter((item) => item.id !== toast.id)].slice(0, max);
}

export function dismissToast(queue: GameToast[], id: string) {
  return queue.filter((toast) => toast.id !== id);
}
