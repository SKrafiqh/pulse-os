"use client";

import { Trash, Warning, ArrowsClockwise } from "@phosphor-icons/react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  machineName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  machineName,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md double-bezel-outer shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="double-bezel-inner p-6 sm:p-7 space-y-6 bg-white">
          {/* Header Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0 shadow-xs">
              <Warning size={26} weight="bold" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Delete Machine Node
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-bold text-slate-900 font-mono-data">
                  &quot;{machineName}&quot;
                </span>
                ? All historical resource telemetry will be permanently removed.
              </p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span>This action cannot be undone.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold active:scale-95 transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isDeleting ? (
                <ArrowsClockwise size={16} className="animate-spin text-white" />
              ) : (
                <Trash size={16} weight="bold" />
              )}
              <span>{isDeleting ? "Deleting Node..." : "Delete Machine"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
