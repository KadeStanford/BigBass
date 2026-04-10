// ================================================
// Big Bass Contract Portal — Main Application
// ================================================

let currentStep = 1;
let selectedContractType = null;
let signaturePadInstance = null;
let initialPadInstance = null;
let fullscreenPadInstance = null;
let fullscreenTargetType = null;
const AUTOSAVE_KEY = "bigbass_contract_autosave";
let autosaveTimer = null;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Auto-fill today's date into all date fields
  document.getElementById("signatureDate").value = today;
  document.getElementById("dateOfLoss").value = today;

  // Auto-fill agreement date fields with today
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  document.getElementById("agreementDay").value = now.getDate();
  document.getElementById("agreementMonth").value = months[now.getMonth()];
  document.getElementById("agreementYear").value = now.getFullYear();

  // Set up phone number formatting
  const phoneFields = document.querySelectorAll('input[type="tel"]');
  phoneFields.forEach((f) => f.addEventListener("input", formatPhone));

  // Set up currency formatting for contract price
  const priceField = document.getElementById("contractPrice");
  if (priceField) {
    priceField.addEventListener("blur", formatCurrency);
    priceField.addEventListener("focus", unformatCurrency);
  }

  // Set up rate price listeners for auto-total
  for (let i = 1; i <= 11; i++) {
    const priceInput = document.getElementById(`rate${i}Price`);
    if (priceInput) {
      priceInput.addEventListener("input", calculateTotal);
    }
  }

  // "Same as customer address" checkbox
  const sameAddrCheck = document.getElementById("sameAsAddress");
  if (sameAddrCheck) {
    sameAddrCheck.addEventListener("change", function () {
      const locField = document.getElementById("locationOfServices");
      if (this.checked) {
        locField.value = document.getElementById("customerAddress").value;
        locField.setAttribute("readonly", "");
        locField.classList.add("auto-filled");
      } else {
        locField.removeAttribute("readonly");
        locField.classList.remove("auto-filled");
      }
    });
    // Keep synced when customer address changes
    document
      .getElementById("customerAddress")
      .addEventListener("input", function () {
        if (sameAddrCheck.checked) {
          document.getElementById("locationOfServices").value = this.value;
        }
      });
  }

  // Email validation on blur
  const emailFields = document.querySelectorAll('input[type="email"]');
  emailFields.forEach((f) => {
    f.addEventListener("blur", function () {
      if (this.value && !isValidEmail(this.value)) {
        this.classList.add("error");
        showFieldHint(this, "Please enter a valid email address");
      } else {
        this.classList.remove("error");
        clearFieldHint(this);
      }
    });
    f.addEventListener("input", function () {
      this.classList.remove("error");
      clearFieldHint(this);
    });
  });

  // Add input character count for textareas
  document.querySelectorAll("textarea").forEach((ta) => {
    ta.addEventListener("input", function () {
      let counter = this.parentElement.querySelector(".char-count");
      if (!counter) {
        counter = document.createElement("span");
        counter.className = "char-count";
        this.parentElement.appendChild(counter);
      }
      counter.textContent = `${this.value.length} characters`;
    });
  });

  // Initialize signature pads (deferred until step 4 is shown)
  initSignaturePads();

  // Restore auto-saved data if available
  restoreAutosave();

  // Set up auto-save on any form input change
  document.addEventListener("input", scheduleAutosave);
  document.addEventListener("change", scheduleAutosave);
});

