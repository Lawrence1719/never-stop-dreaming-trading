import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

interface ToastProps extends ToastMessage {
  onClose: (id: string) => void;
}

export function Toast({ id, message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[type];

  const Icon = type === "success" ? CheckCircle : AlertCircle;

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1 text-sm">{message}</span>
      <button onClick={() => onClose(id)} className="flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: ToastMessage[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" = "info", duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
}
