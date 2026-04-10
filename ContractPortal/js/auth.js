// ================================================
// Authentication & Admin Settings
// ================================================

let currentUser = null;

// ===== FIREBASE INIT =====
function initFirebase() {
  if (typeof firebase === "undefined") {
    console.warn("Firebase SDK not loaded");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Persist auth across browser sessions
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
    console.warn("Auth persistence error:", err);
  });

  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    // Only treat email-authenticated users as admins.
    // Anonymous users (from the signing page) must NOT access the portal.
    const isAdmin = user && !user.isAnonymous && user.email;

    if (user && user.isAnonymous) {
      // Sign out anonymous users from the portal — they don't belong here
      auth.signOut();
      return;
    }

    currentUser = isAdmin ? user : null;
    updateAuthUI(isAdmin ? user : null);

    if (isAdmin) {
      loadAdminSettings();
      // Show main content once authenticated
      document.getElementById('portalAuthGate').style.display = 'none';
      document.querySelector('.main-content').style.display = '';
      document.getElementById('progressBar').style.display = '';
      // Show dashboard nav
      if (typeof showDashboardNav === "function") showDashboardNav();
    } else {
      // Gate content behind login
      document.getElementById('portalAuthGate').style.display = 'flex';
      document.querySelector('.main-content').style.display = 'none';
      document.getElementById('progressBar').style.display = 'none';
      // Hide dashboard nav and dashboards
      if (typeof hideDashboardNav === "function") hideDashboardNav();
    }
  });
}

// ===== AUTH UI =====
function updateAuthUI(user) {
  const loginBtn = document.getElementById("headerLoginBtn");
  const adminToggle = document.getElementById("adminPanelToggle");
  const userDisplay = document.getElementById("headerUserDisplay");

  if (user) {
    loginBtn.style.display = "none";
    userDisplay.style.display = "flex";
    adminToggle.style.display = "inline-flex";
    document.getElementById("headerUserName").textContent = user.email;
  } else {
    loginBtn.style.display = "inline-flex";
    userDisplay.style.display = "none";
    adminToggle.style.display = "none";
    closeAdminPanel();
  }
}

// ===== LOGIN =====
function openLoginModal() {
  document.getElementById("loginOverlay").classList.add("active");
  document.getElementById("loginEmail").focus();
  document.getElementById("loginError").textContent = "";
}

function closeLoginModal() {
  document.getElementById("loginOverlay").classList.remove("active");
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginError").textContent = "";
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");
  const submitBtn = document.getElementById("loginSubmitBtn");

  if (!email || !password) {
    errorEl.textContent = "Please enter email and password.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in...";
  errorEl.textContent = "";

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    closeLoginModal();
    showToast("Signed in successfully.", "success");
  } catch (err) {
    const messages = {
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-email": "Invalid email address.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/invalid-credential": "Invalid email or password.",
    };
    errorEl.textContent =
      messages[err.code] || "Sign in failed. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";
  }
}

async function handleLogout() {
  try {
    await firebase.auth().signOut();
    closeAdminPanel();
    showToast("Signed out.", "success");
  } catch (err) {
    showToast("Error signing out.", "error");
  }
}

// ===== ADMIN PANEL =====
function toggleAdminPanel() {
  const panel = document.getElementById("adminPanel");
  panel.classList.toggle("open");
}

function closeAdminPanel() {
  document.getElementById("adminPanel").classList.remove("open");
}

async function loadAdminSettings() {
  if (!currentUser) return;

  try {
    const db = firebase.firestore();
    const doc = await db.collection("settings").doc("company").get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById("settingCompanyEmail").value =
        data.companyEmail || "";
      document.getElementById("settingCompanyName").value =
        data.companyName || "Big Bass Tree Services, LLC";
      document.getElementById("settingCompanyPhone").value =
        data.companyPhone || "";
      document.getElementById("settingEmailEnabled").checked =
        data.emailEnabled !== false;
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

async function saveAdminSettings(e) {
  e.preventDefault();
  if (!currentUser) {
    showToast("You must be signed in to save settings.", "error");
    return;
  }

  const saveBtn = document.getElementById("adminSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const settings = {
    companyEmail: document.getElementById("settingCompanyEmail").value.trim(),
    companyName: document.getElementById("settingCompanyName").value.trim(),
    companyPhone: document.getElementById("settingCompanyPhone").value.trim(),
    emailEnabled: document.getElementById("settingEmailEnabled").checked,
    updatedBy: currentUser.email,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const db = firebase.firestore();
    await db
      .collection("settings")
      .doc("company")
      .set(settings, { merge: true });
    showToast("Settings saved.", "success");
  } catch (err) {
    console.error("Failed to save settings:", err);
    showToast("Failed to save settings. Check your permissions.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Settings";
  }
}

// ===== EMAIL CONTRACT =====
async function emailContract(pdfBlob, data) {
  // Check if EmailJS is configured
  if (
    typeof emailjs === "undefined" ||
    EMAILJS_CONFIG.publicKey === "YOUR_EMAILJS_PUBLIC_KEY"
  ) {
    return; // EmailJS not configured — skip silently
  }

  // Load company settings
  let companyEmail = "";
  let emailEnabled = true;
  try {
    if (typeof firebase !== "undefined" && firebase.apps.length > 0) {
      const db = firebase.firestore();
      const doc = await db.collection("settings").doc("company").get();
      if (doc.exists) {
        companyEmail = doc.data().companyEmail || "";
        emailEnabled = doc.data().emailEnabled !== false;
      }
    }
  } catch (err) {
    console.error("Could not load email settings:", err);
  }

  if (!emailEnabled) return;

  const customerEmail = data.emailAddress;
  const customerName = data.customerName;
  const contractType =
    selectedContractType === "insurance"
      ? "Insurance Services"
      : "General Services";

  // Upload PDF to Firebase Storage and get download link
  let pdfDownloadUrl = "";
  try {
    const storage = firebase.storage();
    const timestamp = Date.now();
    const safeName = (customerName || "contract").replace(/[^a-zA-Z0-9]/g, "_");
    const filePath = `contracts/${safeName}_${timestamp}.pdf`;
    const storageRef = storage.ref(filePath);
    const snapshot = await storageRef.put(pdfBlob, {
      contentType: "application/pdf",
    });
    pdfDownloadUrl = await snapshot.ref.getDownloadURL();
  } catch (err) {
    console.error("PDF upload failed:", err);
  }

  const templateParams = {
    to_name: customerName,
    to_email: customerEmail,
    company_email: companyEmail,
    contract_type: contractType,
    customer_name: customerName,
    customer_email: customerEmail,
    pdf_link: pdfDownloadUrl,
  };

  try {
    // Send to customer
    if (customerEmail) {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        { ...templateParams, to_email: customerEmail, to_name: customerName },
        EMAILJS_CONFIG.publicKey,
      );
    }

    // Send copy to company
    if (companyEmail) {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        {
          ...templateParams,
          to_email: companyEmail,
          to_name: "Big Bass Tree Services",
        },
        EMAILJS_CONFIG.publicKey,
      );
    }

    showToast("Contract emails sent successfully.", "success");
  } catch (err) {
    console.error("Email send failed:", err);
    showToast("Contract submitted, but email delivery failed.", "error");
  }
}

// Init on load
document.addEventListener("DOMContentLoaded", initFirebase);
