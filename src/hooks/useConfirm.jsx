import { useState, useCallback } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

// Promise-based replacement for window.confirm(), so call sites can keep the same
// "if (!(await confirm(...))) return;" shape but get a real popup with working Accept/Reject
// buttons instead of the native browser dialog.
//
// Usage:
//   const { confirm, confirmDialog } = useConfirm();
//   const handleDelete = async () => {
//     const ok = await confirm("Delete this item? This cannot be undone.", { title: "Delete", acceptLabel: "Delete", danger: true });
//     if (!ok) return;
//     ...
//   };
//   return (<>...{confirmDialog}</>);
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setState({ message, ...options, resolve });
    });
  }, []);

  const handleAccept = () => {
    state.resolve(true);
    setState(null);
  };
  const handleReject = () => {
    state.resolve(false);
    setState(null);
  };

  const confirmDialog = state ? (
    <ConfirmDialog
      title={state.title}
      message={state.message}
      acceptLabel={state.acceptLabel}
      rejectLabel={state.rejectLabel}
      danger={state.danger}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  ) : null;

  return { confirm, confirmDialog };
}
