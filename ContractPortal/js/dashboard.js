// ================================================
// Dashboard — Contracts & Invoices
// Firebase Free Tier: load-once, filter/sort/search client-side
// ================================================

const CONTRACTS_CACHE_KEY = "bigbass_contracts_cache";
const INVOICES_CACHE_KEY = "bigbass_invoices_cache";
const PAGE_SIZE = 15;

let allContracts = [];
let filteredContracts = [];
let contractPage = 0;
let contractSortField = "createdAt";
let contractSortDir = "desc";

let allInvoices = [];
let filteredInvoices = [];
let invoicePage = 0;
let invoiceSortField = "createdAt";
let invoiceSortDir = "desc";

let currentView = "contract"; // "contract" | "contracts" | "invoices"

// ===== VIEW SWITCHING =====
function showView(view) {
  currentView = view;

  // Update nav buttons
  document.querySelectorAll(".btn-nav").forEach(b => b.classList.remove("active"));
  const navMap = { contract: "navNewContract", contracts: "navContracts", invoices: "navInvoices" };
  const activeBtn = document.getElementById(navMap[view]);
  if (activeBtn) activeBtn.classList.add("active");

  // Hide all views
  const mainContent = document.querySelector(".main-content");
  const progressBar = document.getElementById("progressBar");
  const contractDash = document.getElementById("contractDashboard");
  const invoiceDash = document.getElementById("invoiceDashboard");
  const invoicePanel = document.getElementById("invoicePanel");

  if (mainContent) mainContent.style.display = "none";
  if (progressBar) progressBar.style.display = "none";
  if (contractDash) contractDash.classList.remove("active");
  if (invoiceDash) invoiceDash.classList.remove("active");
  if (invoicePanel) invoicePanel.classList.remove("active");

  switch (view) {
    case "contract":
      if (mainContent) mainContent.style.display = "";
      if (progressBar) progressBar.style.display = "";
      break;
    case "contracts":
      if (contractDash) contractDash.classList.add("active");
      loadContracts();
      break;
    case "invoices":
      if (invoiceDash) invoiceDash.classList.add("active");
      loadInvoices();
      break;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== CONTRACT DASHBOARD =====
async function loadContracts(forceRefresh) {
  if (!forceRefresh) {
    // Try cache
    const cached = sessionStorage.getItem(CONTRACTS_CACHE_KEY);
    if (cached) {
      try {
        allContracts = JSON.parse(cached);
        filterContracts();
        return;
      } catch (e) { /* ignore */ }
    }
  }

  if (typeof firebase === "undefined" || !firebase.apps.length) return;
  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("contracts").orderBy("createdAt", "desc").get();
    allContracts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString(),
      sentAt: doc.data().sentAt ? doc.data().sentAt.toDate().toISOString() : null,
      signedAt: doc.data().signedAt ? doc.data().signedAt.toDate().toISOString() : null,
      viewedAt: doc.data().viewedAt ? doc.data().viewedAt.toDate().toISOString() : null,
    }));

    sessionStorage.setItem(CONTRACTS_CACHE_KEY, JSON.stringify(allContracts));
  } catch (e) {
    console.error("Failed to load contracts:", e);
  }

  filterContracts();
}

function refreshContracts() {
  sessionStorage.removeItem(CONTRACTS_CACHE_KEY);
  loadContracts(true);
}

