import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Lock, Unlock, Loader2, Edit, AlertTriangle } from "lucide-react";
import { customerService } from "@/services/customerService";

export function CustomerActions({ customer, onActionComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null); // "freeze" | "unfreeze"
  const [error, setError] = useState(null);
  
  const menuRef = useRef(null);

  const isFrozen = customer.is_active === false;

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirm = async () => {
    setError(null);
    setIsPending(true);
    
    try {
      await customerService.toggleCustomerStatus(customer.id, actionType !== "freeze");
      setDialogOpen(false);
      setIsOpen(false);
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setError(err.message || "Failed to perform action");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 sm:w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10">
          <Link
            to={`/customer/${customer.id}`}
            className="w-full text-left px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            onClick={() => setIsOpen(false)}
          >
            <Edit size={13} className="sm:w-3.5 sm:h-3.5" /> Edit
          </Link>
          
          <button 
            className="w-full text-left px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
            onClick={() => {
              setActionType(isFrozen ? "unfreeze" : "freeze");
              setDialogOpen(true);
              setIsOpen(false);
            }}
          >
            {isFrozen ? (
              <><Unlock size={13} className="text-green-600 sm:w-3.5 sm:h-3.5" /> <span className="text-green-600 font-medium">Unfreeze Account</span></>
            ) : (
              <><Lock size={13} className="text-red-600 sm:w-3.5 sm:h-3.5" /> <span className="text-red-600 font-medium">Freeze Account</span></>
            )}
          </button>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3 text-red-600">
                <AlertTriangle size={20} className="shrink-0 sm:w-[22px] sm:h-[22px]" />
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900">
                  {actionType === "freeze" ? "Freeze Account" : "Unfreeze Account"}
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] md:text-sm text-slate-600 mb-2">
                Are you sure you want to {actionType} the account for <strong className="text-slate-900">{customer.company_name || customer.name}</strong>?
              </p>
              {actionType === "freeze" && (
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-500">
                  The customer will lose access to the portal immediately.
                </p>
              )}
              {error && (
                <div className="mt-3 p-2.5 sm:p-3 bg-red-50 text-red-700 text-xs sm:text-[13px] font-medium rounded-lg border border-red-100">
                  {error}
                </div>
              )}
            </div>
            <div className="px-4 sm:px-6 py-2.5 sm:py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 sm:gap-3">
              <button 
                onClick={() => setDialogOpen(false)} 
                disabled={isPending}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isPending}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 cursor-pointer ${
                  actionType === "freeze" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {actionType === "freeze" ? "Yes, Freeze" : "Yes, Unfreeze"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
