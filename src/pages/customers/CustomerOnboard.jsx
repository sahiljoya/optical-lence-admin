import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Link as LinkIcon,
  UserPlus,
  FileText,
  Loader2,
  Upload,
  Trash2,
  Eye,
  Check,
  Phone,
  MessageSquare,
  Truck,
  Image as ImageIcon,
  MapPin,
  Building2,
  CreditCard,
  X,
  ExternalLink,
} from "lucide-react";
import { customerService } from "@/services/customerService";
import { courierService } from "@/services/courierService";
import { uploadImageApi } from "@/config/apiClient";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import "@/styles/veriwide.css";

export function CustomerOnboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPermission("CREATE_CUSTOMER")) {
      notify.error("Access denied. Only Owner, Accounts, and Sales team can onboard customers.");
      navigate({ to: "/customers" });
    }
  }, []);

  const [activeTab, setActiveTab] = useState("direct"); // "direct" | "invite"
  const [inviteLink, setInviteLink] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const [uploadingField, setUploadingField] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null); // { url, title }

  const [formData, setFormData] = useState({
    company_name: "",
    name: "",
    phone: "",
    whatsapp_number: "",
    landline_number: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    preferred_courier: "",
    gst_no: "",
    gst_image: "",
    pan_number: "",
    pan_image: "",
    adhar_number: "",
    adhar_image: "",
    visiting_card: "",
    profilePic: "",
  });

  const [inviteData, setInviteData] = useState({ name: "", phone: "", email: "" });

  // Fetch active couriers for preferred courier dropdown
  useEffect(() => {
    courierService
      .getCouriers()
      .then((res) => {
        const list = res?.data || [];
        setCouriers(Array.isArray(list) ? list.filter((c) => c.is_active !== false) : []);
      })
      .catch(() => setCouriers([]));
  }, []);

  // Quick helper to sync Phone -> WhatsApp Number
  const copyPhoneToWhatsapp = () => {
    if (!formData.phone) {
      notify.warning("Please enter Phone Number first.");
      return;
    }
    setFormData((prev) => ({ ...prev, whatsapp_number: prev.phone }));
  };

  // Upload handler for KYC documents & images
  const handleFileUpload = async (field, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify.warning("File size should not exceed 10MB.");
      return;
    }
    setUploadingField(field);
    try {
      const res = await uploadImageApi(file);
      const url = res?.data?.imageUrl || res?.imageUrl;
      if (url) {
        setFormData((prev) => ({ ...prev, [field]: url }));
        notify.success("Document uploaded successfully!");
      } else {
        notify.error("Failed to upload document. Please try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      notify.error(err?.message || "Error uploading document.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleRemoveFile = (field) => {
    setFormData((prev) => ({ ...prev, [field]: "" }));
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const res = await customerService.generateInvite(inviteData);
      setInviteLink(res.data.inviteLink);
    } catch (err) {
      notify.error(err.message || "Failed to generate invite link.");
    } finally {
      setIsPending(false);
    }
  };

  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      notify.warning("Owner Name and Phone Number are required.");
      return;
    }
    setIsPending(true);
    try {
      await customerService.createCustomer(formData);
      notify.success("Customer Onboarding submitted! Sent to Accounts Team for Verification.");
      navigate({ to: "/customers" });
    } catch (err) {
      notify.error(err.message || "Failed to submit customer onboarding.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-1 sm:py-3 px-1 sm:px-0">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-6">
        <Link
          to="/customers"
          className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 bg-white transition-colors shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
          title="Back to Customers"
        >
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 truncate">
            Onboard New Customer
          </h1>
          <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Register a new optical retailer or generate an invite link for self KYC submission.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3.5 sm:mb-6 border-b border-border overflow-x-auto whitespace-nowrap pb-px scrollbar-none">
        <button
          onClick={() => setActiveTab("direct")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 text-[11px] sm:text-xs md:text-sm font-semibold transition-all border-b-2 -mb-[1px] cursor-pointer shrink-0 ${
            activeTab === "direct"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserPlus size={15} className="sm:w-4 sm:h-4" /> Direct Registration
        </button>
        <button
          onClick={() => setActiveTab("invite")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 text-[11px] sm:text-xs md:text-sm font-semibold transition-all border-b-2 -mb-[1px] cursor-pointer shrink-0 ${
            activeTab === "invite"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <LinkIcon size={15} className="sm:w-4 sm:h-4" /> Generate Invite Link
        </button>
      </div>

      {/* Main Form Card */}
      <div className="vw-card overflow-hidden" style={{ padding: 0 }}>
        {activeTab === "direct" && (
          <div className="p-3.5 sm:p-6 lg:p-8">
            <div className="mb-5 sm:mb-7 pb-3.5 sm:pb-5 border-b border-border">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 mb-1">
                Mode A: Staff On-Field Registration
              </h2>
              <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-500 leading-relaxed">
                Fill out the customer profile and KYC documents. After submission, this account will automatically go to the Accounts Team for credit limit &amp; pricing tier assignment.
              </p>
            </div>

            <form onSubmit={handleDirectSubmit} className="space-y-6 sm:space-y-8">
              {/* Section 1: Basic & Contact Details */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 mb-3 sm:mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={15} className="text-blue-600" /> 1. Basic &amp; Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      Company / Shop Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      required
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="e.g. Vision Plus Optical"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      Owner / Contact Person Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      Primary Phone Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      type="tel"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                      placeholder="9876543210"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs sm:text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                        <MessageSquare size={13} className="text-emerald-600" /> WhatsApp Number
                      </label>
                      <button
                        type="button"
                        onClick={copyPhoneToWhatsapp}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                      >
                        Same as Phone
                      </button>
                    </div>
                    <input
                      value={formData.whatsapp_number}
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      type="tel"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      Landline / Alternate Phone <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      value={formData.landline_number}
                      onChange={(e) => setFormData({ ...formData, landline_number: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                      type="tel"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                      placeholder="e.g. 02224567890"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      type="email"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="e.g. store@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Shop Location & Delivery */}
              <div className="pt-5 sm:pt-6 border-t border-border">
                <h3 className="text-xs font-bold text-slate-700 mb-3 sm:mb-4 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={15} className="text-indigo-600" /> 2. Shop Location &amp; Courier Preference
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      Full Shop Address / Landmark
                    </label>
                    <input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="e.g. Shop No. 12, Main Optical Market, Near Clock Tower"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      City
                    </label>
                    <input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="e.g. Mumbai"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      State
                    </label>
                    <input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                      placeholder="e.g. Maharashtra"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5">
                      Pincode
                    </label>
                    <input
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      type="text"
                      className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                      placeholder="e.g. 400001"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Truck size={13} className="text-amber-600" /> Preferred Courier / Transport
                    </label>
                    {couriers.length > 0 ? (
                      <select
                        value={formData.preferred_courier}
                        onChange={(e) => setFormData({ ...formData, preferred_courier: e.target.value })}
                        className="w-full h-10 sm:h-11 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 shadow-xs"
                      >
                        <option value="">-- Select Courier / Transport --</option>
                        {couriers.map((c) => (
                          <option key={c._id || c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                        <option value="Self Pickup">Self Pickup</option>
                        <option value="Local Delivery / Tempo">Local Delivery / Tempo</option>
                      </select>
                    ) : (
                      <input
                        value={formData.preferred_courier}
                        onChange={(e) => setFormData({ ...formData, preferred_courier: e.target.value })}
                        type="text"
                        className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                        placeholder="e.g. Trackon, DTDC, Tirupati"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: KYC Details & Documents Upload */}
              <div className="pt-5 sm:pt-6 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-1">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={15} className="text-emerald-600" /> 3. KYC Details &amp; Document Proofs
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Upload clear photos or PDFs (max 10MB each)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  {/* Card 1: GST */}
                  <div className="border border-slate-200 rounded-2xl p-3.5 sm:p-4 bg-slate-50/70 flex flex-col justify-between space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        GST Number &amp; Certificate
                      </label>
                      <p className="text-[10px] text-slate-500 mb-2">Optional if unregistered / composite.</p>
                      <input
                        value={formData.gst_no}
                        onChange={(e) => setFormData({ ...formData, gst_no: e.target.value.toUpperCase() })}
                        type="text"
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-mono uppercase shadow-xs mb-2.5"
                        placeholder="27ABCDE1234F1Z5"
                      />
                    </div>

                    <DocumentUploadBox
                      label="GST Certificate"
                      imageUrl={formData.gst_image}
                      uploading={uploadingField === "gst_image"}
                      onUpload={(file) => handleFileUpload("gst_image", file)}
                      onRemove={() => handleRemoveFile("gst_image")}
                      onPreview={() => setPreviewDoc({ url: formData.gst_image, title: "GST Certificate" })}
                    />
                  </div>

                  {/* Card 2: PAN Card */}
                  <div className="border border-slate-200 rounded-2xl p-3.5 sm:p-4 bg-slate-50/70 flex flex-col justify-between space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        PAN Number &amp; Card
                      </label>
                      <p className="text-[10px] text-slate-500 mb-2">Business or proprietor's PAN card.</p>
                      <input
                        value={formData.pan_number}
                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                        type="text"
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-mono uppercase shadow-xs mb-2.5"
                        placeholder="ABCDE1234F"
                      />
                    </div>

                    <DocumentUploadBox
                      label="PAN Card Photo"
                      imageUrl={formData.pan_image}
                      uploading={uploadingField === "pan_image"}
                      onUpload={(file) => handleFileUpload("pan_image", file)}
                      onRemove={() => handleRemoveFile("pan_image")}
                      onPreview={() => setPreviewDoc({ url: formData.pan_image, title: "PAN Card" })}
                    />
                  </div>

                  {/* Card 3: Aadhaar Card */}
                  <div className="border border-slate-200 rounded-2xl p-3.5 sm:p-4 bg-slate-50/70 flex flex-col justify-between space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Aadhaar Number &amp; Card
                      </label>
                      <p className="text-[10px] text-slate-500 mb-2">Owner's 12-digit Aadhaar card.</p>
                      <input
                        value={formData.adhar_number}
                        onChange={(e) => setFormData({ ...formData, adhar_number: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                        type="text"
                        className="w-full h-9 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-mono shadow-xs mb-2.5"
                        placeholder="1234 5678 9012"
                      />
                    </div>

                    <DocumentUploadBox
                      label="Aadhaar Card Photo"
                      imageUrl={formData.adhar_image}
                      uploading={uploadingField === "adhar_image"}
                      onUpload={(file) => handleFileUpload("adhar_image", file)}
                      onRemove={() => handleRemoveFile("adhar_image")}
                      onPreview={() => setPreviewDoc({ url: formData.adhar_image, title: "Aadhaar Card" })}
                    />
                  </div>
                </div>

                {/* Additional Photos: Visiting Card & Profile/Shop Front */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-4 sm:mt-5">
                  <div className="border border-slate-200 rounded-2xl p-3.5 sm:p-4 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">
                        Visiting Card / Shop Board Photo
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">Recommended for On-Field Staff</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Snap or upload the retailer's business card or outdoor shop banner for physical verification.
                    </p>
                    <DocumentUploadBox
                      label="Visiting Card / Board Photo"
                      imageUrl={formData.visiting_card}
                      uploading={uploadingField === "visiting_card"}
                      onUpload={(file) => handleFileUpload("visiting_card", file)}
                      onRemove={() => handleRemoveFile("visiting_card")}
                      onPreview={() => setPreviewDoc({ url: formData.visiting_card, title: "Visiting Card" })}
                    />
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-3.5 sm:p-4 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">
                        Profile / Shop Front Photo
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">Optional</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Retailer owner profile photo or front entrance view of the optical counter.
                    </p>
                    <DocumentUploadBox
                      label="Profile / Shop Front"
                      imageUrl={formData.profilePic}
                      uploading={uploadingField === "profilePic"}
                      onUpload={(file) => handleFileUpload("profilePic", file)}
                      onRemove={() => handleRemoveFile("profilePic")}
                      onPreview={() => setPreviewDoc({ url: formData.profilePic, title: "Profile / Shop Photo" })}
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-5 sm:pt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-border mt-6 sm:mt-8">
                <Link
                  to="/customers"
                  className="vw-btn-secondary h-10 sm:h-11 px-5 text-xs sm:text-[13px] font-semibold border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center rounded-xl cursor-pointer shadow-xs"
                >
                  Cancel
                </Link>
                <button
                  disabled={isPending || uploadingField !== null}
                  type="submit"
                  className="vw-btn-primary h-10 sm:h-11 px-6 flex items-center justify-center gap-2 text-xs sm:text-[13px] font-semibold rounded-xl shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Submit to Accounts Verification
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "invite" && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6 sm:mb-7 pb-4 sm:pb-5 border-b border-border">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                Mode B: Invitation Link
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed">
                Generate a unique, 1-time use link valid for 44 hours. Send this to the optical customer so they can complete and upload their own KYC details.
              </p>
            </div>

            <form onSubmit={handleGenerateLink} className="w-full max-w-lg space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Customer / Owner Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  required
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  type="text"
                  className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                  placeholder="Rahul Sharma"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Customer Phone <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  required
                  value={inviteData.phone}
                  onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  type="tel"
                  className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 font-mono transition-all shadow-xs"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Customer Email <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  type="email"
                  className="w-full h-10 sm:h-11 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs sm:text-sm bg-white text-slate-900 placeholder:text-slate-400 transition-all shadow-xs"
                  placeholder="customer@example.com"
                />
              </div>

              <div className="pt-2 sm:pt-3">
                <button
                  disabled={isPending}
                  type="submit"
                  className="w-full vw-btn-primary h-10 sm:h-11 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold rounded-xl shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />} Generate Invite Link
                </button>
              </div>
            </form>

            {inviteLink && (
              <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-xl max-w-lg">
                <h4 className="text-xs sm:text-[13px] font-bold text-emerald-800 mb-2.5">
                  Invite Link Generated Successfully!
                </h4>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 h-10 px-3.5 bg-white border border-emerald-200 rounded-lg text-xs sm:text-[13px] font-mono text-emerald-900 outline-none select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      notify.success("Invite link copied to clipboard!");
                    }}
                    className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-xs sm:text-[13px] font-semibold hover:bg-emerald-700 transition-colors shrink-0 cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
                <p className="text-[11px] text-emerald-700 mt-2 font-medium">
                  Expires in 44 hours • Single use only.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                {previewDoc.title}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-100 min-h-[260px] max-h-[70vh]">
              {previewDoc.url?.toLowerCase().endsWith(".pdf") ? (
                <iframe src={previewDoc.url} className="w-full h-96 rounded-lg" title={previewDoc.title} />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-xs"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Document Upload Box Component
function DocumentUploadBox({ label, imageUrl, uploading, onUpload, onRemove, onPreview }) {
  const inputId = `upload-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return (
    <div className="w-full">
      {imageUrl ? (
        <div className="relative border border-emerald-200 bg-white rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {imageUrl.toLowerCase().endsWith(".pdf") ? (
              <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 font-bold text-[10px]">
                PDF
              </div>
            ) : (
              <img
                src={imageUrl}
                alt={label}
                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
              />
            )}
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-800 truncate block">
                {label}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <Check size={11} /> Attached
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onPreview}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Preview Document"
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Remove Document"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            id={inputId}
            type="file"
            accept="image/*,application/pdf"
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onUpload(e.target.files[0]);
                e.target.value = "";
              }
            }}
            className="hidden"
          />
          <label
            htmlFor={inputId}
            className={`border border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/40 transition-all rounded-xl p-2.5 flex items-center justify-center gap-2 text-center cursor-pointer shadow-2xs ${
              uploading ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin text-blue-600" />
                <span className="text-xs font-semibold text-blue-600">Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Upload {label}</span>
              </>
            )}
          </label>
        </div>
      )}
    </div>
  );
}