function filterContracts() {
  const search = (document.getElementById("contractSearch")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("contractStatusFilter")?.value || "";
  const typeFilter = document.getElementById("contractTypeFilter")?.value || "";

  filteredContracts = allContracts.filter(c => {
    if (search && !(c.customerName || "").toLowerCase().includes(search)) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (typeFilter && c.contractType !== typeFilter) return false;
    return true;
  });

  sortContractsArray();
  contractPage = 0;
  renderContractStats();
  renderContractTable();
}

function sortContracts(field) {
  if (contractSortField === field) {
    contractSortDir = contractSortDir === "asc" ? "desc" : "asc";
  } else {
    contractSortField = field;
    contractSortDir = field === "customerName" ? "asc" : "desc";
  }
  sortContractsArray();
  renderContractTable();
}

function sortContractsArray() {
  filteredContracts.sort((a, b) => {
    let aVal = a[contractSortField] || "";
    let bVal = b[contractSortField] || "";

    if (contractSortField === "totalPrice") {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = (bVal || "").toLowerCase();
    }

    if (aVal < bVal) return contractSortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return contractSortDir === "asc" ? 1 : -1;
    return 0;
  });
}

function renderContractStats() {
  const stats = document.getElementById("contractStats");
  if (!stats) return;

  const counts = { sent: 0, viewed: 0, signed: 0 };
  allContracts.forEach(c => { if (counts[c.status] !== undefined) counts[c.status]++; });

  stats.innerHTML = `
    <div class="stat-badge">Total <span class="stat-count">${allContracts.length}</span></div>
    <div class="stat-badge">Sent <span class="stat-count">${counts.sent}</span></div>
    <div class="stat-badge">Viewed <span class="stat-count">${counts.viewed}</span></div>
    <div class="stat-badge">Signed <span class="stat-count">${counts.signed}</span></div>
  `;
}

function renderContractTable() {
  const tbody = document.getElementById("contractTableBody");
  const empty = document.getElementById("contractEmpty");
  const table = document.getElementById("contractTable");
  const pagination = document.getElementById("contractPagination");
  if (!tbody) return;

  const start = contractPage * PAGE_SIZE;
  const pageItems = filteredContracts.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(filteredContracts.length / PAGE_SIZE);

  if (pageItems.length === 0) {
    table.style.display = "none";
    pagination.style.display = "none";
    empty.style.display = "block";
    return;
  }

  table.style.display = "";
  empty.style.display = "none";

  tbody.innerHTML = pageItems.map(c => {
    const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "";
    const price = c.totalPrice ? `$${parseFloat(c.totalPrice).toFixed(2)}` : "—";

    return `
      <tr onclick="toggleContractDetail('${c.id}')">
        <td data-label="Customer">${escapeHtml(c.customerName || "Unknown")}</td>
        <td data-label="Type"><span class="type-badge type-${c.contractType || 'general'}">${c.contractType || "general"}</span></td>
        <td data-label="Status"><span class="status-badge status-${c.status || 'sent'}">${c.status || "sent"}</span></td>
        <td data-label="Created">${date}</td>
        <td data-label="Total">${price}</td>
        <td data-label="Actions">
          <div class="dashboard-actions-cell">
            ${c.pdfUrl ? `<a href="${escapeHtml(c.pdfUrl)}" target="_blank" class="btn-action-sm" onclick="event.stopPropagation()">PDF</a>` : ""}
            ${c.signingToken && c.status !== "signed" ? `<button class="btn-action-sm" onclick="event.stopPropagation();copyContractLink('${c.signingToken}')">Copy Link</button>` : ""}
            ${c.signingToken && c.status === "sent" ? `<button class="btn-action-sm" onclick="event.stopPropagation();resendContract('${c.id}')">Resend</button>` : ""}
          </div>
        </td>
      </tr>
      <tr class="quick-detail-row" id="detail-${c.id}">
        <td colspan="6" class="quick-detail-cell">
          <div class="quick-detail-grid">
            <div class="detail-item"><div class="detail-label">Customer</div><div class="detail-value">${escapeHtml(c.customerName || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(c.customerEmail || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${escapeHtml(c.customerPhone || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Address</div><div class="detail-value">${escapeHtml(c.customerAddress || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Location</div><div class="detail-value">${escapeHtml(c.locationOfServices || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Timeframe</div><div class="detail-value">${escapeHtml(c.estimatedTimeframe || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Created</div><div class="detail-value">${c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</div></div>
            <div class="detail-item"><div class="detail-label">Signed</div><div class="detail-value">${c.signedAt ? new Date(c.signedAt).toLocaleString() : "Not yet"}</div></div>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Pagination
  if (totalPages > 1) {
    pagination.style.display = "flex";
    pagination.innerHTML = `
      <button onclick="contractPage--;renderContractTable()" ${contractPage === 0 ? "disabled" : ""}>← Previous</button>
      <span class="page-info">Page ${contractPage + 1} of ${totalPages}</span>
      <button onclick="contractPage++;renderContractTable()" ${contractPage >= totalPages - 1 ? "disabled" : ""}>Next →</button>
    `;
  } else {
    pagination.style.display = "none";
  }
}

function toggleContractDetail(id) {
  const row = document.getElementById(`detail-${id}`);
  if (row) row.classList.toggle("open");
}

function copyContractLink(token) {
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "");
  const url = `${baseUrl}/sign.html?token=${token}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast("Signing link copied!", "success");
  }).catch(() => {
    showToast("Failed to copy link.", "error");
  });
}

async function resendContract(contractId) {
  const contract = allContracts.find(c => c.id === contractId);
  if (!contract || !contract.signingToken) return;

  if (typeof emailjs === "undefined" || EMAILJS_CONFIG.publicKey === "YOUR_EMAILJS_PUBLIC_KEY") {
    showToast("EmailJS not configured.", "error");
    return;
  }

  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "");
  const signingUrl = `${baseUrl}/sign.html?token=${contract.signingToken}`;

  try {
    let companyEmail = "";
    const db = firebase.firestore();
    const settingsDoc = await db.collection("settings").doc("company").get();
    if (settingsDoc.exists) companyEmail = settingsDoc.data().companyEmail || "";

    await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      {
        to_name: contract.customerName,
        to_email: contract.customerEmail,
        company_email: companyEmail,
        contract_type: contract.contractType === "insurance" ? "Insurance Services" : "General Services",
        customer_name: contract.customerName,
        customer_email: contract.customerEmail,
        pdf_link: signingUrl,
      },
      EMAILJS_CONFIG.publicKey
    );

    showToast("Signing email resent to " + contract.customerEmail, "success");
  } catch (e) {
    console.error("Resend failed:", e);
    showToast("Failed to resend email.", "error");
  }
}

