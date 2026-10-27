import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Truck,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Save,
  RefreshCw,
  FileText,
  Search,
  Edit3,
  X,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Building2,
  Package,
  History,
  ChevronRight,
  ExternalLink,
  Info,
  Plus
} from "lucide-react";
import { notify } from "@/lib/notify";
import { courierService } from "@/services/courierService";
import { AddCourierModal } from "@/components/settings/AddCourierModal";
import "@/styles/veriwide.css";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function CourierReconciliation() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedCourier, setSelectedCourier] = useState("DTDC");
  const [couriers, setCouriers] = useState([]);

  // Data State
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);

  // Reconciliation Form State (Staff inputs from physical/PDF courier bill)
  const [courierInvoiceNumber, setCourierInvoiceNumber] = useState("");
  const [courierBilledWeight, setCourierBilledWeight] = useState("");
  const [courierBilledAmount, setCourierBilledAmount] = useState("");
  const [reconcileStatus, setReconcileStatus] = useState("PENDING_AUDIT");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Rate & Partner Modals
  const [showRateModal, setShowRateModal] = useState(false);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [ratePerKg, setRatePerKg] = useState(0);
  const [rateHalfKg, setRateHalfKg] = useState(0);
  const [savingRate, setSavingRate] = useState(false);

  // UI Tabs & Filters
  const [activeTab, setActiveTab] = useState("breakdown"); // "breakdown" | "shipments" | "history"
  const [searchQuery, setSearchQuery] = useState("");

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch Courier List on Mount
  useEffect(() => {
    fetchCouriers();
  }, []);

  // Fetch Monthly Data whenever Courier, Month, or Year changes
  useEffect(() => {
    if (selectedCourier) {
      fetchMonthlySummary();
    }
  }, [selectedCourier, selectedMonth, selectedYear]);

  // Fetch History when tab switched to history
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchCouriers = async () => {
    try {
      const res = await courierService.getCouriers();
      if (res && Array.isArray(res) && res.length > 0) {
        setCouriers(res);
        if (!selectedCourier) {
          setSelectedCourier(res[0].name);
        }
      } else {
        // Fallback default couriers from Section 11
        setCouriers([
          { _id: "c1", name: "DTDC", rate_per_kg: 60, rate_half_kg: 35 },
          { _id: "c2", name: "Blue Dart", rate_per_kg: 90, rate_half_kg: 50 },
          { _id: "c3", name: "S R Courier", rate_per_kg: 50, rate_half_kg: 30 },
          { _id: "c4", name: "Delhivery", rate_per_kg: 70, rate_half_kg: 40 },
        ]);
      }
    } catch (err) {
      console.error("Error fetching couriers:", err);
      setCouriers([
        { _id: "c1", name: "DTDC", rate_per_kg: 60, rate_half_kg: 35 },
        { _id: "c2", name: "Blue Dart", rate_per_kg: 90, rate_half_kg: 50 },
        { _id: "c3", name: "S R Courier", rate_per_kg: 50, rate_half_kg: 30 },
      ]);
    }
  };

  const fetchMonthlySummary = async () => {
    setLoading(true);
    try {
      const res = await courierService.getMonthlySummary(selectedCourier, selectedMonth, selectedYear);
      const data = res?.data || res;
      setSummaryData(data);

      // Populate courier rate inputs
      const currentCourier = data?.courier;
      setRatePerKg(currentCourier?.rate_per_kg || 0);
      setRateHalfKg(currentCourier?.rate_half_kg || 0);

      // Populate existing reconciliation if already audited
      if (data?.reconciliation) {
        const rec = data.reconciliation;
        setCourierInvoiceNumber(rec.courier_invoice_number || "");
        setCourierBilledWeight(rec.courier_billed_weight_kg ? String(rec.courier_billed_weight_kg) : "");
        setCourierBilledAmount(rec.courier_billed_amount ? String(rec.courier_billed_amount) : "");
        setReconcileStatus(rec.status || "PENDING_AUDIT");
        setNotes(rec.notes || "");
      } else {
        setCourierInvoiceNumber("");
        setCourierBilledWeight("");
        setCourierBilledAmount("");
        setReconcileStatus("PENDING_AUDIT");
        setNotes("");
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      notify.error(err.message || "Failed to load monthly courier summary.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await courierService.getReconciliationHistory();
      const list = res?.data || res;
      setHistoryList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching history:", err);
      notify.error("Failed to load reconciliation history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Calculations
  const systemOrdersCount = summaryData?.summary?.total_orders || 0;
  const systemTotalWeight = summaryData?.summary?.total_weight_kg || 0;
  const systemExpectedAmount = summaryData?.summary?.expected_amount || 0;

  const billedWeightNum = parseFloat(courierBilledWeight) || 0;
  const billedAmountNum = parseFloat(courierBilledAmount) || 0;

  const diffWeight = billedWeightNum > 0 ? Math.round((billedWeightNum - systemTotalWeight) * 100) / 100 : 0;
  const diffAmount = billedAmountNum > 0 ? Math.round((billedAmountNum - systemExpectedAmount) * 100) / 100 : 0;

  // Auto-suggest status when staff enters invoice numbers
  const handleBilledAmountChange = (val) => {
    setCourierBilledAmount(val);
    const amt = parseFloat(val) || 0;
    const wt = parseFloat(courierBilledWeight) || 0;
    if (amt > 0 && wt > 0) {
      const dWeight = wt - systemTotalWeight;
      const dAmt = amt - systemExpectedAmount;
      if (dWeight > 0.5 || dAmt > 20) {
        setReconcileStatus("DISCREPANCY_FLAGGED");
      } else if (Math.abs(dWeight) <= 0.5 && Math.abs(dAmt) <= 20) {
        setReconcileStatus("RECONCILED");
      }
    }
  };

  const handleSaveReconciliation = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        courier_name: selectedCourier,
        month: Number(selectedMonth),
        year: Number(selectedYear),
        courier_invoice_number: courierInvoiceNumber.trim(),
        courier_billed_weight_kg: billedWeightNum,
        courier_billed_amount: billedAmountNum,
        system_orders_count: systemOrdersCount,
        system_total_weight_kg: systemTotalWeight,
        system_expected_amount: systemExpectedAmount,
        status: reconcileStatus,
        notes: notes.trim(),
      };

      await courierService.saveReconciliation(payload);
      notify.success(`Reconciliation audit for ${selectedCourier} saved successfully!`);
      // Refresh summary
      fetchMonthlySummary();
    } catch (err) {
      console.error("Error saving reconciliation:", err);
      notify.error(err.message || "Failed to save reconciliation audit.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    setSavingRate(true);
    try {
      const courierObj = couriers.find((c) => c.name.toLowerCase() === selectedCourier.toLowerCase());
      if (courierObj?._id) {
        await courierService.updateCourier(courierObj._id, {
          rate_per_kg: Number(ratePerKg) || 0,
          rate_half_kg: Number(rateHalfKg) || 0,
        });
      }
      notify.success(`Rates for ${selectedCourier} updated!`);
      setShowRateModal(false);
      fetchCouriers();
      fetchMonthlySummary();
    } catch (err) {
      console.error("Error updating rate:", err);
      notify.error(err.message || "Failed to update rates.");
    } finally {
      setSavingRate(false);
    }
  };

  // CSV Export for Courier Dispute
  const handleExportCSV = () => {
    const shipments = summaryData?.shipments || [];
    if (!shipments.length) {
      notify.warning("No shipment records to export for this month.");
      return;
    }

    const headers = ["Order Number", "Customer Name", "City", "Tracking / AWB", "Dispatched Date", "Boxes / Cartons", "Weight (Kg)", "Expected Cost (₹)", "Status"];
    const rows = shipments.map((s) => [
      `"${s.order_number || ""}"`,
      `"${s.customer_name || ""}"`,
      `"${s.city || ""}"`,
      `"${s.tracking_number || ""}"`,
      `"${s.shipped_date ? new Date(s.shipped_date).toLocaleDateString("en-IN") : ""}"`,
      s.cartons_count || 1,
      s.weight_kg || 1,
      s.expected_cost || Math.round((s.weight_kg || 1) * ratePerKg),
      `"${s.status || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `courier-manifest-${selectedCourier}-${selectedMonth}-${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success("Dispute manifest CSV downloaded successfully!");
  };

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    const list = summaryData?.customer_breakdown || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.company_name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q));
  }, [summaryData, searchQuery]);

  const filteredShipments = useMemo(() => {
    const list = summaryData?.shipments || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.order_number.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        s.tracking_number.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
    );
  }, [summaryData, searchQuery]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Courier Billing Reconciliation</h1>
            <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
              Section 11
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Reconcile monthly courier bills against system weights, flag overbilled shipments, and dispute discrepancies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/dispatch"
            className="flex items-center gap-1.5 vw-btn-secondary h-10 px-3.5 text-[13px] font-semibold"
          >
            <Truck size={16} /> Live Dispatch
          </Link>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[13px] border border-emerald-200 rounded-lg h-10 px-3.5 transition-colors"
          >
            <Download size={16} /> Export Dispute CSV
          </button>
        </div>
      </div>

      {/* Filter & Courier Bar */}
      <div className="vw-card p-4 mt-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Courier Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5">
              <Truck size={14} /> Partner:
            </span>
            {couriers.map((c) => {
              const active = c.name.toLowerCase() === selectedCourier.toLowerCase();
              return (
                <button
                  key={c._id || c.name}
                  type="button"
                  onClick={() => setSelectedCourier(c.name)}
                  className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{c.name}</span>
                  {c.rate_per_kg > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        active ? "bg-slate-700 text-slate-200" : "bg-white text-slate-500 border border-slate-200"
                      }`}
                    >
                      ₹{c.rate_per_kg}/kg
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAddPartnerModal(true)}
              className="px-2.5 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1 border border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-500 bg-white shrink-0"
              title="Add New Courier Partner"
            >
              <Plus size={13} /> Add Partner
            </button>
          </div>

          {/* Month, Year & Rate Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Calendar size={14} className="text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-[13px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-[13px] font-semibold text-slate-800 focus:outline-none cursor-pointer border-l border-slate-200 pl-2"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowRateModal(true)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Edit3 size={13} /> Edit Rates
            </button>

            <button
              onClick={fetchMonthlySummary}
              disabled={loading}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="vw-card p-12 mt-6 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-[13px] font-medium">Auditing courier shipments for {selectedCourier}...</p>
        </div>
      ) : (
        <>
          {/* 3 KPI Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
            {/* Card 1: System Dispatches */}
            <div className="vw-card p-5 border-t-4 border-t-blue-600 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    1. System Records
                  </span>
                  <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                    Internal Dispatch Data
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Total Orders Dispatched</div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">
                      {systemOrdersCount} <span className="text-[13px] text-slate-400 font-normal">Packages</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Total Weight Shipped</div>
                      <div className="text-xl font-bold text-slate-800 mt-0.5">{systemTotalWeight} Kg</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 font-medium">Active Rate</div>
                      <div className="text-[13px] font-semibold text-slate-700 mt-0.5">₹{ratePerKg}/Kg</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-blue-50/50 p-2.5 rounded-lg">
                <span className="text-[12px] font-bold text-slate-700">Expected Bill:</span>
                <span className="text-lg font-black text-blue-700">₹{systemExpectedAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Card 2: Courier Billed Invoice (Form Entry) */}
            <div className="vw-card p-5 border-t-4 border-t-amber-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    2. Courier Invoice Entry
                  </span>
                  <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                    Monthly Bill
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Courier Invoice / Bill #</label>
                    <input
                      type="text"
                      value={courierInvoiceNumber}
                      onChange={(e) => setCourierInvoiceNumber(e.target.value)}
                      placeholder="e.g. DTDC-OCT-2026-442"
                      className="w-full h-8 px-2.5 text-[12px] font-medium border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Billed Weight (Kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={courierBilledWeight}
                        onChange={(e) => setCourierBilledWeight(e.target.value)}
                        placeholder="0.0"
                        className="w-full h-8 px-2.5 text-[13px] font-bold border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Invoice Total (₹)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={courierBilledAmount}
                        onChange={(e) => handleBilledAmountChange(e.target.value)}
                        placeholder="0"
                        className="w-full h-8 px-2.5 text-[13px] font-bold border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-amber-50/50 p-2.5 rounded-lg">
                <span className="text-[12px] font-bold text-slate-700">Courier Bill:</span>
                <span className="text-lg font-black text-amber-700">
                  ₹{billedAmountNum ? billedAmountNum.toLocaleString("en-IN") : "0"}
                </span>
              </div>
            </div>

            {/* Card 3: Discrepancy & Audit Action */}
            <div
              className={`vw-card p-5 border-t-4 flex flex-col justify-between ${
                diffWeight > 0.5 || diffAmount > 20
                  ? "border-t-rose-500 bg-rose-50/20"
                  : billedWeightNum > 0
                  ? "border-t-emerald-500 bg-emerald-50/20"
                  : "border-t-slate-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    3. Audit & Discrepancy
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      reconcileStatus === "DISCREPANCY_FLAGGED"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : reconcileStatus === "RECONCILED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : reconcileStatus === "SETTLED"
                        ? "bg-purple-100 text-purple-800 border border-purple-300"
                        : "bg-slate-100 text-slate-700 border border-slate-300"
                    }`}
                  >
                    {reconcileStatus.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Weight Difference</div>
                      <div
                        className={`text-[15px] font-black mt-0.5 ${
                          diffWeight > 0.5 ? "text-rose-600" : diffWeight < 0 ? "text-blue-600" : "text-emerald-600"
                        }`}
                      >
                        {billedWeightNum > 0
                          ? `${diffWeight > 0 ? "+" : ""}${diffWeight} Kg`
                          : "Enter Bill Weight"}
                      </div>
                    </div>
                    {diffWeight > 0.5 ? (
                      <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded">
                        <AlertTriangle size={13} /> Overbilled
                      </span>
                    ) : billedWeightNum > 0 ? (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                        <CheckCircle2 size={13} /> Matched
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Amount Discrepancy</div>
                      <div
                        className={`text-[15px] font-black mt-0.5 ${
                          diffAmount > 20 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {billedAmountNum > 0
                          ? `${diffAmount > 0 ? "+" : ""}₹${Math.abs(diffAmount).toLocaleString("en-IN")}`
                          : "Enter Bill Amount"}
                      </div>
                    </div>
                    {diffAmount > 20 ? (
                      <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded">
                        <AlertTriangle size={13} /> Overcharged
                      </span>
                    ) : billedAmountNum > 0 ? (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                        <CheckCircle2 size={13} /> Clear
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Status & Save Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={reconcileStatus}
                    onChange={(e) => setReconcileStatus(e.target.value)}
                    className="flex-1 h-9 px-2 text-[12px] font-bold bg-white border border-slate-200 rounded-md focus:outline-none"
                  >
                    <option value="PENDING_AUDIT">PENDING AUDIT</option>
                    <option value="DISCREPANCY_FLAGGED">DISCREPANCY FLAGGED</option>
                    <option value="RECONCILED">RECONCILED (NO DISPUTE)</option>
                    <option value="SETTLED">SETTLED (DISPUTE RESOLVED)</option>
                  </select>
                  <button
                    onClick={handleSaveReconciliation}
                    disabled={saving}
                    className="px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12px] rounded-md transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save Audit</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Audit note (e.g. Disputed 12kg extra via email on 12-Oct)"
                  className="w-full h-8 px-2.5 text-[11px] border border-slate-200 rounded-md bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex items-center justify-between border-b border-slate-200">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("breakdown")}
                className={`pb-3 text-[13px] font-bold transition-all relative flex items-center gap-2 ${
                  activeTab === "breakdown" ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Building2 size={16} />
                <span>Customer-Wise Weight Breakdown</span>
                <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                  {summaryData?.customer_breakdown?.length || 0}
                </span>
                {activeTab === "breakdown" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("shipments")}
                className={`pb-3 text-[13px] font-bold transition-all relative flex items-center gap-2 ${
                  activeTab === "shipments" ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Package size={16} />
                <span>Dispatched Shipments Manifest</span>
                <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                  {summaryData?.shipments?.length || 0}
                </span>
                {activeTab === "shipments" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`pb-3 text-[13px] font-bold transition-all relative flex items-center gap-2 ${
                  activeTab === "history" ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <History size={16} />
                <span>Audit History</span>
                {activeTab === "history" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            </div>

            {/* Search filter for active tab */}
            {activeTab !== "history" && (
              <div className="relative mb-2 w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === "breakdown" ? "Search customer or city..." : "Search order or tracking #..."
                  }
                  className="w-full h-8 pl-8 pr-3 text-[12px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Tab 1: Customer-Wise Weight Breakdown */}
          {activeTab === "breakdown" && (
            <div className="vw-card mt-4 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-800">Customer Shipment Weight Share</h3>
                  <p className="text-[12px] text-slate-500">
                    Detailed per-customer weight dispatched via {selectedCourier} for billing dispute verification.
                  </p>
                </div>
                <div className="text-[12px] font-bold text-slate-600">
                  Total Dispatched: <span className="text-blue-600">{systemTotalWeight} Kg</span>
                </div>
              </div>

              {!filteredCustomers.length ? (
                <div className="p-8 text-center text-slate-400 text-[13px]">
                  No shipments found for {selectedCourier} in this month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="p-3 pl-4">Customer Name</th>
                        <th className="p-3">City</th>
                        <th className="p-3 text-center">Orders Count</th>
                        <th className="p-3 text-right">Shipped Weight (Kg)</th>
                        <th className="p-3 text-right">% of Volume</th>
                        <th className="p-3 text-right pr-4">Estimated Share (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.map((cust) => {
                        const volumePct =
                          systemTotalWeight > 0
                            ? Math.round((cust.total_weight_kg / systemTotalWeight) * 1000) / 10
                            : 0;
                        const costShare = cust.estimated_cost !== undefined ? cust.estimated_cost : Math.round(cust.total_weight_kg * ratePerKg);
                        return (
                          <tr key={cust.customer_id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 pl-4 font-bold text-slate-900">{cust.company_name}</td>
                            <td className="p-3 text-slate-600">{cust.city}</td>
                            <td className="p-3 text-center">
                              <span className="font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[12px]">
                                {cust.orders_count}
                              </span>
                            </td>
                            <td className="p-3 text-right font-black text-slate-800">
                              {cust.total_weight_kg} Kg
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-full rounded-full"
                                    style={{ width: `${Math.min(volumePct, 100)}%` }}
                                  />
                                </div>
                                <span className="font-semibold text-slate-600 text-[11px]">{volumePct}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-right pr-4 font-bold text-slate-900">
                              ₹{costShare.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Dispatched Shipments Manifest */}
          {activeTab === "shipments" && (
            <div className="vw-card mt-4 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-800">All Month Shipments ({selectedCourier})</h3>
                  <p className="text-[12px] text-slate-500">
                    Individual tracking numbers, boxes, and recorded weights.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 vw-btn-secondary h-8 px-3 text-[12px] font-semibold"
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>

              {!filteredShipments.length ? (
                <div className="p-8 text-center text-slate-400 text-[13px]">
                  No shipment records matching filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="p-3 pl-4">Order #</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Tracking / AWB #</th>
                        <th className="p-3">Shipped Date</th>
                        <th className="p-3 text-center">Cartons</th>
                        <th className="p-3 text-right">Recorded Weight</th>
                        <th className="p-3 text-right">Expected Cost</th>
                        <th className="p-3 pr-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredShipments.map((s) => (
                        <tr key={s.order_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 pl-4 font-mono font-bold text-blue-600">{s.order_number}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{s.customer_name}</div>
                            <div className="text-[11px] text-slate-400">{s.city}</div>
                          </td>
                          <td className="p-3 font-mono font-medium text-slate-700">
                            {s.tracking_number !== "-" ? (
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[12px]">
                                {s.tracking_number}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending AWB</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 text-[12px]">
                            {s.shipped_date ? new Date(s.shipped_date).toLocaleDateString("en-IN") : "-"}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[12px] font-bold text-slate-700">{s.cartons_count || 1} Box</span>
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">{s.weight_kg} Kg</td>
                          <td className="p-3 text-right font-bold text-slate-800">
                            ₹{(s.expected_cost || Math.round((s.weight_kg || 1) * ratePerKg)).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 pr-4 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.status === "DELIVERED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Past Reconciliation History */}
          {activeTab === "history" && (
            <div className="vw-card mt-4 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-800">Historical Reconciliation Audits</h3>
                  <p className="text-[12px] text-slate-500">Past audited months and their settlement records.</p>
                </div>
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="flex items-center gap-1.5 vw-btn-secondary h-8 px-3 text-[12px] font-semibold"
                >
                  <RefreshCw size={13} className={loadingHistory ? "animate-spin" : ""} /> Refresh
                </button>
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center text-slate-400 text-[13px] flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Loading history...
                </div>
              ) : !historyList.length ? (
                <div className="p-8 text-center text-slate-400 text-[13px]">
                  No past reconciliation records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="p-3 pl-4">Courier</th>
                        <th className="p-3">Period</th>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3 text-right">System Wt</th>
                        <th className="p-3 text-right">Billed Wt</th>
                        <th className="p-3 text-right">Weight Diff</th>
                        <th className="p-3 text-right">Amount Diff</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 pr-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyList.map((h) => {
                        const monthName = MONTHS.find((m) => m.value === h.month)?.label || h.month;
                        return (
                          <tr key={h._id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 pl-4 font-bold text-slate-900">{h.courier_name}</td>
                            <td className="p-3 font-semibold text-slate-700">
                              {monthName} {h.year}
                            </td>
                            <td className="p-3 font-mono text-[12px] text-slate-600">
                              {h.courier_invoice_number || "-"}
                            </td>
                            <td className="p-3 text-right font-medium text-slate-700">
                              {h.system_total_weight_kg} Kg
                            </td>
                            <td className="p-3 text-right font-bold text-slate-800">
                              {h.courier_billed_weight_kg} Kg
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={`font-bold ${
                                  h.difference_weight_kg > 0
                                    ? "text-rose-600"
                                    : h.difference_weight_kg < 0
                                    ? "text-blue-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {h.difference_weight_kg > 0 ? "+" : ""}
                                {h.difference_weight_kg} Kg
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold">
                              <span className={h.difference_amount > 20 ? "text-rose-600" : "text-emerald-600"}>
                                {h.difference_amount > 0 ? "+" : ""}₹{h.difference_amount?.toLocaleString("en-IN")}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                  h.status === "DISCREPANCY_FLAGGED"
                                    ? "bg-rose-100 text-rose-800"
                                    : h.status === "RECONCILED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : h.status === "SETTLED"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {h.status?.replace("_", " ")}
                              </span>
                            </td>
                            <td className="p-3 pr-4 text-[12px] text-slate-500 truncate max-w-xs" title={h.notes}>
                              {h.notes || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Rates Modal */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-blue-600" />
                <h3 className="font-bold text-[15px] text-slate-900">Edit {selectedCourier} Rates</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Rate per Kg (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={ratePerKg}
                  onChange={(e) => setRatePerKg(e.target.value)}
                  placeholder="e.g. 60"
                  className="w-full h-10 px-3 text-[14px] font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Standard 1st Kg billing rate as contracted with {selectedCourier}.
                </span>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Rate per Additional Half Kg (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={rateHalfKg}
                  onChange={(e) => setRateHalfKg(e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full h-10 px-3 text-[14px] font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Applicable when weight exceeds full Kg increments.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="flex-1 vw-btn-secondary h-10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors flex items-center justify-center gap-1.5"
                >
                  {savingRate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Rates</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Courier Partner Modal (Section 11) */}
      {showAddPartnerModal && (
        <AddCourierModal
          isOpen={showAddPartnerModal}
          onClose={() => setShowAddPartnerModal(false)}
          onCourierCreated={(newCourier) => {
            fetchCouriers();
            if (newCourier?.name) {
              setSelectedCourier(newCourier.name);
            }
          }}
        />
      )}
    </>
  );
}

