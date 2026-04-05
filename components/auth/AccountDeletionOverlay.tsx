"use client";

import { useAuth } from "@/lib/context/auth-context";
import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, RefreshCcw, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function AccountDeletionOverlay() {
  const { user, isDeletionPending, restoreAccount, logout } = useAuth();
  const [isRestoring, setIsRestoring] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (user?.deleted_at) {
      const deletionDate = new Date(user.deleted_at);
      const expiryDate = new Date(deletionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays > 0 ? diffDays : 0);
    }
  }, [user]);

  if (!isDeletionPending || !user) return null;

  const handleRestore = async () => {
    setIsRestoring(true);
    const { error } = await restoreAccount();
    setIsRestoring(false);

    if (error) {
      toast.error(error.message || "Failed to restore account");
    } else {
      toast.success("Welcome back! Your account has been restored.");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-amber-500/10 rounded-full">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Account Deletion Pending</h2>
        <p className="text-slate-400 mb-6">
          Your account is scheduled for permanent deletion in{" "}
          <span className="text-amber-500 font-bold">{daysRemaining} days</span>. 
          Access to most features is currently restricted.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isRestoring ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCcw className="w-5 h-5" />
            )}
            Restore My Account
          </button>

          <button
            onClick={() => logout()}
            className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          If you take no action, all your personal data will be anonymized or removed automatically on the 30th day.
        </p>
      </div>
    </div>
  );
}