// ===== INVOICE DASHBOARD =====
async function loadInvoices(forceRefresh) {
  if (!forceRefresh) {
    const cached = sessionStorage.getItem(INVOICES_CACHE_KEY);
    if (cached) {
      try {
        allInvoices = JSON.parse(cached);
        filterInvoices();
        return;
      } catch (e) { /* ignore */ }
    }
  }

  if (typeof firebase === "undefined" || !firebase.apps.length) return;
  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("invoices").orderBy("createdAt", "desc").get();
    allInvoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString(),
      paidAt: doc.data().paidAt ? doc.data().paidAt.toDate().toISOString() : null,
    }));

    sessionStorage.setItem(INVOICES_CACHE_KEY, JSON.stringify(allInvoices));
  } catch (e) {
    console.error("Failed to load invoices:", e);
  }

  filterInvoices();
}

function refreshInvoices() {
  sessionStorage.removeItem(INVOICES_CACHE_KEY);
  loadInvoices(true);
}

function filterInvoices() {
  const search = (document.getElementById("invoiceSearch")?.value || "").toLowerCase();
  const statusFilter = document.getElementById("invoiceStatusFilter")?.value || "";

  filteredInvoices = allInvoices.filter(inv => {
    if (search && !(inv.customerName || "").toLowerCase().includes(search)) return false;
    if (statusFilter) {
      // Calculate overdue
      const effectiveStatus = getInvoiceStatus(inv);
      if (statusFilter !== effectiveStatus) return false;
    }
    return true;
  });

  sortInvoicesArray();
  invoicePage = 0;
  renderInvoiceStats();
  renderInvoiceTable();
}

function getInvoiceStatus(inv) {
  if (inv.status === "paid") return "paid";
  if (inv.dueDate && new Date(inv.dueDate) < new Date()) return "overdue";
  return "unpaid";
}

function sortInvoices(field) {
  if (invoiceSortField === field) {
    invoiceSortDir = invoiceSortDir === "asc" ? "desc" : "asc";
  } else {
    invoiceSortField = field;
    invoiceSortDir = field === "customerName" || field === "invoiceNumber" ? "asc" : "desc";
  }
  sortInvoicesArray();
  renderInvoiceTable();
}

function sortInvoicesArray() {
  filteredInvoices.sort((a, b) => {
    let aVal = a[invoiceSortField] || "";
    let bVal = b[invoiceSortField] || "";

    if (invoiceSortField === "total") {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = (bVal || "").toLowerCase();
    }

    if (aVal < bVal) return invoiceSortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return invoiceSortDir === "asc" ? 1 : -1;
    return 0;
  });
}

function renderInvoiceStats() {
  const stats = document.getElementById("invoiceStats");
  if (!stats) return;

  let unpaidTotal = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  allInvoices.forEach(inv => {
    if (inv.status === "paid") {
      paidCount++;
    } else {
      unpaidCount++;
      unpaidTotal += parseFloat(inv.total) || 0;
    }
  });

  stats.innerHTML = `
    <div class="stat-badge">Total <span class="stat-count">${allInvoices.length}</span></div>
    <div class="stat-badge">Unpaid <span class="stat-count">${unpaidCount}</span></div>
    <div class="stat-badge">Paid <span class="stat-count">${paidCount}</span></div>
    <div class="stat-badge">Outstanding <span class="stat-count">$${unpaidTotal.toFixed(2)}</span></div>
  `;
}