// ===== NAVIGATION =====
function goToStep(step) {
  // Hide all panels
  document
    .querySelectorAll(".step-panel")
    .forEach((p) => p.classList.remove("active"));

  // Show target panel
  document.getElementById(`step${step}`).classList.add("active");

  // Update progress bar
  document.querySelectorAll(".progress-step").forEach((s) => {
    const stepNum = parseInt(s.dataset.step);
    s.classList.remove("active", "completed");
    if (stepNum === step) s.classList.add("active");
    else if (stepNum < step) s.classList.add("completed");
  });

  // Update progress lines
  const lines = document.querySelectorAll(".progress-line");
  lines.forEach((line, i) => {
    line.classList.toggle("filled", i < step - 1);
  });

  currentStep = step;

  // If going to step 4, render the contract preview and resize pads
  if (step === 4) {
    renderContractPreview();
    resizeSignaturePads();
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== CONTRACT SELECTION =====
function selectContract(type) {
  selectedContractType = type;

  // Highlight selected card
  document
    .querySelectorAll(".contract-card")
    .forEach((c) => c.classList.remove("selected"));
  document
    .querySelector(`.contract-card[data-type="${type}"]`)
    .classList.add("selected");

  // Show/hide form sections based on type
  const insuranceSection = document.getElementById("insuranceSection");
  const insuranceScopeSection = document.getElementById(
    "insuranceScopeSection",
  );
  const generalDateSection = document.getElementById("generalDateSection");

  if (type === "insurance") {
    insuranceSection.style.display = "block";
    insuranceScopeSection.style.display = "block";
    generalDateSection.style.display = "none";
    // Make insurance fields required
    setFieldsRequired(insuranceSection, true);
    setFieldsRequired(insuranceScopeSection, true);
    setFieldsRequired(generalDateSection, false);
  } else {
    insuranceSection.style.display = "none";
    insuranceScopeSection.style.display = "none";
    generalDateSection.style.display = "block";
    // Remove insurance required
    setFieldsRequired(insuranceSection, false);
    setFieldsRequired(insuranceScopeSection, false);
  }

  // Move to step 2
  setTimeout(() => goToStep(2), 300);
}

function setFieldsRequired(container, isRequired) {
  container
    .querySelectorAll("input[required], textarea[required], select[required]")
    .forEach((f) => {
      if (!isRequired) f.removeAttribute("required");
    });
  if (isRequired) {
    // Only set the ones with the required class marker
    container.querySelectorAll(".required").forEach((marker) => {
      const group = marker.closest(".form-group");
      if (group) {
        const input = group.querySelector("input, textarea, select");
        if (input) input.setAttribute("required", "");
      }
    });
  }
}

// ===== VALIDATION =====
function validateAndNext(fromStep) {
  if (fromStep === 2) {
    // Validate customer form
    const form = document.getElementById("customerForm");
    const visibleRequired = Array.from(
      form.querySelectorAll("[required]"),
    ).filter((f) => f.offsetParent !== null);

    let valid = true;
    visibleRequired.forEach((field) => {
      field.classList.remove("error");
      if (!field.value.trim()) {
        field.classList.add("error");
        valid = false;
      }
    });

    // Email validation
    const email = document.getElementById("emailAddress");
    if (email.value && !isValidEmail(email.value)) {
      email.classList.add("error");
      valid = false;
    }

    if (!valid) {
      showToast("Please fill in all required fields.", "error");
      const firstError = form.querySelector(".error");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => firstError.focus(), 400);
      }
      return;
    }

    goToStep(3);
  } else if (fromStep === 3) {
    // Validate at least one rate is selected
    let hasSelected = false;
    for (let i = 1; i <= 11; i++) {
      if (document.getElementById(`rate${i}`).checked) {
        const price = document.getElementById(`rate${i}Price`).value;
        if (!price || parseFloat(price) <= 0) {
          showToast(`Please enter a price for selected item #${i}.`, "error");
          const priceField = document.getElementById(`rate${i}Price`);
          priceField.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => priceField.focus(), 400);
          return;
        }
        hasSelected = true;
      }
    }

    if (!hasSelected) {
      showToast("Please select at least one rate schedule item.", "error");
      const firstRate = document.querySelector(".rate-item");
      if (firstRate)
        firstRate.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    goToStep(4);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== RATE SCHEDULE =====
function toggleRate(num) {
  const checkbox = document.getElementById(`rate${num}`);
  const priceInput = document.getElementById(`rate${num}Price`);
  const rateItem = checkbox.closest(".rate-item");

  priceInput.disabled = !checkbox.checked;
  rateItem.classList.toggle("active", checkbox.checked);

  if (!checkbox.checked) {
    priceInput.value = "";
  }

  // Handle quantity for labor
  if (num === 6) {
    const qtyInput = document.getElementById("rate6Qty");
    qtyInput.disabled = !checkbox.checked;
    if (!checkbox.checked) qtyInput.value = "";
  }

  calculateTotal();
}

function calculateTotal() {
  let total = 0;
  for (let i = 1; i <= 11; i++) {
    if (document.getElementById(`rate${i}`).checked) {
      total += parseFloat(document.getElementById(`rate${i}Price`).value) || 0;
    }
  }
  document.getElementById("rateTotal").textContent = `$${total.toFixed(2)}`;
}

// ===== SIGNATURE PADS =====
function initSignaturePads() {
  const sigCanvas = document.getElementById("signaturePad");
  const iniCanvas = document.getElementById("initialPad");

  if (sigCanvas && typeof SignaturePad !== "undefined") {
    signaturePadInstance = new SignaturePad(sigCanvas, {
      backgroundColor: "rgba(245, 245, 245, 1)",
      penColor: "#1a1a2e",
      minWidth: 1,
      maxWidth: 2.5,
    });

    initialPadInstance = new SignaturePad(iniCanvas, {
      backgroundColor: "rgba(245, 245, 245, 1)",
      penColor: "#1a1a2e",
      minWidth: 1,
      maxWidth: 2,
    });
  }

  // Handle window resize to keep pads properly sized
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (currentStep === 4) {
        // Save existing signatures before resize
        const sigData =
          signaturePadInstance && !signaturePadInstance.isEmpty()
            ? signaturePadInstance.toData()
            : null;
        const iniData =
          initialPadInstance && !initialPadInstance.isEmpty()
            ? initialPadInstance.toData()
            : null;

        resizeSignaturePads();

        // Restore signatures after resize
        if (sigData) signaturePadInstance.fromData(sigData);
        if (iniData) initialPadInstance.fromData(iniData);
      }
    }, 200);
  });
}

function resizeSignaturePads() {
  resizeCanvas(document.getElementById("signaturePad"), signaturePadInstance);
  resizeCanvas(document.getElementById("initialPad"), initialPadInstance);
}

function resizeCanvas(canvas, padInstance) {
  if (!canvas || !padInstance) return;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  canvas.getContext("2d").scale(ratio, ratio);
  padInstance.clear();
}

function clearPad(type) {
  if (type === "signature" && signaturePadInstance)
    signaturePadInstance.clear();
  if (type === "initial" && initialPadInstance) initialPadInstance.clear();
}

// ===== FULLSCREEN SIGNING =====
function openFullscreenSign(type) {
  fullscreenTargetType = type;
  const overlay = document.getElementById("fullscreenSignOverlay");
  const title = document.getElementById("fullscreenSignTitle");
  const canvas = document.getElementById("fullscreenSignCanvas");

  title.textContent = type === "initial" ? "Initial Here" : "Sign Here";
  overlay.classList.add("active");

  // Prevent body scrolling while modal is open
  document.body.style.overflow = "hidden";

  // Init fullscreen pad after the modal is visible so getBoundingClientRect works
  requestAnimationFrame(() => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext("2d").scale(ratio, ratio);

    fullscreenPadInstance = new SignaturePad(canvas, {
      backgroundColor: "rgba(245, 245, 245, 1)",
      penColor: "#1a1a2e",
      minWidth: 1.5,
      maxWidth: 3.5,
    });

    // If there's existing data on the target pad, load it in
    const sourcePad =
      type === "initial" ? initialPadInstance : signaturePadInstance;
    if (sourcePad && !sourcePad.isEmpty()) {
      const img = sourcePad.toDataURL();
      const image = new Image();
      image.onload = () => {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgba(245, 245, 245, 1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Scale the old signature to fit the new canvas
        const scale = Math.min(
          canvas.width / image.width,
          canvas.height / image.height,
        );
        const x = (canvas.width - image.width * scale) / 2;
        const y = (canvas.height - image.height * scale) / 2;
        ctx.drawImage(
          image,
          x / ratio,
          y / ratio,
          (image.width * scale) / ratio,
          (image.height * scale) / ratio,
        );
      };
      image.src = img;
    }
  });
}

