import { useState } from "react";
import { ShieldCheck, UserPlus, Key, Mail, Edit, Trash2, CheckCircle2, ShieldAlert, Plus, X, Lock, Power, Package } from "lucide-react";
import "@/styles/veriwide.css";

const INITIAL_ROLES = [
  { id: "R1", role: "Super Admin", desc: "Full access to all modules including sensitive financial settings.", permissions: ["Manage Users", "View Reports", "Manage Udhari/Khata", "Add/Edit Orders", "Approve Credit Limits", "Process Dispatch", "View Returns", "Approve Refunds"] },
  { id: "R2", role: "Manager", desc: "Can view reports, approve credit limits, and manage daily operations.", permissions: ["View Reports", "Approve Credit Limits", "Add/Edit Orders", "View Returns"] },
  { id: "R3", role: "Billing Specialist", desc: "Focused on invoices, khata adjustments, and payment collections.", permissions: ["Manage Udhari/Khata", "View Reports"] },
  { id: "R4", role: "Dispatcher", desc: "Handles packing and shipping workflows.", permissions: ["Process Dispatch"] },
];

const INITIAL_ADMINS = [
  { id: "ADM-1", name: "Sahil (Super Admin)", email: "sahil@opticalerp.com", roleId: "R1", status: "Active" },
  { id: "ADM-2", name: "Rajesh Kumar", email: "rajesh@opticalerp.com", roleId: "R2", status: "Active" },
  { id: "ADM-3", name: "Priya Sharma", email: "priya@opticalerp.com", roleId: "R3", status: "Active" },
  { id: "ADM-4", name: "Amit Verma", email: "amit@opticalerp.com", roleId: "R4", status: "Inactive" },
];

const INITIAL_RACKS = [
  { id: "RACK-1", floor: 1, rack_id: "F2", section_shelf: 45, box_grid_capacity: "8x4", assigned_lens_type: "Single Vision", status: "Active" },
  { id: "RACK-2", floor: 2, rack_id: "A", section_shelf: 12, box_grid_capacity: "8x5", assigned_lens_type: "Progressive", status: "Active" },
  { id: "RACK-3", floor: 3, rack_id: "D3", section_shelf: 90, box_grid_capacity: "8x4", assigned_lens_type: "KT", status: "Active" },
];

const ALL_PERMISSIONS = [
  "Manage Users", "View Reports", "Manage Udhari/Khata", "Add/Edit Orders", 
  "Approve Credit Limits", "Process Dispatch", "View Returns", "Approve Refunds"
];

