import { useState } from "react";
import { Search, Filter, Plus, MessageSquare, AlertCircle, Clock, CheckCircle2, MoreVertical, Send, User, Paperclip } from "lucide-react";
import "@/styles/veriwide.css";

const INITIAL_TICKETS = [
  { id: "TKT-1001", subject: "Delay in delivery of Order #4092", customer: "Sharma Optics", date: "2026-10-06T10:30:00Z", status: "Open", priority: "High", type: "Dispatch Delay", unread: 2 },
  { id: "TKT-1002", subject: "Lenses scratched on arrival", customer: "Vision Plus Center", date: "2026-10-05T14:15:00Z", status: "In Progress", priority: "Medium", type: "Returns/Damaged", unread: 0 },
  { id: "TKT-1003", subject: "Billing mismatch for last month", customer: "Royal Chashma Ghar", date: "2026-10-04T09:00:00Z", status: "Resolved", priority: "Low", type: "Billing Issue", unread: 0 },
  { id: "TKT-1004", subject: "Urgent KT lens requirement", customer: "Eye Care Clinic", date: "2026-10-07T08:20:00Z", status: "Open", priority: "High", type: "Order Inquiry", unread: 1 },
];

const MOCK_MESSAGES = [
  { id: 1, sender: "customer", text: "Hello, my order #4092 was supposed to arrive yesterday but I haven't received it yet. Can you please check?", time: "Oct 6, 10:30 AM" },
  { id: 2, sender: "agent", text: "Hi Sharma Optics, let me check with our dispatch team right away. Please give me a few minutes.", time: "Oct 6, 10:45 AM" },
  { id: 3, sender: "customer", text: "Sure, please let me know. The customer is waiting for these lenses.", time: "Oct 6, 10:50 AM" },
  { id: 4, sender: "customer", text: "Any update on this?", time: "Oct 7, 09:15 AM" },
];

export function Support() {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(INITIAL_TICKETS[0]);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [replyText, setReplyText] = useState("");
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  const filteredTickets = tickets.filter(t => activeFilter === "All" || t.status === activeFilter);

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: "agent",
      text: replyText,
      time: "Just now"
    };
    setMessages([...messages, newMsg]);
    setReplyText("");
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (priority === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getStatusIcon = (status) => {
    if (status === 'Open') return <AlertCircle size={14} className="text-rose-500" />;
    if (status === 'In Progress') return <Clock size={14} className="text-amber-500" />;
    return <CheckCircle2 size={14} className="text-emerald-500" />;
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden gap-4 mt-2">
      
      {/* LEFT: Ticket List */}
      <div className="w-[400px] flex flex-col vw-card overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-[18px] text-slate-800">Support Tickets</h2>
            <button 
              onClick={() => setShowNewTicketModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-sm shadow-blue-600/20"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search tickets or customers..."
              className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
            {["All", "Open", "In Progress", "Resolved"].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${
                  activeFilter === filter ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter} {filter === "Open" && <span className="ml-1 text-rose-400">•</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-[13px]">No tickets found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer transition-colors border-l-4 ${
                    selectedTicket?.id === ticket.id 
                      ? 'bg-white border-blue-500 shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13px] text-slate-900">{ticket.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{new Date(ticket.date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}</span>
                  </div>
                  <h3 className="font-bold text-[14px] text-slate-800 line-clamp-1 mb-1">{ticket.subject}</h3>
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5">
                        <User size={12} /> {ticket.customer}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                        {getStatusIcon(ticket.status)} {ticket.status}
                      </span>
                    </div>
                    {ticket.unread > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {ticket.unread} New
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Ticket Details & Chat */}
      <div className="flex-1 flex flex-col vw-card overflow-hidden">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="font-black text-[20px] text-slate-800">{selectedTicket.subject}</h2>
                  <span className={`px-2 py-1 rounded text-[11px] font-bold border ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority} Priority
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[13px]">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5"><User size={14} className="text-blue-500" /> {selectedTicket.customer}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 flex items-center gap-1.5">Type: <span className="font-bold text-slate-700">{selectedTicket.type}</span></span>
                  <span className="text-slate-300">|</span>
                  <span className="font-bold flex items-center gap-1.5">
                    {getStatusIcon(selectedTicket.status)} 
                    <select 
                      className="bg-transparent focus:outline-none cursor-pointer"
                      value={selectedTicket.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus } : t));
                        setSelectedTicket({ ...selectedTicket, status: newStatus });
                      }}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </span>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><MoreVertical size={18} /></button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-slate-50 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              <div className="text-center">
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Today</span>
              </div>
              
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                    msg.sender === 'agent' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.sender === 'customer' && (
                      <div className="font-bold text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
                        <User size={12} /> {selectedTicket.customer}
                      </div>
                    )}
                    <p className="text-[14px] leading-relaxed">{msg.text}</p>
                    <div className={`text-[10px] mt-2 text-right ${msg.sender === 'agent' ? 'text-blue-200' : 'text-slate-400'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSendReply} className="flex gap-3">
                <button type="button" className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0">
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply here..." 
                  className="flex-1 h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={!replyText.trim()}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-[14px] rounded-xl transition-colors shadow-sm flex items-center gap-2 shrink-0"
                >
                  Send <Send size={16} />
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
              <button onClick={() => setShowNewTicketModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Customer / Shop Name</label>
                <input type="text" className="w-full h-11 px-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none" placeholder="e.g. Vision Plus Center" />
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Issue Subject</label>
                <input type="text" className="w-full h-11 px-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none" placeholder="Brief description of the problem" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Category</label>
                  <select className="w-full h-11 px-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none">
                    <option>Dispatch Delay</option>
                    <option>Returns/Damaged</option>
                    <option>Billing Issue</option>
                    <option>Order Inquiry</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Priority</label>
                  <select className="w-full h-11 px-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Initial Message / Notes</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-lg text-[13px] focus:border-blue-500 focus:outline-none h-24 resize-none" placeholder="Type the detailed issue here..."></textarea>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setShowNewTicketModal(false)} className="flex-1 vw-btn-secondary h-11">Cancel</button>
                <button onClick={() => setShowNewTicketModal(false)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[14px] rounded-lg h-11 transition-colors">Create Ticket</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