function closeFullscreenSign() {
  const overlay = document.getElementById("fullscreenSignOverlay");
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  fullscreenPadInstance = null;
  fullscreenTargetType = null;
}

function clearFullscreenPad() {
  if (fullscreenPadInstance) fullscreenPadInstance.clear();
}

function confirmFullscreenSign() {
  if (!fullscreenPadInstance || fullscreenPadInstance.isEmpty()) {
    showToast("Please sign before confirming.", "error");
    return;
  }

  const targetPad =
    fullscreenTargetType === "initial"
      ? initialPadInstance
      : signaturePadInstance;
  const targetCanvas =
    fullscreenTargetType === "initial"
      ? document.getElementById("initialPad")
      : document.getElementById("signaturePad");

  if (targetPad && targetCanvas) {
    // Transfer fullscreen signature to the inline pad
    const img = fullscreenPadInstance.toDataURL();
    const image = new Image();
    image.onload = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const ctx = targetCanvas.getContext("2d");
      // Clear and resize
      const rect = targetCanvas.getBoundingClientRect();
      targetCanvas.width = rect.width * ratio;
      targetCanvas.height = rect.height * ratio;
      ctx.scale(ratio, ratio);

      ctx.fillStyle = "rgba(245, 245, 245, 1)";
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw scaled image
      const scale = Math.min(
        rect.width / image.width,
        rect.height / image.height,
      );
      const x = (rect.width - image.width * scale) / 2;
      const y = (rect.height - image.height * scale) / 2;
      ctx.drawImage(image, x, y, image.width * scale, image.height * scale);

      // Mark the pad as non-empty by adding a data point
      targetPad._data = fullscreenPadInstance.toData();
      targetPad._isEmpty = false;

      closeFullscreenSign();
      showToast("Signature captured!", "success");
    };
    image.src = img;
  }
}

// ===== CONTRACT PREVIEW =====
function renderContractPreview() {
  const data = gatherFormData();
  const container = document.getElementById("contractDocument");

  if (selectedContractType === "insurance") {
    container.innerHTML = renderInsuranceContract(data);
  } else {
    container.innerHTML = renderGeneralContract(data);
  }
}

function gatherFormData() {
  const data = {
    customerName: document.getElementById("customerName").value.trim(),
    customerAddress: document.getElementById("customerAddress").value.trim(),
    locationOfServices: document
      .getElementById("locationOfServices")
      .value.trim(),
    phoneNumber: document.getElementById("phoneNumber").value.trim(),
    emailAddress: document.getElementById("emailAddress").value.trim(),
    estimatedTimeframe: document
      .getElementById("estimatedTimeframe")
      .value.trim(),
    rates: gatherRates(),
  };

  if (selectedContractType === "insurance") {
    data.dateOfLoss = document.getElementById("dateOfLoss").value;
    data.causeOfLoss = document.getElementById("causeOfLoss").value.trim();
    data.insuranceCarrier = document
      .getElementById("insuranceCarrier")
      .value.trim();
    data.policyNumber = document.getElementById("policyNumber").value.trim();
    data.claimNumber = document.getElementById("claimNumber").value.trim();
    data.adjusterName = document.getElementById("adjusterName").value.trim();
    data.adjusterPhone = document.getElementById("adjusterPhone").value.trim();
    data.adjusterEmail = document.getElementById("adjusterEmail").value.trim();
    data.scopeOfServices = document
      .getElementById("scopeOfServices")
      .value.trim();
    data.additionalServices = document
      .getElementById("additionalServices")
      .value.trim();
    data.contractPrice = document.getElementById("contractPrice").value.trim();
    data.equipmentRequired = document
      .getElementById("equipmentRequired")
      .value.trim();
  } else {
    data.agreementDay = document.getElementById("agreementDay").value.trim();
    data.agreementMonth = document.getElementById("agreementMonth").value;
    data.agreementYear = document.getElementById("agreementYear").value.trim();
  }

  return data;
}

function gatherRates() {
  const rates = [];
  for (let i = 1; i <= 11; i++) {
    const item = RATE_ITEMS[i - 1];
    const checked = document.getElementById(`rate${i}`).checked;
    const price = document.getElementById(`rate${i}Price`).value;
    const qty = i === 6 ? document.getElementById("rate6Qty").value : null;

    rates.push({
      id: item.id,
      name: item.name,
      selected: checked,
      price: price,
      qty: qty,
    });
  }
  return rates;
}

// ===== SUBMIT =====
async function submitContract() {
  // Validate signature and initials
  if (!initialPadInstance || initialPadInstance.isEmpty()) {
    showToast(
      "Please provide your initials for the Right to Cancel acknowledgment.",
      "error",
    );
    return;
  }

  if (!signaturePadInstance || signaturePadInstance.isEmpty()) {
    showToast("Please provide your signature to submit the contract.", "error");
    return;
  }

  const sigDate = document.getElementById("signatureDate").value;
  if (!sigDate) {
    showToast("Please enter the signature date.", "error");
    return;
  }

  // Move to completion step
  goToStep(5);
  sessionStorage.removeItem(AUTOSAVE_KEY);
  showToast("Contract submitted successfully!", "success");

  // Gather data and generate PDF
  const data = gatherFormData();
  const pdfBlob = generatePDFBlob(data);

  // Save to Firestore
  try {
    await saveContractToFirestore(data, "signed", pdfBlob);
  } catch (e) {
    console.warn("Firestore save failed:", e);
  }

  // Send email copies if configured
  if (typeof emailContract === "function") {
    try {
      emailContract(pdfBlob, data);
    } catch (e) {
      console.warn("Email sending failed:", e);
    }
  }
}

