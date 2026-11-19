import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  User,
  Paperclip,
  Loader2,
  RefreshCw,
  X,
  Phone,
  Tag
} from "lucide-react";
import { supportService } from "@/services/supportService";
import { customerService } from "@/services/customerService";
import { notify } from "@/lib/notify";
import "@/styles/veriwide.css";

export function Support() {
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // New Ticket Modal State
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    customerId: "",
    subject: "",
    category: "Order Inquiry",
    priority: "Medium",
    message: ""
  });

  const chatBottomRef = useRef(null);

  // Fetch Tickets List from API
  const fetchTickets = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingTickets(true);
    try {
      const params = { limit: 100 };
      if (activeFilter !== "All") {
        params.status = activeFilter;
      }
      const res = await supportService.getTickets(params);
      const list = Array.isArray(res?.data?.list)
        ? res.data.list
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setTickets(list);

      // Auto-select first ticket if none selected or current is not in list
      if (list.length > 0) {
        if (!selectedTicketId || !list.some((t) => t?._id === selectedTicketId)) {
          setSelectedTicketId(list[0]?._id);
        }
      } else {
        setSelectedTicketId(null);
        setSelectedTicketDetail(null);
      }
    } catch (err) {
      console.error("Error fetching support tickets:", err);
      notify.error(err.message || "Failed to load support tickets.");
    } finally {
      setLoadingTickets(false);
    }
  }, [activeFilter, selectedTicketId]);

  useEffect(() => {
    fetchTickets(true);
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Ticket Detail whenever selectedTicketId changes
  const fetchTicketDetail = useCallback(async (id) => {
    if (!id) {
      setSelectedTicketDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await supportService.getTicketDetail(id);
      setSelectedTicketDetail(res.data);
    } catch (err) {
      console.error("Error fetching ticket detail:", err);
      notify.error(err.message || "Failed to load ticket details.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId, fetchTicketDetail]);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    if (selectedTicketDetail?.messages?.length) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicketDetail?.messages]);

  // Load customers for New Ticket Modal
  useEffect(() => {
    if (showNewTicketModal && customers.length === 0) {
      setLoadingCustomers(true);
      customerService
        .getCustomers({ is_active: true, approval_status: "APPROVED", limit: 100 })
        .then((res) => {
          const list = Array.isArray(res?.data?.list)
            ? res.data.list
            : Array.isArray(res?.data?.customers)
            ? res.data.customers
            : Array.isArray(res?.data)
            ? res.data
            : [];
          setCustomers(list);
          if (list.length > 0) {
            setNewTicketForm((prev) => ({ ...prev, customerId: list[0]?._id || "" }));
          }
        })
        .catch((err) => {
          console.error("Error fetching customers:", err);
        })
        .finally(() => {
          setLoadingCustomers(false);
        });
    }
  }, [showNewTicketModal, customers.length]);

  // Send Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketDetail?._id || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await supportService.sendReply(selectedTicketDetail._id, replyText.trim());
      const updatedTicket = res.data;
      setSelectedTicketDetail(updatedTicket);
      setReplyText("");

      // Update ticket in local list (status may have changed to In Progress)
      setTickets((prev) =>
        Array.isArray(prev)
          ? prev.map((t) => (t?._id === updatedTicket?._id ? { ...t, ...updatedTicket } : t))
          : []
      );
      notify.success("Reply sent.");
    } catch (err) {
      console.error("Error sending reply:", err);
      notify.error(err.message || "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  // Status Change
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicketDetail?._id || updatingStatus || selectedTicketDetail.status === newStatus) return;

    setUpdatingStatus(true);
    try {
      const res = await supportService.updateStatus(selectedTicketDetail._id, newStatus);
      const updatedTicket = res.data;
      setSelectedTicketDetail((prev) => ({ ...prev, status: newStatus }));
      setTickets((prev) =>
        Array.isArray(prev)
          ? prev.map((t) => (t?._id === updatedTicket?._id ? { ...t, status: newStatus } : t))
          : []
      );
      notify.success(`Status updated to ${newStatus}.`);
    } catch (err) {
      console.error("Error updating status:", err);
      notify.error(err.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Create New Ticket
  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!newTicketForm.customerId || !newTicketForm.subject.trim()) {
      notify.error("Please select a customer and provide a subject.");
      return;
    }

    setCreatingTicket(true);
    try {
      const res = await supportService.createTicket({
        customerId: newTicketForm.customerId,
        subject: newTicketForm.subject.trim(),
        category: newTicketForm.category,
        priority: newTicketForm.priority,
        message: newTicketForm.message.trim() || undefined
      });

      const created = res.data;
      notify.success("Support ticket created successfully.");
      setShowNewTicketModal(false);
      setNewTicketForm({
        customerId: customers[0]?._id || "",
        subject: "",
        category: "Order Inquiry",
        priority: "Medium",
        message: ""
      });

      // Refresh list & select the new ticket
      await fetchTickets(false);
      if (created?._id) {
        setSelectedTicketId(created._id);
      }
    } catch (err) {
      console.error("Error creating ticket:", err);
      notify.error(err.message || "Failed to create ticket.");
    } finally {
      setCreatingTicket(false);
    }
  };

  // Filtered tickets based on search query
  const filteredTickets = useMemo(() => {
    if (!Array.isArray(tickets)) return [];
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim();
    return tickets.filter((t) => {
      if (!t) return false;
      const subject = (t.subject || "").toLowerCase();
      const custName = (t.customer_id?.name || t.customer_id?.company_name || "").toLowerCase();
      const id = (t._id || "").toLowerCase();
      const cat = (t.category || "").toLowerCase();
      return subject.includes(q) || custName.includes(q) || id.includes(q) || cat.includes(q);
    });
  }, [tickets, searchQuery]);

  const getPriorityColor = (priority) => {
    if (priority === "High") return "bg-rose-100 text-rose-700 border-rose-200";
    if (priority === "Medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const getStatusIcon = (status) => {
    if (status === "Open") return <AlertCircle size={14} className="text-rose-500" />;
    if (status === "In Progress") return <Clock size={14} className="text-amber-500" />;
    return <CheckCircle2 size={14} className="text-emerald-500" />;
  };

  const formatTicketDate = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const formatMessageTime = (timeVal) => {
    if (!timeVal) return "";
    const d = new Date(timeVal);
    if (isNaN(d.getTime())) return String(timeVal);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden gap-4 mt-2">
      {/* LEFT: Ticket List */}
      <div className="w-[400px] flex flex-col vw-card overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-[18px] text-slate-800">Support Tickets</h2>
              <button
                onClick={() => fetchTickets(false)}
                title="Refresh list"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw size={14} className={loadingTickets ? "animate-spin" : ""} />
              </button>
            </div>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-sm shadow-blue-600/20"
              title="Create new support ticket"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets or customers..."
              className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
            {["All", "Open", "In Progress", "Resolved"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${
                  activeFilter === filter
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter} {filter === "Open" && <span className="ml-1 text-rose-400">•</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
          {loadingTickets && tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-[13px] flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading tickets...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-[13px]">
              {searchQuery ? "No matching tickets found." : "No tickets found."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map((ticket) => {
                const isSelected = selectedTicketId === ticket._id;
                const custName =
                  ticket.customer_id?.company_name || ticket.customer_id?.name || "Customer";
                const shortId = `TKT-${(ticket._id || "").slice(-6).toUpperCase()}`;

                return (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicketId(ticket._id)}
                    className={`p-4 cursor-pointer transition-colors border-l-4 ${
                      isSelected
                        ? "bg-white border-blue-500 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[12px] text-slate-900 font-mono">
                          {shortId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {formatTicketDate(ticket.createdAt || ticket.created_at)}
                      </span>
                    </div>
                    <h3 className="font-bold text-[14px] text-slate-800 line-clamp-1 mb-1">
                      {ticket.subject}
                    </h3>
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5">
                          <User size={12} /> {custName}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                          {getStatusIcon(ticket.status)} {ticket.status}
                        </span>
                      </div>
                      {ticket.category && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                          {ticket.category}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Ticket Details & Chat */}
      <div className="flex-1 flex flex-col vw-card overflow-hidden">
        {loadingDetail && !selectedTicketDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-2" />
            <p className="text-[14px] font-medium">Loading ticket details...</p>
          </div>
        ) : selectedTicketDetail ? (
          <>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="font-black text-[20px] text-slate-800">
                    {selectedTicketDetail.subject}
                  </h2>
                  <span
                    className={`px-2 py-1 rounded text-[11px] font-bold border ${getPriorityColor(
                      selectedTicketDetail.priority
                    )}`}
                  >
                    {selectedTicketDetail.priority} Priority
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[13px] flex-wrap">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <User size={14} className="text-blue-500" />{" "}
                    {selectedTicketDetail.customer_id?.company_name ||
                      selectedTicketDetail.customer_id?.name ||
                      "Customer"}
                  </span>
                  {selectedTicketDetail.customer_id?.phone && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />{" "}
                        {selectedTicketDetail.customer_id.phone}
                      </span>
                    </>
                  )}
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Tag size={13} className="text-slate-400" /> Category:{" "}
                    <span className="font-bold text-slate-700">
                      {selectedTicketDetail.category || "General"}
                    </span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="font-bold flex items-center gap-1.5">
                    {getStatusIcon(selectedTicketDetail.status)}
                    <select
                      className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-800 border-b border-slate-300 hover:border-slate-500 pb-0.5"
                      value={selectedTicketDetail.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                    {updatingStatus && <Loader2 size={12} className="animate-spin text-blue-600" />}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-slate-50 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div className="text-center">
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Ticket Conversation
                </span>
              </div>

              {selectedTicketDetail.messages && selectedTicketDetail.messages.length > 0 ? (
                selectedTicketDetail.messages.map((msg, index) => {
                  const isAgent = msg.sender === "agent";
                  const custName =
                    selectedTicketDetail.customer_id?.company_name ||
                    selectedTicketDetail.customer_id?.name ||
                    "Customer";

                  return (
                    <div
                      key={msg._id || index}
                      className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                          isAgent
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
                        }`}
                      >
                        {!isAgent && (
                          <div className="font-bold text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
                            <User size={12} /> {custName}
                          </div>
                        )}
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <div
                          className={`text-[10px] mt-2 text-right ${
                            isAgent ? "text-blue-200" : "text-slate-400"
                          }`}
                        >
                          {formatMessageTime(msg.created_at || msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-[13px]">
                  No messages on this ticket yet.
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSendReply} className="flex gap-3">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  disabled={sendingReply}
                  className="flex-1 h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-[14px] rounded-xl transition-colors shadow-sm flex items-center gap-2 shrink-0"
                >
                  {sendingReply ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      Send <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={48} className="mb-4 text-slate-200" />
            <p className="text-[15px] font-bold">Select a ticket to view details</p>
          </div>
        )}
      </div>

      {/* NEW TICKET MODAL */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-[18px] text-slate-800">Create New Support Ticket</h2>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTicketSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                  Customer / Shop
                </label>
                {loadingCustomers ? (
                  <div className="text-[13px] text-slate-400 py-2">Loading customer list...</div>
                ) : (
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none bg-white"
                    value={newTicketForm.customerId}
                    onChange={(e) =>
                      setNewTicketForm({ ...newTicketForm, customerId: e.target.value })
                    }
                    required
                  >
                    <option value="" disabled>
                      Select a customer
                    </option>
                    {Array.isArray(customers) &&
                      customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.company_name || c.name} ({c.phone || "No phone"})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                  Issue Subject
                </label>
                <input
                  type="text"
                  required
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  className="w-full h-11 px-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none"
                  placeholder="Brief description of the problem"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none bg-white"
                    value={newTicketForm.category}
                    onChange={(e) =>
                      setNewTicketForm({ ...newTicketForm, category: e.target.value })
                    }
                  >
                    <option>Dispatch Delay</option>
                    <option>Returns/Damaged</option>
                    <option>Billing Issue</option>
                    <option>Order Inquiry</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    className="w-full h-11 px-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none bg-white"
                    value={newTicketForm.priority}
                    onChange={(e) =>
                      setNewTicketForm({ ...newTicketForm, priority: e.target.value })
                    }
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                  Initial Message / Notes
                </label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none h-24 resize-none"
                  value={newTicketForm.message}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
                  placeholder="Type the detailed issue here..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="flex-1 vw-btn-secondary h-11"
                  disabled={creatingTicket}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-[14px] rounded-lg h-11 transition-colors flex items-center justify-center gap-2"
                >
                  {creatingTicket ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create Ticket"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
