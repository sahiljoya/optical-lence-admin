import { CheckCircle2, Clock, AlertCircle, Lock } from "lucide-react";

export function StatusPill({ status }) {
  if (status === "active" || status === "delivered") return <span className="vw-pill" style={{ background: "var(--p-delivered-bg)", color: "var(--p-delivered)" }}><CheckCircle2 size={12} className="mr-1 inline" />{status === "active" ? "Active" : "Delivered"}</span>;
  if (status === "pending_approval") return <span className="vw-pill" style={{ background: "var(--p-pending-bg)", color: "var(--p-pending)" }}><Clock size={12} className="mr-1 inline" />Pending Approval</span>;
  if (status === "pending" || status === "onroute") return <span className="vw-pill" style={{ background: "var(--p-pending-bg)", color: "var(--p-pending)" }}><Clock size={12} className="mr-1 inline" />{status === "pending" ? "Pending" : "On route"}</span>;
  if (status === "process") return <span className="vw-pill" style={{ background: "var(--p-pending-bg)", color: "var(--p-pending)" }}><Clock size={12} className="mr-1 inline" />Loaded</span>;
  if (status === "packed") return <span className="vw-pill" style={{ background: "var(--p-pending-bg)", color: "var(--p-pending)" }}><Clock size={12} className="mr-1 inline" />Packed</span>;
  if (status === "frozen") return <span className="vw-pill" style={{ background: "var(--pink-box)", color: "var(--p-overdue)" }}><Lock size={12} className="mr-1 inline" />Frozen</span>;
  if (status === "rejected") return <span className="vw-pill" style={{ background: "var(--p-overdue-bg)", color: "var(--p-overdue)" }}><AlertCircle size={12} className="mr-1 inline" />Rejected</span>;
  return <span className="vw-pill" style={{ background: "var(--p-overdue-bg)", color: "var(--p-overdue)" }}><AlertCircle size={12} className="mr-1 inline" />{status === "hold" ? "Hold" : "Overdue"}</span>;
}
