// Centralized Mock Service for Customers (Frontend-Only)
// This uses localStorage to persist data during UI development.

const STORAGE_KEY = "MOCK_CUSTOMERS_DB";

const initialMockData = [
  { id: "CUST-1045", name: "Rajat Gupta", company_name: "Rajat Vision", phone: "9876543211", city: "Delhi", gst_no: "27XXXXX1234X1ZX", approval_status: "PENDING_ACCOUNTS", is_active: false, created_at: "2026-10-05" },
  { id: "CUST-1046", name: "Suresh", company_name: "Clear Optics", phone: "9876543212", city: "Pune", gst_no: "Unregistered", approval_status: "PENDING_ACCOUNTS", is_active: false, created_at: "2026-10-04" },
  { id: "CUST-1000", name: "Rahul Sharma", company_name: "Vision Plus", phone: "9876543200", city: "Delhi", pricing_tier: "stock_platinum", credit_limit: 150000, approval_status: "APPROVED", is_active: true, created_at: "2026-09-01" },
  { id: "CUST-1001", name: "Amit Verma", company_name: "Sunshine Eyewear", phone: "9876543201", city: "Mumbai", pricing_tier: "stock_a_plus", credit_limit: 50000, approval_status: "APPROVED", is_active: true, created_at: "2026-09-05" },
  { id: "CUST-1002", name: "Priya Singh", company_name: "City Optics", phone: "9876543202", city: "Jaipur", pricing_tier: "stock_a", credit_limit: 25000, approval_status: "APPROVED", is_active: false, created_at: "2026-09-10" }, // Frozen
];

// Initialize DB
if (typeof window !== "undefined") {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMockData));
  }
}

const getDb = () => {
  if (typeof window === "undefined") return initialMockData;
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialMockData;
};

const saveDb = (data) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

// Simulate network delay
const delay = (ms) => new Promise(res => setTimeout(res, ms));

const MOCK_SUB_CUSTOMERS = [
  { id: "SUB-001", name: "Rahul (Staff)", phone: "9876543201", email: "rahul@visionplus.com", is_active: true, permissions: { hide_price: false, hide_stock: false, disable_cart: false, disable_order: false } },
  { id: "SUB-002", name: "Ajay (Manager)", phone: "9876543202", email: "ajay@visionplus.com", is_active: true, permissions: { hide_price: true, hide_stock: false, disable_cart: false, disable_order: false } }
];

const MOCK_ORDERS = [
  { id: "ORD-5091", date: "2026-10-04", total: 4500, status: "Delivered", items_count: 12 },
  { id: "ORD-5080", date: "2026-10-01", total: 12500, status: "Shipped", items_count: 45 },
  { id: "ORD-5012", date: "2026-09-25", total: 3200, status: "Delivered", items_count: 8 },
  { id: "ORD-4950", date: "2026-09-10", total: 8900, status: "Delivered", items_count: 22 },
  { id: "ORD-4801", date: "2026-08-28", total: 15400, status: "Delivered", items_count: 60 }
];

const MOCK_CART = [
  { id: "CART-1", product: "Kryptok SV CR39", qty: 10, price: 150, added_by: "CUST-1000 (Owner)" },
  { id: "CART-2", product: "Bifocal D-Top 1.56", qty: 5, price: 350, added_by: "SUB-001 (Staff)" }
];

