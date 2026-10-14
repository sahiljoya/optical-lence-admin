import { useState, useEffect } from "react";
import { ShieldCheck, UserPlus, Key, Mail, Edit, Trash2, CheckCircle2, ShieldAlert, Plus, X, Lock, Power, Package, Loader2 } from "lucide-react";
import { notify } from "@/lib/notify";
import { userService } from "@/services/userService";
import { warehouseApi } from "@/services/productApi";
import "@/styles/veriwide.css";

const formatPermissionLabel = (perm) =>
  perm.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function Settings() {
  const [activeTab, setActiveTab] = useState("users");

  // Data State
  const [roles, setRoles] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);

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
  const [actionLoading, setActionLoading] = useState(false);

  // Form States
  const [userForm, setUserForm] = useState({ name: "", phone: "", email: "", password: "", roleId: "" });
  const [roleForm, setRoleForm] = useState({ role: "", desc: "", permissions: [] });

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await userService.getEmployees({});
      setAdmins((res.data?.list || []).map(a => ({ ...a, id: a._id })));
    } catch (err) {
      console.error(err);
      setAdmins([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await userService.getRoles();
      setRoles((res.data || []).map(r => ({ ...r, id: r._id })));
    } catch (err) {
      console.error(err);
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await userService.getPermissions();
      setAllPermissions(res.data || []);
    } catch (err) {
      console.error(err);
      setAllPermissions([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchPermissions();
    fetchRacks();
  }, []);

  // ---------------- USER LOGIC ----------------
  const handleOpenUserModal = (user = null) => {
    if (user) {
      if (user.role && user.role.name === "admin") {
        return notify.warning("Owner accounts are protected and cannot be edited here.");
      }
      setEditingUser(user.id);
      setUserForm({ name: user.name, phone: user.phone, email: user.email || "", roleId: user.role?._id || "", password: "" });
    } else {
      setEditingUser(null);
      setUserForm({ name: "", phone: "", email: "", password: "", roleId: roles[0]?.id || "" });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editingUser) {
        await userService.updateEmployee({
          userId: editingUser,
          name: userForm.name,
          email: userForm.email,
          role_id: userForm.roleId,
        });
        notify.success("Admin profile updated successfully!");
      } else {
        if (!userForm.password) {
          notify.warning("Password is required for new admins.");
          setActionLoading(false);
          return;
        }
        await userService.createEmployee({
          name: userForm.name,
          phone: userForm.phone,
          email: userForm.email,
          password: userForm.password,
          role_id: userForm.roleId,
        });
        notify.success("New team member added successfully!");
      }
      setShowUserModal(false);
      await fetchUsers();
    } catch (err) {
      notify.error(err.message || "Failed to save team member.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- SEPARATE ACTION: CHANGE PASSWORD ---
  const handleOpenPasswordModal = (user) => {
    if (user.role && user.role.name === "admin") {
      return notify.warning("Owner accounts are protected and cannot be edited here.");
    }
    setSelectedUser(user);
    setNewPassword("");
    setShowPasswordModal(true);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return notify.warning("Please enter a new password");
    setActionLoading(true);
    try {
      await userService.updateEmployee({ userId: selectedUser.id, password: newPassword });
      notify.success(`Password for ${selectedUser.name} has been successfully changed.`);
      setShowPasswordModal(false);
    } catch (err) {
      notify.error(err.message || "Failed to change password.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- SEPARATE ACTION: CHANGE STATUS ---
  const handleOpenStatusModal = (user) => {
    if (user.role && user.role.name === "admin") {
      return notify.warning("Owner accounts are protected and cannot be edited here.");
    }
    setSelectedUser(user);
    setNewStatus(user.is_active ? "Active" : "Inactive");
    setShowStatusModal(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await userService.updateEmployee({ userId: selectedUser.id, is_active: newStatus === "Active" });
      notify.success(`${selectedUser.name}'s status changed to ${newStatus}.`);
      setShowStatusModal(false);
      await fetchUsers();
    } catch (err) {
      notify.error(err.message || "Failed to change status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.role && user.role.name === "admin") {
      return notify.warning("Owner accounts are protected and cannot be removed here.");
    }
    if (!window.confirm(`Are you sure you want to deactivate ${user.name}?`)) return;
    try {
      await userService.updateEmployee({ userId: user.id, is_active: false });
      notify.success(`${user.name} has been deactivated.`);
      await fetchUsers();
    } catch (err) {
      notify.error(err.message || "Failed to deactivate team member.");
    }
  };

  // ---------------- ROLE LOGIC ----------------
  const handleOpenRoleModal = (role = null) => {
    if (role) {
      if (role.name === "admin") return notify.warning("This is the protected Owner role and cannot be edited.");
      setEditingRole(role.id);
      setRoleForm({ role: role.name, desc: role.description || "", permissions: role.permissions || [] });
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

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.role) return notify.warning("Role Name is required");
    if (roleForm.permissions.length === 0) return notify.warning("Please select at least one permission");

    setActionLoading(true);
    try {
      if (editingRole) {
        await userService.updateRole({
          role_id: editingRole,
          name: roleForm.role,
          permissions: roleForm.permissions,
          description: roleForm.desc,
        });
        notify.success("Role updated successfully!");
      } else {
        await userService.createRole({
          name: roleForm.role,
          permissions: roleForm.permissions,
          description: roleForm.desc,
        });
        notify.success("New Role created successfully!");
      }
      setShowRoleModal(false);
      await fetchRoles();
    } catch (err) {
      notify.error(err.message || "Failed to save role.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_custom === false) return notify.warning("This is a protected system role and cannot be deleted.");
    if (admins.some(a => a.role?._id === role.id)) {
      return notify.warning(`Cannot delete role. There are users currently assigned to ${role.name}.`);
    }
    if (!window.confirm(`Are you sure you want to delete the ${role.name} role?`)) return;
    try {
      await userService.deleteRole(role.id);
      notify.success("Role deleted.");
      await fetchRoles();
    } catch (err) {
      notify.error(err.message || "Failed to delete role.");
    }
  };

  // ---------------- WAREHOUSE RACK LOGIC ----------------
  // Individual boxes live as WarehouseLocation docs in the backend; this tab manages them
  // rack-at-a-time via the bulk generate/status/delete endpoints, not box-by-box.
  const [racks, setRacks] = useState([]);
  const [loadingRacks, setLoadingRacks] = useState(true);
  const [showRackModal, setShowRackModal] = useState(false);
  const [editingRack, setEditingRack] = useState(null);

  const [rackForm, setRackForm] = useState({ floor: 1, rack_id: "", total_shelves: 10, boxes_per_shelf: 10, status: "Active" });

  const fetchRacks = async () => {
    setLoadingRacks(true);
    try {
      const res = await warehouseApi.getRackSummary();
      setRacks(res.error === false ? res.data : []);
    } catch (err) {
      console.error(err);
      setRacks([]);
    } finally {
      setLoadingRacks(false);
    }
  };

  const groupedRacks = racks.reduce((acc, rack) => {
    if (!acc[rack.floor]) acc[rack.floor] = [];
    acc[rack.floor].push(rack);
    return acc;
  }, {});

  const handleOpenRackModal = (rack = null) => {
    if (rack) {
      setEditingRack({ floor: rack.floor, rack: rack.rack });
      setRackForm({ floor: rack.floor, rack_id: rack.rack, total_shelves: rack.shelf_count, boxes_per_shelf: rack.box_count, status: rack.status });
    } else {
      setEditingRack(null);
      setRackForm({ floor: 1, rack_id: "", total_shelves: 10, boxes_per_shelf: 10, status: "Active" });
    }
    setShowRackModal(true);
  };

  const handleSaveRack = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await warehouseApi.bulkCreateRack({
        floor: rackForm.floor,
        rack: rackForm.rack_id,
        shelf_count: rackForm.total_shelves,
        box_count: rackForm.boxes_per_shelf
      });
      if (res.error === false) {
        const { created, skipped_duplicates } = res.data;
        notify.success(
          editingRack
            ? `Rack ${rackForm.rack_id} extended: ${created} new box location(s) added.`
            : `Rack ${rackForm.rack_id} mapped: ${created} box locations created${skipped_duplicates ? ` (${skipped_duplicates} already existed)` : ""}.`
        );
        setShowRackModal(false);
        fetchRacks();
      } else {
        notify.error(res.message || "Failed to save rack.");
      }
    } catch (err) {
      notify.error("Error saving rack.");
    }
    setActionLoading(false);
  };

  const handleDeleteRack = async (floor, rack) => {
    if (!window.confirm(`Are you sure you want to completely remove Rack ${rack} (Floor ${floor})? This permanently deletes all its box locations.`)) return;
    try {
      const res = await warehouseApi.deleteRack({ floor, rack });
      if (res.error === false) {
        notify.success(`Rack ${rack} deleted (${res.data.deleted} locations removed).`);
        fetchRacks();
      } else {
        notify.error(res.message || "Failed to delete rack.");
      }
    } catch (err) {
      notify.error("Error deleting rack.");
    }
  };

  const toggleRackStatus = async (floor, rack, currentStatus) => {
    try {
      const res = await warehouseApi.setRackStatus({ floor, rack, is_active: currentStatus !== "Active" });
      if (res.error === false) {
        fetchRacks();
      } else {
        notify.error(res.message || "Failed to update rack status.");
      }
    } catch (err) {
      notify.error("Error updating rack status.");
    }
  };

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
                  {loadingUsers ? (
                    <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-500 text-[13px]">Loading team members...</td></tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-5 py-8 text-center text-slate-500 text-[13px]">No users found.</td>
                    </tr>
                  ) : admins.map(admin => {
                    const isOwner = admin.role && admin.role.name === "admin";
                    return (
                    <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[14px]">
                            {admin.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[14px] text-slate-900">{admin.name}</div>
                            <div className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Mail size={12} /> {admin.email || admin.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className={isOwner ? 'text-rose-500' : 'text-blue-500'} />
                          <span className="font-semibold text-[13px] text-slate-800">{admin.role?.name || "Unknown Role"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          admin.is_active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isOwner ? (
                          <span className="text-[12px] text-muted-foreground italic">Protected Owner account</span>
                        ) : (
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
                          <button onClick={() => handleDeleteUser(admin)} className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-100 rounded transition-colors" title="Deactivate Admin">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROLES TAB */}
        {activeTab === "roles" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingRoles ? (
              <div className="col-span-full text-center text-slate-500 text-[13px] py-8">Loading roles...</div>
            ) : roles.map((role) => {
              const isAdminRole = role.name === "admin";
              const isSystemRole = role.is_custom === false;
              return (
              <div key={role.id} className="vw-card flex flex-col h-full relative overflow-hidden group">
                <div className={`h-1.5 w-full ${isAdminRole ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-black text-[16px] text-slate-900 flex items-center gap-2">
                      {isAdminRole ? <ShieldAlert className="text-rose-500" /> : <ShieldCheck className="text-indigo-500" />}
                      {role.name}
                    </h3>
                    <div className="flex gap-1">
                      {!isAdminRole && (
                        <button onClick={() => handleOpenRoleModal(role)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit size={14} /></button>
                      )}
                      {!isSystemRole && (
                        <button onClick={() => handleDeleteRole(role)} className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-500 mb-5 flex-1">{role.description || (isAdminRole ? "Protected Owner role — full access, not editable." : isSystemRole ? "Default role template — editable, but cannot be deleted." : "No description provided.")}</p>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 h-[150px] overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Permissions ({role.permissions?.length || 0})</p>
                    <ul className="space-y-2">
                      {(role.permissions || []).map((perm, pIdx) => (
                        <li key={pIdx} className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                          <CheckCircle2 size={14} className={isAdminRole ? 'text-rose-500' : 'text-emerald-500'} /> {formatPermissionLabel(perm)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 text-[11px] font-semibold text-slate-400">
                    {admins.filter(a => a.role?._id === role.id).length} Users assigned
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        {/* LOCATIONS TAB (WAREHOUSE RACKS) */}
        {activeTab === "locations" && (
          <div className="space-y-8">
            {loadingRacks ? (
              <div className="vw-card p-10 text-center text-slate-500 text-[14px] flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading racks...</div>
            ) : Object.keys(groupedRacks).length === 0 ? (
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
                      <div key={`${rack.floor}-${rack.rack}`} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-slate-50">
                          <div className="font-black text-[18px] text-slate-800 flex items-center gap-2">
                            <Package size={18} className="text-blue-500" /> Rack {rack.rack}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleOpenRackModal(rack)} title="Add more shelves to this rack" className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit size={14} /></button>
                            <button onClick={() => handleDeleteRack(rack.floor, rack.rack)} title="Delete this rack entirely" className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        <div className="p-4 flex-1">
                          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Shelves</p>
                              <p className="font-bold text-[15px] text-slate-800 mt-0.5">{rack.shelf_count}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Boxes / Shelf</p>
                              <p className="font-bold text-[15px] text-slate-800 mt-0.5">{rack.box_count}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                          <button
                            onClick={() => toggleRackStatus(rack.floor, rack.rack, rack.status)}
                            className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase border transition-colors ${
                              rack.status === "Active" ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                            }`}
                            title="Click to toggle status"
                          >
                            {rack.status}
                          </button>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                            {rack.total_boxes} Locations
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
              {!editingUser && (
                <div className="mb-4">
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Phone Number (Login ID)</label>
                  <input
                    type="tel"
                    required
                    value={userForm.phone}
                    onChange={e => setUserForm({...userForm, phone: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Email Address (Optional)</label>
                <input
                  type="email"
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
                  {roles.filter(r => r.name !== "admin").map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {!editingUser && (
                <div className="mb-6">
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
              )}

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 vw-btn-primary h-10 flex items-center justify-center gap-2 disabled:opacity-60">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : (editingUser ? 'Update Profile' : 'Create Admin')}
                </button>
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
                <button type="submit" disabled={actionLoading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[13px] rounded-lg h-10 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Reset Password"}
                </button>
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
                <button type="submit" disabled={actionLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Update Status"}
                </button>
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
                  {allPermissions.map(perm => (
                    <label key={perm} onClick={() => handleTogglePermission(perm)} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${roleForm.permissions.includes(perm) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                        {roleForm.permissions.includes(perm) && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span className="text-[13px] font-medium text-slate-700 select-none">{formatPermissionLabel(perm)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </form>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-white">
              <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
              <button onClick={handleSaveRole} disabled={actionLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-60">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : (editingRole ? 'Update Role' : 'Save New Role')}
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
              <h2 className="font-bold text-[16px] text-emerald-900">{editingRack ? `Extend Rack ${editingRack.rack}` : 'Map New Storage Rack'}</h2>
              <button onClick={() => setShowRackModal(false)} className="text-emerald-700 hover:text-emerald-900"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveRack} className="p-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {editingRack && (
                <div className="mb-4 bg-amber-50 border border-amber-200 p-3 rounded-lg text-[11px] text-amber-800">
                  Existing box locations can't be resized or renumbered here (that would corrupt stock already linked to them). You can only add more shelves to this rack, at its existing {rackForm.boxes_per_shelf} boxes/shelf.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Floor Number</label>
                  <select
                    value={rackForm.floor}
                    disabled={!!editingRack}
                    onChange={e => setRackForm({...rackForm, floor: Number(e.target.value)})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
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
                    disabled={!!editingRack}
                    value={rackForm.rack_id}
                    onChange={e => setRackForm({...rackForm, rack_id: e.target.value})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] font-bold uppercase focus:outline-none focus:border-emerald-500 transition-colors disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="F2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">{editingRack ? 'New Total Shelves' : 'No. of Shelves'}</label>
                  <input
                    type="number"
                    required
                    min={editingRack ? rackForm.total_shelves : 1}
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
                    disabled={!!editingRack}
                    value={rackForm.boxes_per_shelf}
                    onChange={e => setRackForm({...rackForm, boxes_per_shelf: Number(e.target.value)})}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-emerald-500 transition-colors disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="e.g. 20"
                  />
                </div>
              </div>
              <div className="mb-6 bg-blue-50 border border-blue-100 p-3 rounded-lg text-[11px] text-blue-800">
                <span className="font-bold">Summary:</span> {editingRack
                  ? <>This will add <span className="font-bold text-blue-900">{Math.max(0, (rackForm.total_shelves - (editingRack ? racks.find(r => r.floor === rackForm.floor && r.rack === rackForm.rack_id)?.shelf_count || 0 : 0)) * rackForm.boxes_per_shelf)}</span> new box locations to this rack.</>
                  : <>This will automatically generate <span className="font-bold text-blue-900">{rackForm.total_shelves * rackForm.boxes_per_shelf || 0}</span> unique box locations for this rack.</>}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRackModal(false)} className="flex-1 vw-btn-secondary h-10">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-lg h-10 transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50">
                  {actionLoading ? 'Saving...' : (editingRack ? 'Add Shelves' : 'Save Rack')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