// Save contract data to Firestore
async function saveContractToFirestore(data, status, pdfBlob) {
  if (typeof firebase === "undefined" || !firebase.apps.length) return null;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return null;

  // Upload PDF to Storage and get URL
  let pdfUrl = "";
  if (pdfBlob) {
    try {
      const storage = firebase.storage();
      const timestamp = Date.now();
      const safeName = (data.customerName || "contract").replace(/[^a-zA-Z0-9]/g, "_");
      const filePath = `contracts/${safeName}_${timestamp}.pdf`;
      const snapshot = await storage.ref(filePath).put(pdfBlob, { contentType: "application/pdf" });
      pdfUrl = await snapshot.ref.getDownloadURL();
    } catch (e) {
      console.warn("PDF upload failed:", e);
    }
  }

  // Capture signature data
  const signatureData = status === "signed" ? {
    signature: signaturePadInstance && !signaturePadInstance.isEmpty() ? signaturePadInstance.toDataURL() : null,
    initials: initialPadInstance && !initialPadInstance.isEmpty() ? initialPadInstance.toDataURL() : null,
    signedAt: new Date().toISOString(),
    signatureDate: document.getElementById("signatureDate").value
  } : null;

  // Calculate total price from rates
  let totalPrice = 0;
  if (data.contractPrice) {
    totalPrice = parseFloat(data.contractPrice.replace(/[^0-9.]/g, "")) || 0;
  } else {
    (data.rates || []).forEach(r => {
      if (r.selected) {
        const price = parseFloat(r.price) || 0;
        const qty = parseFloat(r.qty) || 1;
        totalPrice += price * qty;
      }
    });
  }

  const contractDoc = {
    contractType: selectedContractType,
    status: status,
    customerName: data.customerName || "",
    customerEmail: data.emailAddress || "",
    customerPhone: data.phoneNumber || "",
    customerAddress: data.customerAddress || "",
    locationOfServices: data.locationOfServices || "",
    estimatedTimeframe: data.estimatedTimeframe || "",
    rates: data.rates || [],
    totalPrice: totalPrice,
    formData: data,
    signatureData: signatureData,
    pdfUrl: pdfUrl,
    signedPdfUrl: status === "signed" ? pdfUrl : "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: user.uid,
    createdByEmail: user.email
  };

  if (status === "signed") {
    contractDoc.signedAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  if (status === "sent") {
    contractDoc.sentAt = firebase.firestore.FieldValue.serverTimestamp();
  }

  const docRef = await db.collection("contracts").add(contractDoc);

  // Clear dashboard cache so next load picks up the new contract
  sessionStorage.removeItem("bigbass_contracts_cache");

  return docRef.id;
}

// Send contract for remote customer signature
async function sendForSignature() {
  const data = gatherFormData();

  if (!data.emailAddress) {
    showToast("Customer email is required to send for signature.", "error");
    return;
  }
  if (!data.customerName) {
    showToast("Customer name is required.", "error");
    return;
  }

  // Disable button to prevent double-submit
  const btn = document.getElementById("sendForSignatureBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }

  try {
    const db = firebase.firestore();
    const user = firebase.auth().currentUser;
    if (!user) { showToast("You must be signed in.", "error"); return; }

    // Generate a signing token
    const signingToken = crypto.randomUUID();

    // Save contract to Firestore with status "sent"
    const contractId = await saveContractToFirestore(data, "sent", null);
    if (!contractId) { showToast("Failed to save contract.", "error"); return; }

    // Update contract with signing token
    await db.collection("contracts").doc(contractId).update({
      signingToken: signingToken
    });

    // Write signing document for public (anonymous) access
    const signingDoc = {
      contractId: contractId,
      contractType: selectedContractType,
      status: "sent",
      customerName: data.customerName,
      customerEmail: data.emailAddress,
      formData: data,
      rates: data.rates || [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection("signing").doc(signingToken).set(signingDoc);

    // Compose signing URL
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "");
    const signingUrl = `${baseUrl}/sign.html?token=${signingToken}`;

    // Move to completion step with signing info
    goToStep(5);
    sessionStorage.removeItem(AUTOSAVE_KEY);

    // Update completion screen to show signing link
    const completionScreen = document.querySelector("#step5 .completion-screen");
    if (completionScreen) {
      completionScreen.querySelector("h2").textContent = "Contract Sent for Signature!";
      completionScreen.querySelector("p").innerHTML =
        `A signing link has been sent to <strong>${escapeHtml(data.emailAddress)}</strong>. You can also copy the link below.`;

      // Add signing link copy section
      const actionsDiv = completionScreen.querySelector(".completion-actions");
      const linkDiv = document.createElement("div");
      linkDiv.className = "signing-link-box";
      linkDiv.innerHTML = `
        <input type="text" value="${escapeHtml(signingUrl)}" readonly class="signing-link-input" id="signingLinkInput" />
        <button type="button" class="btn btn-secondary" onclick="copySigningLink()">Copy Link</button>
      `;
      actionsDiv.parentNode.insertBefore(linkDiv, actionsDiv);
    }

    // Send email with signing link
    if (typeof emailjs !== "undefined" && EMAILJS_CONFIG.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
      try {
        let companyEmail = "";
        const settingsDoc = await db.collection("settings").doc("company").get();
        if (settingsDoc.exists) {
          companyEmail = settingsDoc.data().companyEmail || "";
        }

        const templateParams = {
          to_name: data.customerName,
          to_email: data.emailAddress,
          company_email: companyEmail,
          contract_type: selectedContractType === "insurance" ? "Insurance Services" : "General Services",
          customer_name: data.customerName,
          customer_email: data.emailAddress,
          signing_link: signingUrl,
        };

        await emailjs.send(
          EMAILJS_CONFIG.serviceId,
          EMAILJS_CONFIG.signingTemplateId,
          templateParams,
          EMAILJS_CONFIG.publicKey
        );

        if (companyEmail) {
          await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.signingTemplateId,
            { ...templateParams, to_email: companyEmail, to_name: "Big Bass Tree Services" },
            EMAILJS_CONFIG.publicKey
          );
        }
      } catch (e) {
        console.warn("Email send failed:", e);
      }
    }

    showToast("Contract sent for signature!", "success");
  } catch (e) {
    console.error("Send for signature failed:", e);
    showToast("Failed to send contract. Please try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Send for Remote Signature"; }
  }
}

function copySigningLink() {
  const input = document.getElementById("signingLinkInput");
  if (input) {
    navigator.clipboard.writeText(input.value).then(() => {
      showToast("Signing link copied to clipboard!", "success");
    }).catch(() => {
      input.select();
      document.execCommand("copy");
      showToast("Signing link copied!", "success");
    });
  }
}

// ===== PDF HELPERS =====
function getSignatureForPDF(padInstance) {
  if (!padInstance || padInstance.isEmpty()) return null;
  const canvas = padInstance.canvas;
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = canvas.width;
  tmpCanvas.height = canvas.height;
  const ctx = tmpCanvas.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  // Replace grey background with pure white for clean PDF appearance
  const imgData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
  const px = imgData.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] > 230 && px[i + 1] > 230 && px[i + 2] > 230) {
      px[i] = px[i + 1] = px[i + 2] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return tmpCanvas.toDataURL("image/png");
}

// ===== PDF DOWNLOAD =====
function downloadPDF(skipDownload) {
  const data = gatherFormData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "letter");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add text with word wrapping and page breaks
  function addText(text, fontSize, isBold, indent) {
    doc.setFontSize(fontSize || 10);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const x = margin + (indent || 0);
    const lines = doc.splitTextToSize(text, contentWidth - (indent || 0));
    const lineHeight = fontSize ? fontSize * 0.45 : 4.5;

    for (let i = 0; i < lines.length; i++) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines[i], x, y);
      y += lineHeight;
    }
  }

  function addSpacing(mm) {
    y += mm || 4;
  }

  function addLine() {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;
  }

  // ===== HEADER =====
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICES CONTRACT", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Big Bass Tree Services, LLC", pageWidth / 2, y, {
    align: "center",
  });
  y += 4;
  doc.text("1726 Lyman Lane, Clinton, LA 70722", pageWidth / 2, y, {
    align: "center",
  });
  y += 8;

  // ===== GENERAL CONTRACT AGREEMENT HEADER =====
  if (selectedContractType === "general") {
    const agreementDate =
      data.agreementDay && data.agreementMonth && data.agreementYear
        ? `${data.agreementDay} day of ${data.agreementMonth}, ${data.agreementYear}`
        : "____";
    addText(
      `THIS AGREEMENT is made on this ${agreementDate}, by and between Big Bass Tree Services, LLC (hereinafter "Owner") and ${data.customerName || "________"}, (hereinafter "Customer"). This contract between Owner and ${data.customerName || "________"}, is binding and obligatory between and with respect to the following: the service contract, any and all documents referenced herein and attached hereto, including but not limited to, the scope of the work contained in the estimate, rate schedule, payment schedule, any addenda, and any field changes/change orders.`,
      9,
      false,
    );
    addSpacing(4);
  }

  // ===== CUSTOMER INFORMATION =====
  addText("CUSTOMER INFORMATION", 11, true);
  addSpacing(2);

  const infoFields = [
    ["Customer's Name", data.customerName],
    ["Customer's Address", data.customerAddress],
    ["Location of Services", data.locationOfServices],
    ["Phone Number", data.phoneNumber],
    ["E-Mail Address", data.emailAddress],
    ["Estimated Timeframe", data.estimatedTimeframe],
  ];

  if (selectedContractType === "insurance") {
    infoFields.push(
      ["Date of Loss", data.dateOfLoss],
      ["Cause of Loss", data.causeOfLoss],
      ["Insurance Carrier", data.insuranceCarrier],
      ["Policy Number", data.policyNumber],
      ["Claim Number", data.claimNumber],
      ["Adjuster's Name", data.adjusterName],
      ["Adjuster's Phone", data.adjusterPhone],
      ["Adjuster's E-mail", data.adjusterEmail],
      ["Scope of Services", data.scopeOfServices],
      ["Additional Services", data.additionalServices],
      ["Price", data.contractPrice],
      ["Equipment Required", data.equipmentRequired],
    );
  }

  infoFields.forEach(([label, value]) => {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    const labelX = margin + 6;
    const valueX = margin + 52;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${label}:`, labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "", valueX, y);
    // Form-line underline beneath value
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(valueX, y + 1.5, pageWidth - margin, y + 1.5);
    y += 6;
  });

  addSpacing(4);
  addLine();

  // ===== RIGHT TO CANCEL =====
  addText(
    "RIGHT TO CANCEL: The Customer acknowledges there is a three day right to cancel as set forth in La. R.S. 9:3538 (E).",
    9,
    false,
  );
  addSpacing(2);

  // Add initial image
  const iniImg = getSignatureForPDF(initialPadInstance);
  if (iniImg) {
    doc.text("Initial:", margin, y);
    doc.addImage(iniImg, "PNG", margin + 16, y - 3, 35, 12);
    y += 12;
  } else {
    y += 6;
  }

  addSpacing(4);

  // ===== LEGAL SECTIONS =====
  const legalTexts = [
    [
      "SCOPE OF THE WORK, TERMS AND PAYMENT:",
      "By signing below, the Customer Agrees to the scope of work and the terms set forth herein, as well as the prices pursuant to the rate sheet attached. Big Bass Tree Service, LLC, (hereinafter, Big Bass Tree Service) reserves the right, in its sole and absolute judgment, to determine what equipment, labor, and materials will be used to safely perform the work. Big Bass Tree Service is a licensed Louisiana arborist, license number 2687, and insured. The Customer is hiring Big Bass Tree Service to perform the scope of services set forth herein and expressly agrees to help Big Bass Tree Service receive payment from the insurance carrier. The Customer allows Big Bass Tree Service to contact, interact with, bill, and respond to the insurance company directly; however, Big Bass Tree Service is under no obligation to do so in order to obtain insurance proceeds or payment, as this responsibility remains the responsibility of the Customer. Customer is assigning the value of insurance benefits for the tree removal portion only to Big Bass Tree Service and agrees that the insurance company may issue and mail payment directly to Big Bass Tree Service. In the event that the price for Big Bass Tree Service's services exceeds the recovery allowed by insurance because of maximum coverage, an exclusion, or otherwise, the Customer is responsible for the payment to Big Bass Tree Service for its services as set forth herein. All accounts are net payable upon completion of the work. The Customer provides a personal guarantee for payment for the services rendered herein by Big Bass Tree Service, regardless of insurance. Any balances not collected after ten (10) days of invoice date will be assessed a five percent (5%) late fee each month until paid, plus any and all cost of collection, including but not limited to reasonable attorney's fees, court cost, and interest in the event of the Customer failing to pay. Any proceedings involving collection shall be pursuant to Louisiana law and in the venue where the work is performed, or where Big Bass Tree Service, is domiciled.",
    ],
    [
      "LIEN:",
      "If Customer fails to pay Big Bass Tree Service for the work, Big Bass Tree Service shall be entitled to record a construction/contractor's lien against the property upon which the work is sited. Big Bass Tree Service is not a residential or commercial builder, alteration contractor, electrician, plumber, or electrical contractor, and is not required to have a license to perform the work under this contract.",
    ],
    [
      "DELIVERY OF THE PROPERTY:",
      "Customer is responsible for delivering the property to Big Bass Tree Service in workable condition and shall use its best efforts to facilitate Big Bass Tree Service's performance of the work. The property shall be delivered to Big Bass Tree Service in a stable and safe working environment free from pet waste and other hazardous waste. There will be a $300.00 fee charged for any feces in the yard where the work is performed. Customer agrees to keep the driveways clear and available for movement and parking of trucks and equipment to be used during normal work hours or as otherwise requested as necessary to perform the work. Big Bass Tree Service, its employees, and those with whom it is working shall not be expected to keep gates closed to animals or children.",
    ],
    [
      "PERMITS:",
      "Customer is responsible for and shall obtain and pay for all required permits.",
    ],
    [
      "PROPERTY LINES AND RESTRICTIONS:",
      "Customer shall indicate to Big Bass Tree Service the boundaries of the property upon which the work site rests and is responsible for the accuracy of the markers. Customer agrees to provide Big Bass Tree Service with a copy of any restrictions, easements, or rights of way.",
    ],
    [
      "INHERENT HAZARDS AND RISKS:",
      "Trees inherently pose a certain degree of hazard and risk from breakage, failure, and other causes and conditions. Recommendations made by Big Bass Tree Service are intended to minimize or reduce hazardous conditions that may be associated with trees. While such recommendations should reduce the risk of tree failure, they cannot eliminate such risk, especially in the event of a storm or any other act of God. Therefore, there is and can be no guarantee that efforts to mitigate against unsafe conditions will prevent breakage or failure of a tree. Additionally, some hazardous conditions in landscapes are apparent, while others require detailed inspection and evaluation. While a detailed inspection and evaluation should and normally does result in the detection of potentially hazardous conditions, there can be no guarantee or certainty that all hazardous conditions will be detected.",
    ],
    [
      "EXPENSES FOR UNUSUAL OR UNANTICIPATED CONDITIONS:",
      "Customer is responsible for any and all expense and cost incurred by Big Bass Tree Service due to unusual or unanticipated conditions, environmental hazards, concealed conditions or damage, and/or existing defects, which Big Bass Tree Service discovers during the course of the work. Big Bass Tree Service is neither liable nor responsible for repairing these conditions. Customer agrees to pay Big Bass Tree Service on a time and materials basis for any unanticipated contingencies resulting in a modification to the work occasioned by for example, concrete, foreign matter, stinging insects, nests, rocks, pipes, electrical, etc. encountered in the course of the work and not otherwise specified in this contract by Big Bass Tree Service.",
    ],
    [
      "PERFORMANCE OF THE WORK:",
      "Work crews will arrive at the job site unannounced unless otherwise noted herein. Big Bass Tree Service may remove fence boards to access the property, but replacement of these fence boards remains the responsibility of the Customer. Customer acknowledges and understands Big Bass Tree Service uses heavy machinery, and that such machinery may cause underlying damage to concrete, paved, and other prepared surfaces. Big Bass Tree Service shall not be liable for any damage caused to the property and other ground structures. Big Bass Tree Service will use reasonable care to minimize damage to concrete driveways and sidewalks by using appropriate ground protection mats for ingress and egress if the client elects to use these mats for an additional fee as shown herein. Any failure while using mats is not the responsibility of Big Bass Tree Service. Big Bass Tree Service shall have no liability or responsibility for noise or vibrations to the premises due to Big Bass Tree Service's performance of the work, or for any personal or property damage associated with or arising therefrom. Big Bass Tree Service will not be responsible for any underground objects, specifically including, but not limited to, piping, utilities, septic tanks, sewer, wiring, conduit, plumbing, electrical, gas, water lines, or sprinkler systems. Big Bass Tree Service will not be responsible for sewer cleanout or damage to septic tanks. Big Bass Tree Service will not be responsible for any unforeseen conditions. Big Bass Tree Service will use reasonable care to minimize damage to trees, vegetation, landscaping, fences and grass/yards, but Big Bass Tree Service will not be responsible for any damages to trees, vegetation, landscaping, fences and grass/yards and the like. Big Bass Tree Service shall attempt to meet all performance dates, but shall not be liable for damages due to delays from inclement weather or other causes beyond our control.",
    ],
    [
      "TARPS:",
      "Big Bass Tree Service may tarp a structure or other item to protect it prior to, during, and after work. Big Bass Tree Service cannot guarantee that tarp will protect a structure during all weather conditions or events or remain intact or in place. Customer acknowledges, understands, and agrees that a tarp may dislodge and cause damage to other items of personal property and that Big Bass Tree Service shall not be liable for any damage arising therefrom or in relations thereto.",
    ],
    [
      "NO LIABILITY:",
      "Big Bass Tree Service shall not be involved in or liable for any conflicts pursuant to La. R.S. 3:4278.1, trespass, or allegations, claims, demands, or suits for damages in any way related to property belonging to another. Customer represents and warrants that Customer is the owner of all of the property, including, but not limited to, trees, shrubs, plants, flowers, bushes, fencing, land, grass, for which it has hired Big Bass Tree Service's services, or Customer has the proper authority to have the services of Big Bass Tree Service performed. Customer shall indemnify, hold harmless, and defend Big Bass Tree Service from any and all allegations, claims, demands, or suits arising from La. R.S. 3:4278.1, trespass and/or Big Bass Tree Service's services on any property belonging to another.",
    ],
    [
      "ACT OF GOD:",
      "You understand, acknowledge, and agree that work may be postponed, in whole or in part, due to the exigencies beyond Big Bass Tree Service's control, including, but not limited to, declarations of governmental bodies, hazardous or impenetrable road conditions, weather, strike, war, insurrection, supply chain restrictions, etc. and that your obligations under this contract are not relieved due to any such delay.",
    ],
    [
      "INDEMNIFICATION:",
      "By execution of this contract, you expressly agree to defend, indemnify and hold harmless Big Bass Tree Service from and against any and all damages, losses, claims, and actions of any person whatsoever arising out of any damage caused to any person or property arising in the course of the work, unless occasioned by an improper intentional act of Big Bass Tree Service.",
    ],
    [
      "LIMITATION OF RECOVERY:",
      "In the event of damage, loss, claim, or action for which you have the right of recovery, you expressly agree that in no event shall you seek or have the right to recover damages greater than the amounts actually remitted to Big Bass Tree Service for the work.",
    ],
    [
      "ELECTRONIC COMMUNICATIONS:",
      "Customer agrees to execute and exchange records and documents in electronic form. You shall promptly notify Big Bass Tree Service of any changes to your information set forth herein.",
    ],
    [
      "SEVERABILITY AND INTERPRETATION:",
      "This contract may be executed in any number of identical counterparts, all of which, when taken together, shall constitute the same instrument. The parties acknowledge and consent to be bound by electronic signatures, including signatures of any required witness. A facsimile, .pdf copy, and other electronically executed versions of documents executed by the parties shall be deemed an original for all relevant purposes.",
    ],
    [
      "AUTHORITY AND CONSENT:",
      "The undersigned has received, read, understands and agrees to this contract and requests that Big Bass Tree Service commence the work.",
    ],
  ];

  legalTexts.forEach(([title, body]) => {
    addSpacing(2);
    addText(title, 9, true);
    addText(body, 8.5, false);
  });

  // ===== RATE SCHEDULE =====
  addSpacing(6);
  addText("RATE SCHEDULE", 11, true);
  addSpacing(2);
  addText(
    "All rates are an eight (8) hour minimum as is customary in the industry. Normal working hours are 9:00 AM to 5:00 PM.",
    8.5,
    false,
  );
  addSpacing(4);

  const selectedRates = data.rates.filter((r) => r.selected);
  let rateTotal = 0;

  if (selectedRates.length > 0) {
    // Table header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("#", margin, y);
    doc.text("Item / Service", margin + 10, y);
    doc.text("Price", pageWidth - margin, y, { align: "right" });
    y += 2;
    doc.setDrawColor(27, 107, 58);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    selectedRates.forEach((r) => {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      const price = parseFloat(r.price) || 0;
      rateTotal += price;
      const qtyText = r.qty ? ` (${r.qty} people)` : "";
      doc.text(`${r.id}.`, margin, y);
      doc.text(`${r.name}${qtyText}`, margin + 10, y);
      doc.text(`$${price.toFixed(2)}`, pageWidth - margin, y, {
        align: "right",
      });
      y += 5;
    });

    // Total
    y += 2;
    doc.setDrawColor(27, 107, 58);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Total:", margin + 10, y);
    doc.text(`$${rateTotal.toFixed(2)}`, pageWidth - margin, y, {
      align: "right",
    });
    y += 8;
  }

  // ===== SIGNATURES =====
  addSpacing(12);

  // Ensure enough space for full signature block, otherwise new page
  if (y > doc.internal.pageSize.getHeight() - 70) {
    doc.addPage();
    y = margin;
  }

  // Customer signature
  const sigImg = getSignatureForPDF(signaturePadInstance);
  if (sigImg) {
    doc.addImage(sigImg, "PNG", margin, y, 70, 25);
  }
  y += 28;

  doc.setDrawColor(80);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 80, y);
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Customer Signature", margin, y);
  const sigDate = document.getElementById("signatureDate").value;
  doc.text(`Date: ${sigDate}`, pageWidth / 2 + 10, y);

  y += 15;
  doc.setDrawColor(80);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 80, y);
  doc.line(pageWidth / 2 + 10, y, pageWidth - margin, y);
  y += 5;
  doc.text("Big Bass Tree Service, LLC", margin, y);
  doc.text("Date", pageWidth / 2 + 10, y);

  // Save
  const fileName = `BigBass_Contract_${data.customerName.replace(/\s+/g, "_") || "unsigned"}_${new Date().toISOString().split("T")[0]}.pdf`;
  if (!skipDownload) {
    doc.save(fileName);
    showToast("PDF downloaded successfully!", "success");
  }
  return doc.output("blob");
}

function generatePDFBlob(data) {
  return downloadPDF(true);
}

// ===== UTILITIES =====
function formatPhone(e) {
  let val = e.target.value.replace(/\D/g, "");
  if (val.length > 10) val = val.substring(0, 10);
  if (val.length >= 6) {
    val = `(${val.substring(0, 3)}) ${val.substring(3, 6)}-${val.substring(6)}`;
  } else if (val.length >= 3) {
    val = `(${val.substring(0, 3)}) ${val.substring(3)}`;
  }
  e.target.value = val;
}

function formatCurrency(e) {
  let val = e.target.value.replace(/[^0-9.]/g, "");
  if (val) {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      e.target.value =
        "$" +
        num.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
    }
  }
}

function unformatCurrency(e) {
  let val = e.target.value.replace(/[^0-9.]/g, "");
  e.target.value = val;
}

function showFieldHint(input, message) {
  clearFieldHint(input);
  const hint = document.createElement("span");
  hint.className = "field-hint error-hint";
  hint.textContent = message;
  input.parentElement.appendChild(hint);
}

function clearFieldHint(input) {
  const existing = input.parentElement.querySelector(".field-hint");
  if (existing) existing.remove();
}

function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show " + (type || "");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function startOver() {
  // Show confirmation dialog if there's data to lose
  const hasData =
    selectedContractType ||
    document.getElementById("customerName").value.trim();
  if (
    hasData &&
    !confirm(
      "Are you sure you want to start over? All entered data will be lost.",
    )
  ) {
    return;
  }

  selectedContractType = null;

  // Clear auto-save
  sessionStorage.removeItem(AUTOSAVE_KEY);

  // Reset form
  document.getElementById("customerForm").reset();

  // Uncheck all rates
  for (let i = 1; i <= 11; i++) {
    document.getElementById(`rate${i}`).checked = false;
    document.getElementById(`rate${i}Price`).value = "";
    document.getElementById(`rate${i}Price`).disabled = true;
    document
      .getElementById(`rate${i}`)
      .closest(".rate-item")
      .classList.remove("active");
  }
  document.getElementById("rate6Qty").value = "";
  document.getElementById("rate6Qty").disabled = true;
  document.getElementById("rateTotal").textContent = "$0.00";

  // Clear cards
  document
    .querySelectorAll(".contract-card")
    .forEach((c) => c.classList.remove("selected"));

  // Hide conditional sections
  document.getElementById("insuranceSection").style.display = "none";
  document.getElementById("insuranceScopeSection").style.display = "none";
  document.getElementById("generalDateSection").style.display = "none";

  // Clear signatures
  if (signaturePadInstance) signaturePadInstance.clear();
  if (initialPadInstance) initialPadInstance.clear();

  // Reset date
  const now = new Date();
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  document.getElementById("signatureDate").value = now
    .toISOString()
    .split("T")[0];
  document.getElementById("dateOfLoss").value = now.toISOString().split("T")[0];
  document.getElementById("agreementDay").value = now.getDate();
  document.getElementById("agreementMonth").value = months[now.getMonth()];
  document.getElementById("agreementYear").value = now.getFullYear();

  // Reset same-as-address
  const sameAddr = document.getElementById("sameAsAddress");
  if (sameAddr) {
    sameAddr.checked = false;
    document.getElementById("locationOfServices").removeAttribute("readonly");
    document
      .getElementById("locationOfServices")
      .classList.remove("auto-filled");
  }

  // Clear errors
  document
    .querySelectorAll(".error")
    .forEach((el) => el.classList.remove("error"));

  // Go to step 1
  goToStep(1);
}

// ===== AUTO-SAVE =====
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveToLocalStorage, 800);
}

function saveToLocalStorage() {
  const formFields = {};
  const form = document.getElementById("customerForm");
  if (form) {
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      if (el.id) formFields[el.id] = el.value;
    });
  }

  // Save rate selections
  const rates = {};
  for (let i = 1; i <= 11; i++) {
    rates[`rate${i}`] = document.getElementById(`rate${i}`).checked;
    rates[`rate${i}Price`] = document.getElementById(`rate${i}Price`).value;
  }
  rates["rate6Qty"] = document.getElementById("rate6Qty").value;

  const state = {
    contractType: selectedContractType,
    currentStep: currentStep,
    formFields: formFields,
    rates: rates,
    savedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // sessionStorage full or unavailable — fail silently
  }
}

function restoreAutosave() {
  let saved;
  try {
    const raw = sessionStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return;
    saved = JSON.parse(raw);
  } catch (e) {
    return;
  }

  // Only restore if saved within the last 24 hours
  if (!saved || !saved.savedAt || Date.now() - saved.savedAt > 86400000) {
    sessionStorage.removeItem(AUTOSAVE_KEY);
    return;
  }

  // Show the restore prompt overlay
  const overlay = document.getElementById("restorePromptOverlay");
  const typeName =
    saved.contractType === "insurance"
      ? "Insurance Services"
      : "General Services";
  const savedDate = new Date(saved.savedAt);
  const timeStr = savedDate.toLocaleString();

  document.getElementById("restorePromptDetails").textContent =
    `${typeName} contract — last saved ${timeStr}`;

  overlay.classList.add("active");

  document.getElementById("restorePromptLoad").onclick = function () {
    overlay.classList.remove("active");
    applyAutosaveData(saved);
    showToast("Previous progress restored.", "success");
  };

  document.getElementById("restorePromptNew").onclick = function () {
    overlay.classList.remove("active");
    sessionStorage.removeItem(AUTOSAVE_KEY);
  };
}

function applyAutosaveData(saved) {
  // Restore contract type selection
  if (saved.contractType) {
    selectedContractType = saved.contractType;
    document
      .querySelector(`.contract-card[data-type="${saved.contractType}"]`)
      .classList.add("selected");

    const insuranceSection = document.getElementById("insuranceSection");
    const insuranceScopeSection = document.getElementById(
      "insuranceScopeSection",
    );
    const generalDateSection = document.getElementById("generalDateSection");

    if (saved.contractType === "insurance") {
      insuranceSection.style.display = "block";
      insuranceScopeSection.style.display = "block";
      generalDateSection.style.display = "none";
      setFieldsRequired(insuranceSection, true);
      setFieldsRequired(insuranceScopeSection, true);
      setFieldsRequired(generalDateSection, false);
    } else {
      insuranceSection.style.display = "none";
      insuranceScopeSection.style.display = "none";
      generalDateSection.style.display = "block";
    }
  }

  // Restore form field values
  if (saved.formFields) {
    Object.entries(saved.formFields).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });
  }

  // Restore rate selections
  if (saved.rates) {
    for (let i = 1; i <= 11; i++) {
      const checkbox = document.getElementById(`rate${i}`);
      const priceInput = document.getElementById(`rate${i}Price`);
      if (saved.rates[`rate${i}`]) {
        checkbox.checked = true;
        priceInput.disabled = false;
        priceInput.value = saved.rates[`rate${i}Price`] || "";
        checkbox.closest(".rate-item").classList.add("active");
      }
    }
    if (saved.rates["rate6Qty"]) {
      const qtyInput = document.getElementById("rate6Qty");
      qtyInput.value = saved.rates["rate6Qty"];
      if (document.getElementById("rate6").checked) qtyInput.disabled = false;
    }
    calculateTotal();
  }

  // Restore to saved step (but not past step 3 — signatures can't be restored)
  if (saved.contractType && saved.currentStep > 1 && saved.currentStep <= 3) {
    goToStep(saved.currentStep);
  } else if (saved.contractType) {
    goToStep(2);
  }
}