export const customerService = {
  getCustomers: async () => {
    await delay(500);
    return { data: { list: getDb() } };
  },

  getCustomerById: async (customerId) => {
    await delay(500);
    const db = getDb();
    const customer = db.find(c => c.id === customerId);
    if (!customer) throw new Error("Customer not found");
    
    return {
      data: {
        ...customer,
        sub_customers: customerId === "CUST-1000" ? MOCK_SUB_CUSTOMERS : [],
        recent_orders: customerId === "CUST-1000" ? MOCK_ORDERS : [],
        cart_items: customerId === "CUST-1000" ? MOCK_CART : [],
        device_id: "DEV-A8F9-2X3M (MacBook Pro)",
        device_last_login: "2026-10-05 10:30 AM",
        payment_term: customer.payment_term || "cash",
        stock_grade: customer.stock_grade || "Medium"
      }
    };
  },

  createCustomer: async (customerData) => {
    await delay(800);
    const db = getDb();
    const newCustomer = {
      ...customerData,
      id: `CUST-${1000 + db.length + 10}`,
      approval_status: "PENDING_ACCOUNTS",
      is_active: false,
      created_at: new Date().toISOString().split("T")[0]
    };
    db.unshift(newCustomer);
    saveDb(db);
    return { data: newCustomer };
  },

  approveCustomer: async (customerId, approvalData) => {
    await delay(800);
    const db = getDb();
    const index = db.findIndex(c => c.id === customerId);
    if (index === -1) throw new Error("Customer not found");
    
    db[index] = {
      ...db[index],
      ...approvalData,
      approval_status: "APPROVED",
      is_active: true
    };
    saveDb(db);
    return { data: db[index] };
  },

  freezeCustomer: async (customerId) => {
    await delay(600);
    const db = getDb();
    const index = db.findIndex(c => c.id === customerId);
    if (index === -1) throw new Error("Customer not found");
    
    db[index].is_active = false;
    saveDb(db);
    return { data: db[index] };
  },

  unfreezeCustomer: async (customerId) => {
    await delay(600);
    const db = getDb();
    const index = db.findIndex(c => c.id === customerId);
    if (index === -1) throw new Error("Customer not found");
    
    db[index].is_active = true;
    saveDb(db);
    return { data: db[index] };
  },

  generateInvite: async (inviteData) => {
    await delay(600);
    // Just return a fake link
    return { data: { link: `https://vishaloptical.com/onboard/inv-${Math.random().toString(36).substring(7)}` } };
  },

  createSubCustomer: async (customerId, subData) => {
    await delay(800);
    
    // Add to our mock array so UI updates
    MOCK_SUB_CUSTOMERS.push({
      id: `SUB-00${MOCK_SUB_CUSTOMERS.length + 1}`,
      name: subData.name,
      phone: subData.phone,
      email: subData.email,
      is_active: true,
      permissions: {
        allow_cart: subData.permissions?.allow_cart ?? true,
        allow_order: subData.permissions?.allow_order ?? false,
        allow_stock: subData.permissions?.allow_stock ?? true
      }
    });

    return { data: { message: "Sub-customer created successfully" } };
  },

  updateSubCustomer: async (subId, updateData) => {
    await delay(500);
    const index = MOCK_SUB_CUSTOMERS.findIndex(s => s.id === subId);
    if (index !== -1) {
      MOCK_SUB_CUSTOMERS[index] = { ...MOCK_SUB_CUSTOMERS[index], ...updateData, permissions: { ...MOCK_SUB_CUSTOMERS[index].permissions, ...updateData.permissions } };
      
      // If reassigned, remove it from MOCK_SUB_CUSTOMERS if it's no longer under CUST-1000
      // In a real DB it changes the parent_customer_id, but here it's static array for CUST-1000
      if (updateData.parent_customer_id && updateData.parent_customer_id !== "CUST-1000") {
        MOCK_SUB_CUSTOMERS.splice(index, 1);
      }
    }
    return { data: { message: "Sub-customer updated" } };
  },

  toggleSubCustomerStatus: async (subId) => {
    await delay(500);
    const index = MOCK_SUB_CUSTOMERS.findIndex(s => s.id === subId);
    if (index !== -1) {
      MOCK_SUB_CUSTOMERS[index].is_active = !MOCK_SUB_CUSTOMERS[index].is_active;
    }
    return { data: { message: "Status updated" } };
  },

  resetDevice: async (customerId) => {
    await delay(600);
    return { data: { message: "Device reset successfully" } };
  },

  requestLimitIncrease: async (customerId, data) => {
    await delay(800);
    return { data: { message: "Limit increase requested" } };
  }
};