export function Settings() {
  const [activeTab, setActiveTab] = useState("users");
  
  // Data State
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [admins, setAdmins] = useState(INITIAL_ADMINS);
  
  // Modals State
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  // Separate Action Modals for Users
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [newStatus, setNewStatus] = useState("");
  
  // Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);

  // Form States
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", roleId: "R2", status: "Active" });
  const [roleForm, setRoleForm] = useState({ role: "", desc: "", permissions: [] });

  // ---------------- USER LOGIC ----------------
  const handleOpenUserModal = (user = null) => {
    if (user) {
      // Editing profile (No password or status here)
      setEditingUser(user.id);
      setUserForm({ name: user.name, email: user.email, roleId: user.roleId, password: "", status: user.status });
    } else {
      // Adding new user (Includes everything for creation)
      setEditingUser(null);
      setUserForm({ name: "", email: "", password: "", roleId: roles[0]?.id || "", status: "Active" });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (editingUser) {
      setAdmins(admins.map(a => a.id === editingUser ? { ...a, name: userForm.name, email: userForm.email, roleId: userForm.roleId } : a));
      alert("Admin profile updated successfully!");
    } else {
      if (!userForm.password) return alert("Password is required for new admins.");
      setAdmins([...admins, { ...userForm, id: `ADM-${Date.now()}` }]);
      alert("New team member added successfully!");
    }
    setShowUserModal(false);
  };

  // --- SEPARATE ACTION: CHANGE PASSWORD ---
  const handleOpenPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowPasswordModal(true);
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    if(!newPassword) return alert("Please enter a new password");
    alert(`Password for ${selectedUser.name} has been successfully changed.`);
    setShowPasswordModal(false);
  };

  // --- SEPARATE ACTION: CHANGE STATUS ---
  const handleOpenStatusModal = (user) => {
    setSelectedUser(user);
    setNewStatus(user.status);
    setShowStatusModal(true);
  };

  const handleSaveStatus = (e) => {
    e.preventDefault();
    setAdmins(admins.map(a => a.id === selectedUser.id ? { ...a, status: newStatus } : a));
    alert(`${selectedUser.name}'s status changed to ${newStatus}.`);
    setShowStatusModal(false);
  };

  const handleDeleteUser = (id, name) => {
    if (window.confirm(`Are you sure you want to remove ${name} from the system?`)) {
      setAdmins(admins.filter(a => a.id !== id));
    }
  };

  // ---------------- ROLE LOGIC ----------------
  const handleOpenRoleModal = (role = null) => {
    if (role) {
      if (role.id === "R1") return alert("Super Admin role cannot be edited.");
      setEditingRole(role.id);
      setRoleForm({ ...role });
    } else {
      setEditingRole(null);
      setRoleForm({ role: "", desc: "", permissions: [] });
    }
    setShowRoleModal(true);
  };

  const handleTogglePermission = (perm) => {
    if (roleForm.permissions.includes(perm)) {
      setRoleForm({ ...roleForm, permissions: roleForm.permissions.filter(p => p !== perm) });
    } else {
      setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, perm] });
    }
  };

  const handleSaveRole = (e) => {
    e.preventDefault();
    if (!roleForm.role) return alert("Role Name is required");
    if (roleForm.permissions.length === 0) return alert("Please select at least one permission");

    if (editingRole) {
      setRoles(roles.map(r => r.id === editingRole ? { ...roleForm, id: editingRole } : r));
      alert("Role updated successfully!");
    } else {
      const newRole = { ...roleForm, id: `R-${Date.now()}` };
      setRoles([...roles, newRole]);
      alert("New Role created successfully!");
    }
    setShowRoleModal(false);
  };

  const handleDeleteRole = (id, name) => {
    if (id === "R1") return alert("Super Admin role cannot be deleted.");
    if (admins.some(a => a.roleId === id)) return alert(`Cannot delete role. There are users currently assigned to ${name}.`);
    
    if (window.confirm(`Are you sure you want to delete the ${name} role?`)) {
      setRoles(roles.filter(r => r.id !== id));
    }
  };

  const getRoleName = (id) => roles.find(r => r.id === id)?.role || "Unknown Role";

  // ---------------- WAREHOUSE RACK LOGIC ----------------
  // Grouped by Rack instead of individual shelves to make it easy to manage
  const INITIAL_RACKS = [
    { id: "R-F1-A", floor: 1, rack_id: "A", total_shelves: 20, boxes_per_shelf: 10, status: "Active" },
    { id: "R-F1-B", floor: 1, rack_id: "B", total_shelves: 15, boxes_per_shelf: 20, status: "Active" },
    { id: "R-F2-C", floor: 2, rack_id: "C", total_shelves: 30, boxes_per_shelf: 15, status: "Active" },
  ];

  const [racks, setRacks] = useState(INITIAL_RACKS);
  const [showRackModal, setShowRackModal] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  
  // Form handles creating a FULL RACK at once (Bulk Add Locations)
  const [rackForm, setRackForm] = useState({ floor: 1, rack_id: "", total_shelves: 10, boxes_per_shelf: 10, status: "Active" });
  
  // Group racks by floor for UI display
  const groupedRacks = racks.reduce((acc, rack) => {
    if (!acc[rack.floor]) acc[rack.floor] = [];
    acc[rack.floor].push(rack);
    return acc;
  }, {});

  const handleOpenRackModal = (rack = null) => {
    if (rack) {
      setEditingRack(rack.id);
      setRackForm({ ...rack });
    } else {
      setEditingRack(null);
      setRackForm({ floor: 1, rack_id: "", total_shelves: 10, boxes_per_shelf: 10, status: "Active" });
    }
    setShowRackModal(true);
  };

  const handleSaveRack = (e) => {
    e.preventDefault();
    if (editingRack) {
      setRacks(racks.map(r => r.id === editingRack ? { ...rackForm, id: editingRack } : r));
      alert("Storage Rack updated successfully!");
    } else {
      setRacks([...racks, { ...rackForm, id: `R-${rackForm.floor}-${rackForm.rack_id}-${Date.now()}` }]);
      alert(`Successfully added Rack ${rackForm.rack_id} with ${rackForm.total_shelves} shelves!`);
    }
    setShowRackModal(false);
  };

  const handleDeleteRack = (id, rack_id) => {
    if (window.confirm(`Are you sure you want to completely remove Rack ${rack_id}? This will delete all its shelves.`)) {
      setRacks(racks.filter(r => r.id !== id));
    }
  };

  const toggleRackStatus = (id) => {
    setRacks(racks.map(r => {
      if(r.id === id) return { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' };
      return r;
    }));
  };

  const getAdminName = (id) => admins.find(a => a.id === id)?.name || "Not Assigned";

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Key className="text-blue-600" /> Roles & Access Management
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">Manage team members, define roles, and control granular permissions.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "users" && (
            <button 
              onClick={() => handleOpenUserModal()}
              className="flex items-center justify-center gap-2 vw-btn-primary h-10 px-4"
            >
              <UserPlus size={16} /> Add Team Member
            </button>
          )}
          {activeTab === "roles" && (
            <button 
              onClick={() => handleOpenRoleModal()}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] rounded-lg h-10 px-4 transition-colors shadow-sm shadow-indigo-600/20"
            >
              <Plus size={16} /> Create New Role
            </button>
          )}
          {activeTab === "locations" && (
            <button 
              onClick={() => handleOpenRackModal()}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-lg h-10 px-4 transition-colors shadow-sm shadow-emerald-600/20"
            >
              <Plus size={16} /> Map New Rack
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mt-6 hide-scrollbar overflow-x-auto">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-3 text-[14px] font-semibold transition-colors relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === "users" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Team Members
          {activeTab === "users" && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-3 text-[14px] font-semibold transition-colors relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === "roles" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Role Definitions
          {activeTab === "roles" && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab("locations")}
          className={`px-4 py-3 text-[14px] font-semibold transition-colors relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === "locations" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Physical Warehouse Storage
          {activeTab === "locations" && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />}
        </button>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        
        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="vw-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4 font-bold">User Details</th>
                    <th className="px-5 py-4 font-bold">Assigned Role</th>
                    <th className="px-5 py-4 font-bold text-center">Status</th>
                    <th className="px-5 py-4 font-bold text-center">Separate Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-5 py-8 text-center text-slate-500 text-[13px]">No users found.</td>
                    </tr>
                  )}
                  {admins.map(admin => (
                    <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[14px]">
                            {admin.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[14px] text-slate-900">{admin.name}</div>
                            <div className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Mail size={12} /> {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className={admin.roleId === 'R1' ? 'text-rose-500' : 'text-blue-500'} />
                          <span className="font-semibold text-[13px] text-slate-800">{getRoleName(admin.roleId)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          admin.status === "Active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {admin.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button onClick={() => handleOpenUserModal(admin)} className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-100 rounded transition-colors" title="Edit Profile">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleOpenPasswordModal(admin)} className="p-1.5 text-amber-500 bg-amber-50 hover:bg-amber-500 hover:text-white border border-amber-100 rounded transition-colors" title="Change Password">
                            <Lock size={14} />
                          </button>
                          <button onClick={() => handleOpenStatusModal(admin)} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-100 rounded transition-colors" title="Change Status">
                            <Power size={14} />
                          </button>
                          <div className="w-px h-5 bg-slate-200 mx-1"></div>
                          <button onClick={() => handleDeleteUser(admin.id, admin.name)} className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-100 rounded transition-colors" title="Delete Admin">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROLES TAB */}
        {activeTab === "roles" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div key={role.id} className="vw-card flex flex-col h-full relative overflow-hidden group">
                <div className={`h-1.5 w-full ${role.id === 'R1' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-black text-[16px] text-slate-900 flex items-center gap-2">
                      {role.id === 'R1' ? <ShieldAlert className="text-rose-500" /> : <ShieldCheck className="text-indigo-500" />}
                      {role.role}
                    </h3>
                    <div className="flex gap-1">
                      {role.id !== "R1" && (
                        <>
                          <button onClick={() => handleOpenRoleModal(role)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit size={14} /></button>
                          <button onClick={() => handleDeleteRole(role.id, role.role)} className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-500 mb-5 flex-1">{role.desc || "No description provided."}</p>
                  
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 h-[150px] overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Permissions ({role.permissions.length})</p>
                    <ul className="space-y-2">
                      {role.permissions.map((perm, pIdx) => (
                        <li key={pIdx} className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                          <CheckCircle2 size={14} className={role.id === 'R1' ? 'text-rose-500' : 'text-emerald-500'} /> {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 text-[11px] font-semibold text-slate-400">
                    {admins.filter(a => a.roleId === role.id).length} Users assigned
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LOCATIONS TAB (WAREHOUSE RACKS) */}
        {activeTab === "locations" && (
          <div className="space-y-8">
            {Object.keys(groupedRacks).length === 0 ? (
              <div className="vw-card p-10 text-center text-slate-500 text-[14px]">No storage racks mapped yet. Click "Map New Rack" to start.</div>
            ) : (
              Object.keys(groupedRacks).sort().map(floor => (
                <div key={floor} className="vw-card overflow-hidden">
                  <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                    <h3 className="font-black text-[16px]">Floor {floor}</h3>
                    <span className="bg-slate-700 px-3 py-1 rounded-full text-[12px] font-bold">{groupedRacks[floor].length} Racks</span>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 bg-slate-50/50">
                    {groupedRacks[floor].map(rack => (
                      <div key={rack.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-slate-50">
                          <div className="font-black text-[18px] text-slate-800 flex items-center gap-2">
                            <Package size={18} className="text-blue-500" /> Rack {rack.rack_id}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleOpenRackModal(rack)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit size={14} /></button>
                            <button onClick={() => handleDeleteRack(rack.id, rack.rack_id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        
                        <div className="p-4 flex-1">
                          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Shelves</p>
                              <p className="font-bold text-[15px] text-slate-800 mt-0.5">{rack.total_shelves}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Boxes / Shelf</p>
                              <p className="font-bold text-[15px] text-slate-800 mt-0.5">{rack.boxes_per_shelf}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                          <button 
                            onClick={() => toggleRackStatus(rack.id)}
                            className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border transition-colors ${
                              rack.status === "Active" ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                            }`}
                            title="Click to toggle status"
                          >
                            {rack.status}
                          </button>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                            {rack.total_shelves * rack.boxes_per_shelf} Locations
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 1. ADD / EDIT USER PROFILE MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-[16px] text-slate-800">{editingUser ? 'Edit Admin Profile' : 'Add New Admin'}</h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-5">
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={userForm.name}
                  onChange={e => setUserForm({...userForm, name: e.target.value})}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Email Address (Login ID)</label>
                <input 
                  type="email" 
                  required
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. john@opticalerp.com"
                />
              </div>
              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Assign Role</label>
                <select 
                  value={userForm.roleId}
                  onChange={e => setUserForm({...userForm, roleId: e.target.value})}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-blue-500"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.role}</option>
                  ))}
                </select>
              </div>
              
              {/* Only show password and status when CREATING a new user */}
              {!editingUser && (
                <>
                  <div className="mb-4">
                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Initial Password</label>
                    <input 
                      type="text" 
                      required
                      value={userForm.password}
                      onChange={e => setUserForm({...userForm, password: e.target.value})}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-mono focus:outline-none focus:border-blue-500"
                      placeholder="Set login password"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Initial Status</label>
                    <select 
                      value={userForm.status}
                      onChange={e => setUserForm({...userForm, status: e.target.value})}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className="flex-1 vw-btn-primary h-10">{editingUser ? 'Update Profile' : 'Create Admin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SEPARATE PASSWORD CHANGE MODAL */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-amber-50 flex justify-between items-center">
              <h2 className="font-bold text-[15px] text-amber-900 flex items-center gap-2"><Lock size={16} /> Reset Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-amber-700 hover:text-amber-900"><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePassword} className="p-5">
              <div className="text-[13px] text-slate-600 mb-4">Set a new password for <span className="font-bold">{selectedUser.name}</span>.</div>
              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">New Password</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-mono focus:outline-none focus:border-amber-500"
                  placeholder="Enter new password"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[13px] rounded-lg h-10 transition-colors">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SEPARATE STATUS CHANGE MODAL */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
              <h2 className="font-bold text-[15px] text-emerald-900 flex items-center gap-2"><Power size={16} /> Change Status</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-emerald-700 hover:text-emerald-900"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveStatus} className="p-5">
              <div className="text-[13px] text-slate-600 mb-4">Update login access status for <span className="font-bold">{selectedUser.name}</span>.</div>
              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Account Status</label>
                <select 
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowStatusModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors">Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-[16px] text-slate-800">{editingRole ? 'Edit Role Permissions' : 'Create Custom Role'}</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Define access levels for team members</p>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveRole} className="flex-1 overflow-auto p-5 custom-scrollbar">
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Role Name</label>
                <input 
                  type="text" 
                  required
                  value={roleForm.role}
                  onChange={e => setRoleForm({...roleForm, role: e.target.value})}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-bold focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Data Entry Staff"
                />
              </div>
              <div className="mb-6">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea 
                  value={roleForm.desc}
                  onChange={e => setRoleForm({...roleForm, desc: e.target.value})}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-indigo-500 h-20 resize-none"
                  placeholder="What does this role do?"
                />
              </div>
              
              <div className="mb-2">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Select Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${roleForm.permissions.includes(perm) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                        {roleForm.permissions.includes(perm) && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span className="text-[13px] font-medium text-slate-700 select-none">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            </form>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
              <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
              <button onClick={handleSaveRole} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors shadow-sm shadow-indigo-600/20">
                {editingRole ? 'Update Role' : 'Save New Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Rack Modal */}
      {showRackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
              <h2 className="font-bold text-[16px] text-emerald-900">{editingRack ? 'Edit Storage Rack' : 'Map New Storage Rack'}</h2>
              <button onClick={() => setShowRackModal(false)} className="text-emerald-700 hover:text-emerald-900"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveRack} className="p-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Floor Number</label>
                  <select 
                    value={rackForm.floor}
                    onChange={e => setRackForm({...rackForm, floor: Number(e.target.value)})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>Floor 1</option>
                    <option value={2}>Floor 2</option>
                    <option value={3}>Floor 3</option>
                    <option value={4}>Floor 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Rack ID (e.g. F2, A)</label>
                  <input 
                    type="text" 
                    required
                    value={rackForm.rack_id}
                    onChange={e => setRackForm({...rackForm, rack_id: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-bold uppercase focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="F2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">No. of Shelves</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={rackForm.total_shelves}
                    onChange={e => setRackForm({...rackForm, total_shelves: Number(e.target.value)})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="e.g. 10"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Boxes per Shelf</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={rackForm.boxes_per_shelf}
                    onChange={e => setRackForm({...rackForm, boxes_per_shelf: Number(e.target.value)})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="e.g. 20"
                  />
                </div>
              </div>
              <div className="mb-4 bg-blue-50 border border-blue-100 p-3 rounded-lg text-[11px] text-blue-800">
                <span className="font-bold">Summary:</span> This will automatically generate <span className="font-bold text-blue-900">{rackForm.total_shelves * rackForm.boxes_per_shelf || 0}</span> unique box locations for this rack.
              </div>

              {!editingRack && (
                <div className="mb-6">
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Initial Status</label>
                  <select 
                    value={rackForm.status}
                    onChange={e => setRackForm({...rackForm, status: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRackModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors shadow-sm shadow-emerald-600/20">
                  {editingRack ? 'Update Rack Mapping' : 'Save Rack'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
