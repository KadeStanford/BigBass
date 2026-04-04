// ================================================
// Invoice Creator — Big Bass Tree Services, LLC
// ================================================

let invoiceLineItems = [];
let invoiceCounter = 1;

const INVOICE_AUTOSAVE_KEY = "bigbass_invoice_autosave";
let invoiceAutosaveTimer = null;

// Predefined service items from the rate schedule
const PRESET_SERVICES = [
  { name: "135 Ton Knuckle Boom Crane with Grapple Saw", rate: "" },
  { name: "50 Ton Telescopic Truck Crane", rate: "" },
  { name: "Skid Steer", rate: "" },
  { name: "Stump Grinder", rate: "" },
  { name: "Aerial Lift / Bucket Truck", rate: "" },
  { name: "Labor Per Person", rate: "" },
  { name: "Ground Protection Mats", rate: "" },
  { name: "Tarps", rate: "" },
  { name: "Debris Hauling", rate: "" },
  { name: "Travel", rate: "" },
  { name: "Tree Removal", rate: "" },
  { name: "Tree Trimming / Pruning", rate: "" },
  { name: "Emergency Services", rate: "" },
  { name: "Lot Clearing", rate: "" },
  { name: "Storm Damage Cleanup", rate: "" },
];

// ===== INVOICE PANEL =====
function openInvoiceCreator() {
  // Hide the progress bar
  document.getElementById("progressBar").style.display = "none";

  // Hide all step panels
  document
    .querySelectorAll(".step-panel")
    .forEach((p) => p.classList.remove("active"));

  // Show the invoice panel
  document.getElementById("invoicePanel").classList.add("active");

  // Initialize if first time
  if (invoiceLineItems.length === 0) {
    addInvoiceLineItem();
  }

  // Generate invoice number and set dates
  initInvoiceDefaults();

  // Restore autosave if available
  restoreInvoiceAutosave();

  // Set up autosave
  const invoicePanel = document.getElementById("invoicePanel");
  invoicePanel.addEventListener("input", scheduleInvoiceAutosave);
  invoicePanel.addEventListener("change", scheduleInvoiceAutosave);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeInvoiceCreator() {
  document.getElementById("invoicePanel").classList.remove("active");
  document.getElementById("progressBar").style.display = "";
  document.getElementById("step1").classList.add("active");

  // Deselect invoice card
  document
    .querySelectorAll(".contract-card")
    .forEach((c) => c.classList.remove("selected"));

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initInvoiceDefaults() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const invoiceNumField = document.getElementById("invoiceNumber");
  if (!invoiceNumField.value) {
    const num = String(Math.floor(Math.random() * 9000) + 1000);
    invoiceNumField.value = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${num}`;
  }

  const invoiceDateField = document.getElementById("invoiceDate");
  if (!invoiceDateField.value) {
    invoiceDateField.value = today;
  }

  // Set due date based on payment terms
  updateDueDate();
}

function updateDueDate() {
  const invoiceDate = document.getElementById("invoiceDate").value;
  const terms = document.getElementById("invoiceTerms").value;

  if (!invoiceDate) return;

  const date = new Date(invoiceDate + "T00:00:00");
  let daysToAdd = 0;

  switch (terms) {
    case "due-on-receipt":
      daysToAdd = 0;
      break;
    case "net-10":
      daysToAdd = 10;
      break;
    case "net-15":
      daysToAdd = 15;
      break;
    case "net-30":
      daysToAdd = 30;
      break;
    case "net-60":
      daysToAdd = 60;
      break;
    case "custom":
      return; // Don't auto-fill
  }

  date.setDate(date.getDate() + daysToAdd);
  document.getElementById("invoiceDueDate").value = date
    .toISOString()
    .split("T")[0];
}

// ===== LINE ITEMS =====
function addInvoiceLineItem(preset) {
  const id = invoiceCounter++;
  invoiceLineItems.push({
    id,
    description: preset ? preset.name : "",
    qty: 1,
    rate: preset ? preset.rate : "",
  });

  renderLineItems();
  return id;
}

function removeInvoiceLineItem(id) {
  invoiceLineItems = invoiceLineItems.filter((item) => item.id !== id);
  if (invoiceLineItems.length === 0) {
    addInvoiceLineItem();
  }
  renderLineItems();
  calculateInvoiceTotal();
}

function renderLineItems() {
  const container = document.getElementById("invoiceLineItemsBody");
  container.innerHTML = invoiceLineItems
    .map(
      (item, index) => `
    <tr class="invoice-line-row" data-id="${item.id}">
      <td class="line-num">${index + 1}</td>
      <td class="line-desc-cell">
        <div class="line-desc-wrapper">
          <input type="text" class="line-desc-input" value="${escapeHtmlAttr(item.description)}" 
            placeholder="Description of service..." 
            oninput="updateLineItem(${item.id}, 'description', this.value)"
            list="servicePresets" />
        </div>
      </td>
      <td class="line-qty-cell">
        <input type="number" class="line-qty-input" value="${item.qty}" min="0" step="0.5"
          oninput="updateLineItem(${item.id}, 'qty', this.value)" />
      </td>
      <td class="line-rate-cell">
        <div class="price-input line-rate-input-wrap">
          <span class="currency">$</span>
          <input type="number" class="line-rate-input" value="${item.rate}" step="0.01" min="0"
            placeholder="0.00"
            oninput="updateLineItem(${item.id}, 'rate', this.value)" />
        </div>
      </td>
      <td class="line-amount-cell">$${calculateLineAmount(item)}</td>
      <td class="line-actions-cell">
        <button type="button" class="btn-remove-line" onclick="removeInvoiceLineItem(${item.id})" title="Remove line">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");

  calculateInvoiceTotal();
}

function escapeHtmlAttr(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function updateLineItem(id, field, value) {
  const item = invoiceLineItems.find((i) => i.id === id);
  if (item) {
    item[field] = value;
    // Update the amount cell for this row
    const row = document.querySelector(`.invoice-line-row[data-id="${id}"]`);
    if (row) {
      row.querySelector(".line-amount-cell").textContent =
        `$${calculateLineAmount(item)}`;
    }
    calculateInvoiceTotal();
  }
}

function calculateLineAmount(item) {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  return (qty * rate).toFixed(2);
}

function calculateInvoiceTotal() {
  let subtotal = 0;
  invoiceLineItems.forEach((item) => {
    subtotal += parseFloat(calculateLineAmount(item));
  });

  const taxRate = parseFloat(document.getElementById("invoiceTaxRate").value) || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  document.getElementById("invoiceSubtotal").textContent =
    `$${subtotal.toFixed(2)}`;
  document.getElementById("invoiceTaxAmount").textContent =
    `$${tax.toFixed(2)}`;
  document.getElementById("invoiceTotal").textContent =
    `$${total.toFixed(2)}`;
}

function addPresetService() {
  const select = document.getElementById("presetServiceSelect");
  const value = select.value;
  if (!value) return;

  const preset = PRESET_SERVICES.find((s) => s.name === value);
  if (preset) {
    addInvoiceLineItem(preset);
  }
  select.value = "";
}

// ===== INVOICE PREVIEW =====
function previewInvoice() {
  const data = gatherInvoiceData();
  const previewHTML = renderInvoicePreview(data);

  document.getElementById("invoicePreviewContent").innerHTML = previewHTML;
  document.getElementById("invoicePreviewOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeInvoicePreview() {
  document.getElementById("invoicePreviewOverlay").classList.remove("active");
  document.body.style.overflow = "";
}

function gatherInvoiceData() {
  return {
    invoiceNumber: document.getElementById("invoiceNumber").value.trim(),
    invoiceDate: document.getElementById("invoiceDate").value,
    dueDate: document.getElementById("invoiceDueDate").value,
    terms: document.getElementById("invoiceTerms").value,
    customerName: document.getElementById("invCustomerName").value.trim(),
    customerAddress: document.getElementById("invCustomerAddress").value.trim(),
    customerPhone: document.getElementById("invCustomerPhone").value.trim(),
    customerEmail: document.getElementById("invCustomerEmail").value.trim(),
    jobLocation: document.getElementById("invJobLocation").value.trim(),
    poNumber: document.getElementById("invPONumber").value.trim(),
    lineItems: invoiceLineItems.map((item) => ({
      description: item.description,
      qty: parseFloat(item.qty) || 0,
      rate: parseFloat(item.rate) || 0,
      amount: parseFloat(calculateLineAmount(item)),
    })),
    taxRate:
      parseFloat(document.getElementById("invoiceTaxRate").value) || 0,
    notes: document.getElementById("invoiceNotes").value.trim(),
  };
}

function formatInvoiceDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTermsLabel(terms) {
  const labels = {
    "due-on-receipt": "Due on Receipt",
    "net-10": "Net 10",
    "net-15": "Net 15",
    "net-30": "Net 30",
    "net-60": "Net 60",
    custom: "Custom",
  };
  return labels[terms] || terms;
}

function renderInvoicePreview(data) {
  let subtotal = 0;
  const rows = data.lineItems
    .filter((item) => item.description)
    .map((item, i) => {
      subtotal += item.amount;
      return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#495057;font-size:0.85rem;">${i + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;color:#212529;font-size:0.85rem;">${escapeHtml(item.description)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:center;color:#495057;font-size:0.85rem;">${item.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:right;color:#495057;font-size:0.85rem;">$${item.rate.toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:right;font-weight:600;color:#212529;font-size:0.85rem;">$${item.amount.toFixed(2)}</td>
    </tr>`;
    })
    .join("");

  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax;

  return `
    <div style="font-family:'Inter',sans-serif;max-width:800px;margin:0 auto;">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #1B6B3A;">
        <div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px;">
            <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
              <circle cx="24" cy="24" r="22" fill="#1B6B3A"/>
              <path d="M24 8 L30 18 H18 Z" fill="#fff"/>
              <path d="M24 14 L32 26 H16 Z" fill="#fff"/>
              <path d="M24 20 L34 34 H14 Z" fill="#fff"/>
              <rect x="22" y="32" width="4" height="8" rx="1" fill="#8B5E3C"/>
            </svg>
            <div>
              <div style="font-size:1.3rem;font-weight:700;color:#1B6B3A;letter-spacing:-0.02em;">Big Bass Tree Services, LLC</div>
              <div style="font-size:0.78rem;color:#6c757d;">Licensed Louisiana Arborist #2687</div>
            </div>
          </div>
          <div style="font-size:0.82rem;color:#6c757d;line-height:1.6;margin-top:4px;">
            1726 Lyman Lane<br>Clinton, LA 70722
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:2rem;font-weight:800;color:#1B6B3A;letter-spacing:-0.03em;line-height:1;">INVOICE</div>
          <div style="font-size:0.88rem;color:#495057;margin-top:8px;">
            <strong>#${escapeHtml(data.invoiceNumber)}</strong>
          </div>
        </div>
      </div>

      <!-- Info Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
        <div>
          <div style="font-size:0.72rem;font-weight:600;color:#868e96;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Bill To</div>
          <div style="font-size:0.92rem;font-weight:600;color:#212529;margin-bottom:4px;">${escapeHtml(data.customerName) || "—"}</div>
          <div style="font-size:0.82rem;color:#6c757d;line-height:1.6;">
            ${data.customerAddress ? escapeHtml(data.customerAddress) + "<br>" : ""}
            ${data.customerPhone ? escapeHtml(data.customerPhone) + "<br>" : ""}
            ${data.customerEmail ? escapeHtml(data.customerEmail) : ""}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="display:grid;grid-template-columns:auto auto;gap:6px 16px;justify-content:end;font-size:0.85rem;">
            <span style="color:#868e96;font-weight:500;">Invoice Date:</span>
            <span style="color:#212529;font-weight:600;">${formatInvoiceDate(data.invoiceDate)}</span>
            <span style="color:#868e96;font-weight:500;">Due Date:</span>
            <span style="color:#212529;font-weight:600;">${formatInvoiceDate(data.dueDate)}</span>
            <span style="color:#868e96;font-weight:500;">Terms:</span>
            <span style="color:#212529;font-weight:600;">${getTermsLabel(data.terms)}</span>
            ${data.poNumber ? `<span style="color:#868e96;font-weight:500;">PO Number:</span><span style="color:#212929;font-weight:600;">${escapeHtml(data.poNumber)}</span>` : ""}
            ${data.jobLocation ? `<span style="color:#868e96;font-weight:500;">Job Location:</span><span style="color:#212529;font-weight:600;">${escapeHtml(data.jobLocation)}</span>` : ""}
          </div>
        </div>
      </div>

      <!-- Line Items Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f0f4f0;">
            <th style="padding:12px;text-align:left;font-size:0.75rem;font-weight:700;color:#1B6B3A;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1B6B3A;width:40px;">#</th>
            <th style="padding:12px;text-align:left;font-size:0.75rem;font-weight:700;color:#1B6B3A;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1B6B3A;">Description</th>
            <th style="padding:12px;text-align:center;font-size:0.75rem;font-weight:700;color:#1B6B3A;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1B6B3A;width:70px;">Qty</th>
            <th style="padding:12px;text-align:right;font-size:0.75rem;font-weight:700;color:#1B6B3A;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1B6B3A;width:100px;">Rate</th>
            <th style="padding:12px;text-align:right;font-size:0.75rem;font-weight:700;color:#1B6B3A;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1B6B3A;width:110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
        <div style="min-width:260px;">
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.88rem;color:#495057;">
            <span>Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          ${
            data.taxRate > 0
              ? `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.88rem;color:#495057;border-bottom:1px solid #dee2e6;">
              <span>Tax (${data.taxRate}%)</span>
              <span>$${tax.toFixed(2)}</span>
            </div>`
              : ""
          }
          <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:1.15rem;font-weight:700;color:#1B6B3A;border-top:2px solid #1B6B3A;margin-top:4px;">
            <span>Total Due</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Notes -->
      ${
        data.notes
          ? `<div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="font-size:0.75rem;font-weight:600;color:#868e96;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Notes</div>
          <div style="font-size:0.85rem;color:#495057;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.notes)}</div>
        </div>`
          : ""
      }

      <!-- Payment Info -->
      <div style="border-top:1px solid #dee2e6;padding-top:16px;font-size:0.8rem;color:#868e96;text-align:center;line-height:1.6;">
        <div style="font-weight:600;color:#495057;margin-bottom:4px;">Payment Terms</div>
        All accounts are net payable upon completion of the work. Balances not collected after ten (10) days of invoice date will be assessed a 5% late fee each month until paid, plus any and all cost of collection.<br>
        <strong style="color:#1B6B3A;">Big Bass Tree Services, LLC</strong> — 1726 Lyman Lane, Clinton, LA 70722
      </div>
    </div>
  `;
}

// ===== PDF DOWNLOAD =====
function downloadInvoicePDF() {
  const data = gatherInvoiceData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "letter");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ===== HEADER =====
  // Green accent bar at top
  doc.setFillColor(27, 107, 58);
  doc.rect(0, 0, pageWidth, 4, "F");

  y = 16;

  // Company name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 107, 58);
  doc.text("Big Bass Tree Services, LLC", margin, y);

  // INVOICE text right-aligned
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - margin, y, { align: "right" });

  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(108, 117, 125);
  doc.text("Licensed Louisiana Arborist #2687", margin, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 37, 41);
  doc.text(`#${data.invoiceNumber}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(108, 117, 125);
  doc.setFontSize(8.5);
  doc.text("1726 Lyman Lane", margin, y);
  y += 4;
  doc.text("Clinton, LA 70722", margin, y);

  // Divider
  y += 8;
  doc.setDrawColor(27, 107, 58);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ===== BILL TO & INVOICE DETAILS =====
  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;

  // Bill To
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(134, 142, 150);
  doc.text("BILL TO", leftCol, y);

  doc.text("INVOICE DETAILS", rightCol, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 37, 41);
  doc.text(data.customerName || "—", leftCol, y);

  // Invoice details right column
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(108, 117, 125);
  doc.text("Invoice Date:", rightCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 37, 41);
  doc.text(formatInvoiceDate(data.invoiceDate), rightCol + 28, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(108, 117, 125);
  doc.setFontSize(8.5);
  if (data.customerAddress) {
    doc.text(data.customerAddress, leftCol, y);
  }

  doc.text("Due Date:", rightCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 37, 41);
  doc.text(formatInvoiceDate(data.dueDate), rightCol + 28, y);

  y += 5;
  if (data.customerPhone) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(108, 117, 125);
    doc.text(data.customerPhone, leftCol, y);
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(108, 117, 125);
  doc.text("Terms:", rightCol, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(33, 37, 41);
  doc.text(getTermsLabel(data.terms), rightCol + 28, y);

  y += 5;
  if (data.customerEmail) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(108, 117, 125);
    doc.text(data.customerEmail, leftCol, y);
  }

  if (data.poNumber) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(108, 117, 125);
    doc.text("PO Number:", rightCol, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 37, 41);
    doc.text(data.poNumber, rightCol + 28, y);
  }

  y += 5;
  if (data.jobLocation) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(108, 117, 125);
    doc.text("Job Location:", rightCol, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 37, 41);
    doc.text(data.jobLocation, rightCol + 28, y);
  }

  y += 10;

  // ===== LINE ITEMS TABLE =====
  // Table header background
  doc.setFillColor(240, 244, 240);
  doc.rect(margin, y - 4, contentWidth, 10, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 107, 58);
  doc.text("#", margin + 4, y + 2);
  doc.text("DESCRIPTION", margin + 16, y + 2);
  doc.text("QTY", margin + contentWidth * 0.62, y + 2, { align: "center" });
  doc.text("RATE", margin + contentWidth * 0.77, y + 2, { align: "right" });
  doc.text("AMOUNT", margin + contentWidth - 4, y + 2, { align: "right" });

  // Header bottom border
  y += 6;
  doc.setDrawColor(27, 107, 58);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Table rows
  let subtotal = 0;
  const lineItems = data.lineItems.filter((item) => item.description);

  doc.setFontSize(8.5);
  lineItems.forEach((item, i) => {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
      // Re-add green bar on new page
      doc.setFillColor(27, 107, 58);
      doc.rect(0, 0, pageWidth, 4, "F");
      y = 16;
    }

    subtotal += item.amount;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(73, 80, 87);
    doc.text(String(i + 1), margin + 4, y);

    // Description with word wrap
    doc.setTextColor(33, 37, 41);
    const descLines = doc.splitTextToSize(
      item.description,
      contentWidth * 0.5,
    );
    doc.text(descLines, margin + 16, y);

    doc.setTextColor(73, 80, 87);
    doc.text(String(item.qty), margin + contentWidth * 0.62, y, {
      align: "center",
    });
    doc.text(`$${item.rate.toFixed(2)}`, margin + contentWidth * 0.77, y, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 37, 41);
    doc.text(`$${item.amount.toFixed(2)}`, margin + contentWidth - 4, y, {
      align: "right",
    });

    const lineHeight = Math.max(descLines.length * 4, 5);
    y += lineHeight + 3;

    // Row separator
    doc.setDrawColor(233, 236, 239);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
  });

  y += 6;

  // ===== TOTALS =====
  const totalsX = pageWidth - margin - 80;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(73, 80, 87);
  doc.text("Subtotal", totalsX, y);
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, y, {
    align: "right",
  });

  if (data.taxRate > 0) {
    y += 6;
    doc.text(`Tax (${data.taxRate}%)`, totalsX, y);
    const tax = subtotal * (data.taxRate / 100);
    doc.text(`$${tax.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
  }

  y += 4;
  doc.setDrawColor(27, 107, 58);
  doc.setLineWidth(0.6);
  doc.line(totalsX - 4, y, pageWidth - margin, y);
  y += 7;

  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 107, 58);
  doc.text("Total Due", totalsX, y);
  doc.text(`$${total.toFixed(2)}`, pageWidth - margin, y, { align: "right" });

  y += 12;

  // ===== NOTES =====
  if (data.notes) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(248, 249, 250);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth - 16);
    const noteHeight = noteLines.length * 4 + 16;
    doc.roundedRect(margin, y, contentWidth, noteHeight, 3, 3, "F");

    y += 6;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(134, 142, 150);
    doc.text("NOTES", margin + 8, y);

    y += 5;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(73, 80, 87);
    doc.text(noteLines, margin + 8, y);

    y += noteHeight - 10;
  }

  // ===== FOOTER =====
  const footerY = pageHeight - 20;
  doc.setDrawColor(222, 226, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(134, 142, 150);
  doc.text(
    "All accounts are net payable upon completion of the work. Balances not collected after ten (10) days of invoice date",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );
  doc.text(
    "will be assessed a 5% late fee each month until paid, plus any and all cost of collection.",
    pageWidth / 2,
    footerY + 4,
    { align: "center" },
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(27, 107, 58);
  doc.text(
    "Big Bass Tree Services, LLC — 1726 Lyman Lane, Clinton, LA 70722",
    pageWidth / 2,
    footerY + 9,
    { align: "center" },
  );

  // Save
  const fileName = `BigBass_Invoice_${data.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
  showToast("Invoice PDF downloaded!", "success");
}

// ===== VALIDATE =====
function validateInvoice() {
  const name = document.getElementById("invCustomerName").value.trim();
  const invoiceNum = document.getElementById("invoiceNumber").value.trim();
  const hasItems = invoiceLineItems.some(
    (item) => item.description && parseFloat(item.rate) > 0,
  );

  if (!invoiceNum) {
    showToast("Please enter an invoice number.", "error");
    document.getElementById("invoiceNumber").focus();
    return false;
  }

  if (!name) {
    showToast("Please enter the customer name.", "error");
    document.getElementById("invCustomerName").focus();
    return false;
  }

  if (!hasItems) {
    showToast(
      "Please add at least one line item with a description and rate.",
      "error",
    );
    return false;
  }

  return true;
}

function previewAndDownloadInvoice() {
  if (!validateInvoice()) return;
  previewInvoice();
}

function downloadInvoiceFromPreview() {
  downloadInvoicePDF();
}

// ===== AUTOSAVE =====
function scheduleInvoiceAutosave() {
  clearTimeout(invoiceAutosaveTimer);
  invoiceAutosaveTimer = setTimeout(saveInvoiceToLocalStorage, 800);
}

function saveInvoiceToLocalStorage() {
  const data = gatherInvoiceData();
  data.rawLineItems = invoiceLineItems;

  try {
    localStorage.setItem(INVOICE_AUTOSAVE_KEY, JSON.stringify({
      data,
      savedAt: Date.now(),
    }));
  } catch (e) {
    // fail silently
  }
}

function restoreInvoiceAutosave() {
  let saved;
  try {
    const raw = localStorage.getItem(INVOICE_AUTOSAVE_KEY);
    if (!raw) return;
    saved = JSON.parse(raw);
  } catch (e) {
    return;
  }

  if (!saved || !saved.savedAt || Date.now() - saved.savedAt > 86400000) {
    localStorage.removeItem(INVOICE_AUTOSAVE_KEY);
    return;
  }

  // Restore data silently (no prompt for invoices — just restore)
  const d = saved.data;
  if (d.invoiceNumber)
    document.getElementById("invoiceNumber").value = d.invoiceNumber;
  if (d.invoiceDate)
    document.getElementById("invoiceDate").value = d.invoiceDate;
  if (d.dueDate)
    document.getElementById("invoiceDueDate").value = d.dueDate;
  if (d.terms) document.getElementById("invoiceTerms").value = d.terms;
  if (d.customerName)
    document.getElementById("invCustomerName").value = d.customerName;
  if (d.customerAddress)
    document.getElementById("invCustomerAddress").value = d.customerAddress;
  if (d.customerPhone)
    document.getElementById("invCustomerPhone").value = d.customerPhone;
  if (d.customerEmail)
    document.getElementById("invCustomerEmail").value = d.customerEmail;
  if (d.jobLocation)
    document.getElementById("invJobLocation").value = d.jobLocation;
  if (d.poNumber)
    document.getElementById("invPONumber").value = d.poNumber;
  if (d.taxRate)
    document.getElementById("invoiceTaxRate").value = d.taxRate;
  if (d.notes) document.getElementById("invoiceNotes").value = d.notes;

  if (d.rawLineItems && d.rawLineItems.length > 0) {
    invoiceLineItems = d.rawLineItems;
    invoiceCounter =
      Math.max(...invoiceLineItems.map((i) => i.id)) + 1;
    renderLineItems();
  }
}

function clearInvoice() {
  if (
    !confirm(
      "Are you sure you want to clear this invoice? All entered data will be lost.",
    )
  ) {
    return;
  }

  localStorage.removeItem(INVOICE_AUTOSAVE_KEY);

  // Reset fields
  document.getElementById("invoiceNumber").value = "";
  document.getElementById("invoiceDate").value = "";
  document.getElementById("invoiceDueDate").value = "";
  document.getElementById("invoiceTerms").value = "net-30";
  document.getElementById("invCustomerName").value = "";
  document.getElementById("invCustomerAddress").value = "";
  document.getElementById("invCustomerPhone").value = "";
  document.getElementById("invCustomerEmail").value = "";
  document.getElementById("invJobLocation").value = "";
  document.getElementById("invPONumber").value = "";
  document.getElementById("invoiceTaxRate").value = "0";
  document.getElementById("invoiceNotes").value = "";

  invoiceLineItems = [];
  invoiceCounter = 1;
  addInvoiceLineItem();

  initInvoiceDefaults();

  showToast("Invoice cleared.", "success");
}