function renderInvoiceTable() {
  const tbody = document.getElementById("invoiceTableBody");
  const empty = document.getElementById("invoiceEmpty");
  const table = document.getElementById("invoiceTable");
  const pagination = document.getElementById("invoicePagination");
  if (!tbody) return;

  const start = invoicePage * PAGE_SIZE;
  const pageItems = filteredInvoices.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);

  if (pageItems.length === 0) {
    table.style.display = "none";
    pagination.style.display = "none";
    empty.style.display = "block";
    return;
  }

  table.style.display = "";
  empty.style.display = "none";

  tbody.innerHTML = pageItems.map(inv => {
    const invDate = inv.invoiceDate ? new Date(inv.invoiceDate + "T00:00:00").toLocaleDateString() : "";
    const dueDate = inv.dueDate ? new Date(inv.dueDate + "T00:00:00").toLocaleDateString() : "";
    const total = inv.total ? `$${parseFloat(inv.total).toFixed(2)}` : "—";
    const effectiveStatus = getInvoiceStatus(inv);

    return `
      <tr onclick="toggleInvoiceDetail('${inv.id}')">
        <td data-label="Customer">${escapeHtml(inv.customerName || "Unknown")}</td>
        <td data-label="Invoice #">${escapeHtml(inv.invoiceNumber || "")}</td>
        <td data-label="Date">${invDate}</td>
        <td data-label="Due Date">${dueDate}</td>
        <td data-label="Total">${total}</td>
        <td data-label="Status"><span class="status-badge status-${effectiveStatus}">${effectiveStatus}</span></td>
        <td data-label="Actions">
          <div class="dashboard-actions-cell">
            <button class="btn-action-sm" onclick="event.stopPropagation();toggleInvoiceStatus('${inv.id}')">${inv.status === "paid" ? "Mark Unpaid" : "Mark Paid"}</button>
            ${inv.pdfUrl ? `<a href="${escapeHtml(inv.pdfUrl)}" target="_blank" class="btn-action-sm" onclick="event.stopPropagation()">PDF</a>` : ""}
          </div>
        </td>
      </tr>
      <tr class="quick-detail-row" id="inv-detail-${inv.id}">
        <td colspan="7" class="quick-detail-cell">
          <div class="quick-detail-grid">
            <div class="detail-item"><div class="detail-label">Customer</div><div class="detail-value">${escapeHtml(inv.customerName || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${escapeHtml(inv.customerEmail || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${escapeHtml(inv.customerPhone || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Address</div><div class="detail-value">${escapeHtml(inv.customerAddress || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Job Location</div><div class="detail-value">${escapeHtml(inv.jobLocation || "")}</div></div>
            <div class="detail-item"><div class="detail-label">PO #</div><div class="detail-value">${escapeHtml(inv.poNumber || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Terms</div><div class="detail-value">${escapeHtml(inv.terms || "")}</div></div>
            <div class="detail-item"><div class="detail-label">Notes</div><div class="detail-value">${escapeHtml(inv.notes || "")}</div></div>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Pagination
  if (totalPages > 1) {
    pagination.style.display = "flex";
    pagination.innerHTML = `
      <button onclick="invoicePage--;renderInvoiceTable()" ${invoicePage === 0 ? "disabled" : ""}>← Previous</button>
      <span class="page-info">Page ${invoicePage + 1} of ${totalPages}</span>
      <button onclick="invoicePage++;renderInvoiceTable()" ${invoicePage >= totalPages - 1 ? "disabled" : ""}>Next →</button>
    `;
  } else {
    pagination.style.display = "none";
  }
}

function toggleInvoiceDetail(id) {
  const row = document.getElementById(`inv-detail-${id}`);
  if (row) row.classList.toggle("open");
}

async function toggleInvoiceStatus(id) {
  const inv = allInvoices.find(i => i.id === id);
  if (!inv) return;

  const newStatus = inv.status === "paid" ? "unpaid" : "paid";

  try {
    const db = firebase.firestore();
    const updateData = { status: newStatus };
    if (newStatus === "paid") {
      updateData.paidAt = firebase.firestore.FieldValue.serverTimestamp();
    } else {
      updateData.paidAt = null;
    }

    await db.collection("invoices").doc(id).update(updateData);

    // Update local cache
    inv.status = newStatus;
    inv.paidAt = newStatus === "paid" ? new Date().toISOString() : null;
    sessionStorage.setItem(INVOICES_CACHE_KEY, JSON.stringify(allInvoices));

    filterInvoices();
    showToast(`Invoice marked as ${newStatus}.`, "success");
  } catch (e) {
    console.error("Failed to update invoice status:", e);
    showToast("Failed to update status.", "error");
  }
}

// ===== SHOW NAV ON AUTH =====
function showDashboardNav() {
  const nav = document.getElementById("dashboardNav");
  if (nav) nav.style.display = "flex";
}

function hideDashboardNav() {
  const nav = document.getElementById("dashboardNav");
  if (nav) nav.style.display = "none";
}
