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

  // Update nav buttons (desktop)
  document.querySelectorAll(".btn-nav").forEach(b => b.classList.remove("active"));
  const navMap = { contract: "navNewContract", contracts: "navContracts", invoices: "navInvoices" };
  const activeBtn = document.getElementById(navMap[view]);
  if (activeBtn) activeBtn.classList.add("active");

  // Update mobile nav buttons
  document.querySelectorAll(".mobile-nav-btn").forEach(b => b.classList.remove("active"));
  const mobileNavMap = { contract: "mobileNavNewContract", contracts: "mobileNavContracts", invoices: "mobileNavInvoices" };
  const activeMobileBtn = document.getElementById(mobileNavMap[view]);
  if (activeMobileBtn) activeMobileBtn.classList.add("active");

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
    const isSigned = c.status === "signed";
    const hasSignatureData = c.signatureData && (c.signatureData.signature || c.signatureData.initials);
    const hasSignedPdf = c.signedPdfUrl && c.signedPdfUrl.length > 0;

    return `
      <tr class="contract-row" data-contract-id="${c.id}">
        <td data-label="Customer">${escapeHtml(c.customerName || "Unknown")}</td>
        <td data-label="Type"><span class="type-badge type-${c.contractType || 'general'}">${c.contractType || "general"}</span></td>
        <td data-label="Status"><span class="status-badge status-${c.status || 'sent'}">${c.status || "sent"}</span></td>
        <td data-label="Created">${date}</td>
        <td data-label="Total">${price}</td>
        <td data-label="Actions">
          <div class="dashboard-actions-cell">
            ${isSigned && hasSignatureData ? `<button class="btn-action-sm btn-action-primary" onclick="event.stopPropagation();downloadSignedContract('${c.id}')">Download Signed</button>` : ""}
            ${hasSignedPdf && !hasSignatureData ? `<a href="${escapeHtml(c.signedPdfUrl)}" target="_blank" class="btn-action-sm btn-action-primary" onclick="event.stopPropagation()">Download Signed</a>` : ""}
            ${c.pdfUrl && !isSigned ? `<a href="${escapeHtml(c.pdfUrl)}" target="_blank" class="btn-action-sm" onclick="event.stopPropagation()">View PDF</a>` : ""}
            ${c.signingToken && !isSigned ? `<button class="btn-action-sm" onclick="event.stopPropagation();copyContractLink('${c.signingToken}')">Copy Link</button>` : ""}
            ${c.signingToken && c.status === "sent" ? `<button class="btn-action-sm" onclick="event.stopPropagation();resendContract('${c.id}')">Resend</button>` : ""}
            <button class="btn-action-sm btn-expand-details" onclick="event.stopPropagation();toggleContractDetail('${c.id}')">Details</button>
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
  const url = `${SIGNING_BASE_URL}/sign.html?token=${token}`;
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

  const signingUrl = `${SIGNING_BASE_URL}/sign.html?token=${contract.signingToken}`;

  try {
    let companyEmail = "";
    const db = firebase.firestore();
    const settingsDoc = await db.collection("settings").doc("company").get();
    if (settingsDoc.exists) companyEmail = settingsDoc.data().companyEmail || "";

    await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.signingTemplateId,
      {
        to_name: contract.customerName,
        to_email: contract.customerEmail,
        company_email: companyEmail,
        contract_type: contract.contractType === "insurance" ? "Insurance Services" : "General Services",
        customer_name: contract.customerName,
        customer_email: contract.customerEmail,
        signing_link: signingUrl,
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
      <tr class="invoice-row" data-invoice-id="${inv.id}">
        <td data-label="Customer">${escapeHtml(inv.customerName || "Unknown")}</td>
        <td data-label="Invoice #">${escapeHtml(inv.invoiceNumber || "")}</td>
        <td data-label="Date">${invDate}</td>
        <td data-label="Due Date">${dueDate}</td>
        <td data-label="Total">${total}</td>
        <td data-label="Status"><span class="status-badge status-${effectiveStatus}">${effectiveStatus}</span></td>
        <td data-label="Actions">
          <div class="dashboard-actions-cell">
            <button class="btn-action-sm" onclick="event.stopPropagation();toggleInvoiceStatus('${inv.id}')">${inv.status === "paid" ? "Mark Unpaid" : "Mark Paid"}</button>
            ${inv.pdfUrl ? `<a href="${escapeHtml(inv.pdfUrl)}" target="_blank" class="btn-action-sm" onclick="event.stopPropagation()">Download</a>` : ""}
            <button class="btn-action-sm btn-expand-details" onclick="event.stopPropagation();toggleInvoiceDetail('${inv.id}')">Details</button>
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
  
  // Also show mobile bottom nav
  const mobileNav = document.getElementById("mobileNav");
  if (mobileNav) mobileNav.style.display = "flex";
}

function hideDashboardNav() {
  const nav = document.getElementById("dashboardNav");
  if (nav) nav.style.display = "none";
  
  // Also hide mobile bottom nav
  const mobileNav = document.getElementById("mobileNav");
  if (mobileNav) mobileNav.style.display = "none";
}

// ===== DOWNLOAD SIGNED CONTRACT PDF =====
async function downloadSignedContract(contractId) {
  const contract = allContracts.find(c => c.id === contractId);
  if (!contract) {
    showToast("Contract not found.", "error");
    return;
  }

  if (!contract.signatureData) {
    showToast("No signature data available.", "error");
    return;
  }

  // Show loading state
  showToast("Generating PDF...", "info");

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "letter");

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const cw = pageW - margin * 2;
    let y = margin;

    // --- Helpers ---
    function checkPage(needed) {
      if (y + needed > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
    }

    function addText(text, fontSize, isBold, color) {
      pdf.setFontSize(fontSize || 10);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");
      if (color) pdf.setTextColor(color[0], color[1], color[2]);
      else pdf.setTextColor(33, 37, 41);
      const lines = pdf.splitTextToSize(text, cw);
      const lh = (fontSize || 10) * 0.42;
      for (let i = 0; i < lines.length; i++) {
        checkPage(lh + 1);
        pdf.text(lines[i], margin, y);
        y += lh;
      }
    }

    function addCenteredText(text, fontSize, isBold, color) {
      pdf.setFontSize(fontSize || 10);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");
      if (color) pdf.setTextColor(color[0], color[1], color[2]);
      else pdf.setTextColor(33, 37, 41);
      checkPage(fontSize * 0.5);
      pdf.text(text, pageW / 2, y, { align: "center" });
      y += (fontSize || 10) * 0.42;
    }

    function addSpacer(mm) { y += mm; }

    function addLine() {
      checkPage(4);
      pdf.setDrawColor(27, 107, 58);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 3;
    }

    function addField(label, value) {
      checkPage(8);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(73, 80, 87);
      pdf.text(label, margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(33, 37, 41);
      pdf.text(String(value || "N/A"), margin + 52, y);
      y += 5;
    }

    // --- Header ---
    addCenteredText("SERVICES CONTRACT", 16, true, [27, 107, 58]);
    addSpacer(2);
    addCenteredText("SIGNED COPY", 10, false, [27, 107, 58]);
    addSpacer(2);
    addLine();
    addSpacer(1);
    addCenteredText("Big Bass Tree Services, LLC", 11, true);
    addCenteredText("1726 Lyman Lane, Clinton, LA 70722", 9, false, [108, 117, 125]);
    addSpacer(6);

    // --- Customer Info ---
    addText("CUSTOMER INFORMATION", 10, true, [27, 107, 58]);
    addSpacer(2);
    addField("Customer Name:", contract.customerName);
    addField("Phone:", contract.customerPhone);
    addField("Address:", contract.customerAddress);
    addField("Email:", contract.customerEmail);
    addField("Location of Services:", contract.locationOfServices);
    addField("Estimated Timeframe:", contract.estimatedTimeframe);
    
    // Insurance fields if applicable
    if (contract.contractType === "insurance") {
      addField("Date of Loss:", contract.dateOfLoss);
      addField("Cause of Loss:", contract.causeOfLoss);
      addField("Insurance Carrier:", contract.insuranceCarrier);
      addField("Policy Number:", contract.policyNumber);
      addField("Claim Number:", contract.claimNumber);
      addField("Adjuster Name:", contract.adjusterName);
      addField("Adjuster Phone:", contract.adjusterPhone);
      addField("Adjuster Email:", contract.adjusterEmail);
    }

    if (contract.scopeOfServices) addField("Scope of Services:", contract.scopeOfServices);
    if (contract.additionalServices) addField("Additional Services:", contract.additionalServices);
    if (contract.totalPrice) addField("Total Price:", "$" + parseFloat(contract.totalPrice).toFixed(2));

    addSpacer(6);
    addLine();
    addSpacer(3);

    // --- Legal Sections ---
    if (typeof LEGAL_SECTIONS !== "undefined") {
      const legalKeys = [
        ["SCOPE OF THE WORK, TERMS AND PAYMENT", "scopeTerms"],
        ["LIEN", "lien"],
        ["DELIVERY OF THE PROPERTY", "deliveryOfProperty"],
        ["PERMITS", "permits"],
        ["PROPERTY LINES AND RESTRICTIONS", "propertyLines"],
        ["INHERENT HAZARDS AND RISKS", "inherentHazards"],
        ["EXPENSES FOR UNUSUAL OR UNANTICIPATED CONDITIONS", "unusualExpenses"],
        ["PERFORMANCE OF THE WORK", "performanceOfWork"],
        ["TARPS", "tarps"],
        ["NO LIABILITY", "noLiability"],
        ["ACT OF GOD", "actOfGod"],
        ["INDEMNIFICATION", "indemnification"],
        ["LIMITATION OF RECOVERY", "limitationOfRecovery"],
        ["ELECTRONIC COMMUNICATIONS", "electronicComms"],
        ["SEVERABILITY AND INTERPRETATION", "severability"],
        ["AUTHORITY AND CONSENT", "authority"]
      ];

      for (const [title, key] of legalKeys) {
        if (!LEGAL_SECTIONS[key]) continue;
        addSpacer(2);
        addText(title, 9, true, [27, 107, 58]);
        addSpacer(1);
        const raw = (LEGAL_SECTIONS[key] || "").replace(/<[^>]*>/g, "").trim();
        const cleanText = raw.replace(/^[A-Z\s,&:]+:\s*/, "");
        addText(cleanText, 8.5, false);
        addSpacer(3);
      }
    }

    // --- Rate Schedule ---
    if (contract.rates && contract.rates.length) {
      const selected = contract.rates.filter(r => r.selected);
      if (selected.length) {
        addSpacer(4);
        addLine();
        addSpacer(2);
        addText("RATE SCHEDULE", 11, true, [27, 107, 58]);
        addSpacer(1);
        addText("All rates are an eight (8) hour minimum as is customary in the industry.", 8.5, false, [108, 117, 125]);
        addSpacer(4);

        // Table header
        checkPage(10);
        pdf.setFillColor(27, 107, 58);
        pdf.rect(margin, y - 1, cw, 7, "F");
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text("#", margin + 2, y + 3.5);
        pdf.text("Item / Service", margin + 14, y + 3.5);
        pdf.text("Price", pageW - margin - 2, y + 3.5, { align: "right" });
        y += 8;

        let total = 0;
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(33, 37, 41);
        for (const r of selected) {
          const price = parseFloat(r.price) || 0;
          total += price;
          checkPage(7);
          pdf.setFontSize(8.5);
          pdf.text(String(r.id) + ".", margin + 2, y);
          const qtyText = r.qty ? ` (${r.qty} people)` : "";
          const nameLines = pdf.splitTextToSize((r.name || "Item") + qtyText, cw - 50);
          for (let i = 0; i < nameLines.length; i++) {
            pdf.text(nameLines[i], margin + 14, y + (i * 4));
          }
          pdf.text("$" + price.toFixed(2), pageW - margin - 2, y, { align: "right" });
          y += Math.max(nameLines.length * 4, 5) + 2;
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.2);
          pdf.line(margin, y - 1, pageW - margin, y - 1);
        }
        // Total row
        checkPage(10);
        pdf.setFillColor(240, 247, 242);
        pdf.rect(margin, y, cw, 7, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(27, 107, 58);
        pdf.text("TOTAL", margin + 14, y + 4.5);
        pdf.text("$" + total.toFixed(2), pageW - margin - 2, y + 4.5, { align: "right" });
        y += 10;
      }
    }

    // --- Signature area ---
    addSpacer(6);
    addLine();
    addSpacer(4);
    addText("ELECTRONIC SIGNATURE", 11, true, [27, 107, 58]);
    addSpacer(2);
    addText("This contract was electronically signed.", 9, false);
    
    const signDate = contract.signatureData.signatureDate || 
                     (contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : "");
    addField("Date Signed:", signDate);
    addSpacer(4);

    // Embed signature images
    try {
      if (contract.signatureData.initials) {
        addText("Initials:", 9, true);
        addSpacer(1);
        checkPage(18);
        pdf.addImage(contract.signatureData.initials, "PNG", margin, y, 40, 15);
        y += 18;
      }
    } catch (e) { console.warn("Failed to add initials:", e); }

    try {
      if (contract.signatureData.signature) {
        addText("Signature:", 9, true);
        addSpacer(1);
        checkPage(24);
        pdf.addImage(contract.signatureData.signature, "PNG", margin, y, 60, 20);
        y += 24;
      }
    } catch (e) { console.warn("Failed to add signature:", e); }

    // --- Footer ---
    addSpacer(8);
    addCenteredText("Big Bass Tree Services, LLC — Thank you for your business.", 8, false, [108, 117, 125]);

    // Save the PDF
    const safeName = (contract.customerName || "customer").replace(/[^a-zA-Z0-9]/g, "_");
    pdf.save(`BigBass_SignedContract_${safeName}.pdf`);
    showToast("PDF downloaded successfully!", "success");

  } catch (e) {
    console.error("PDF generation failed:", e);
    showToast("Failed to generate PDF. Please try again.", "error");
  }
}
