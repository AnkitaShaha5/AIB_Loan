/**
 * AIB Loan Tracker – mobile PWA
 * Data persists in localStorage on your phone.
 */

const STORAGE_KEY = "aib-loan-tracker-v1";

const DEFAULT_CONFIG = {
  loanAmount: 463500,
  annualRate: 3.2,
  emi: 1858.36,
  loanStart: "2025-11-09",
  firstEmi: "2026-05-09",
  holidayMonths: 6,
  lumpSum: 5000,
  lumpSumDate: "2026-01-09",
  loanExpiry: "2060-10-11",
  mortgageAccount: "937738 / 33549181",
  product: "GreenA 3 Year LTV Fixed >80%",
};

// Confirmed AIB anchors (id -> payment record overrides)
const CONFIRMED = {
  "2026-07-09": {
    openingBalance: 464888.28,
    closingBalance: 463029.92,
    emiPaid: 1858.36,
    paid: true,
    notes: "Confirmed: AIB balance 01-Jul-2026",
    confirmed: true,
  },
  "2026-08-09": {
    openingBalance: 463029.92,
    closingBalance: 463029.92,
    notes: "Current balance – EMI due",
  },
};

const DEFAULT_PAYMENTS = {
  "2026-07-09": {
    emiPaid: 1858.36,
    extraPaid: 0,
    paid: true,
    notes: "Confirmed after AIB statement",
    paidAt: "2026-07-09",
  },
};

let state = loadState();
let currentFilter = "all";
let editingEntryId = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    config: { ...DEFAULT_CONFIG },
    payments: { ...DEFAULT_PAYMENTS },
    schedule: null,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function fmtDisplay(d) {
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMonth(d) {
  return d.toLocaleDateString("en-IE", { month: "short", year: "numeric" });
}

function fmtEUR(n) {
  if (n === "" || n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);
}

function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function isQuarterPost(d) {
  return [3, 6, 9, 12].includes(d.getMonth() + 1) && d.getDate() === 16;
}

function buildSchedule() {
  const cfg = state.config;
  const rate = cfg.annualRate / 100;
  let balance = cfg.loanAmount;
  let accrued = 0;

  const start = parseDate(cfg.loanStart);
  const expiry = parseDate(cfg.loanExpiry);
  const firstEmi = parseDate(cfg.firstEmi);
  const holidayEnd = addMonths(start, cfg.holidayMonths - 1);
  holidayEnd.setDate(9);

  const entries = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 9);
  if (cursor < start) cursor = new Date(start);

  let emiNum = 0;

  while (cursor <= expiry) {
    const id = fmtDate(cursor);
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0);

    let opening = balance;
    let monthAccrued = 0;
    let quarterPosted = 0;
    let lump = 0;

    const isHoliday = cursor <= holidayEnd && cursor < firstEmi;
    const emiDue = cursor >= firstEmi ? cfg.emi : 0;
    if (emiDue) emiNum++;

    // Confirmed anchor – Jul 2026
    if (CONFIRMED[id]) {
      const c = CONFIRMED[id];
      const pay = state.payments[id] || {};
      opening = c.openingBalance ?? opening;
      let closing = c.closingBalance ?? opening;
      const emiPaid = pay.emiPaid ?? c.emiPaid ?? 0;

      entries.push({
        id,
        date: new Date(cursor),
        monthLabel: fmtMonth(cursor),
        opening,
        emiDue,
        emiPaid: emiPaid || "",
        extraPaid: pay.extraPaid || 0,
        lumpSum: 0,
        quarterPosted: 0,
        closing,
        phase: isHoliday ? "holiday" : "emi",
        emiNum,
        paid: pay.paid ?? c.paid ?? false,
        notes: pay.notes || c.notes || "",
        confirmed: c.confirmed || false,
      });
      balance = closing;
      cursor = addMonths(cursor, 1);
      continue;
    }

    // Aug 2026 special – current balance, EMI due
    if (id === "2026-08-09") {
      opening = CONFIRMED[id].openingBalance;
      balance = opening;
      const pay = state.payments[id] || {};
      const emiPaid = pay.emiPaid || 0;
      let closing = emiPaid ? opening - emiPaid + (pay.extraPaid || 0) : opening;

      entries.push({
        id,
        date: new Date(cursor),
        monthLabel: fmtMonth(cursor),
        opening,
        emiDue,
        emiPaid: emiPaid || "",
        extraPaid: pay.extraPaid || 0,
        lumpSum: 0,
        quarterPosted: 0,
        closing,
        phase: "emi",
        emiNum,
        paid: pay.paid || false,
        notes: pay.notes || CONFIRMED[id].notes,
        confirmed: false,
      });
      balance = closing;
      cursor = addMonths(cursor, 1);
      continue;
    }

    // Daily accrual for month
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const d = new Date(y, m, day);
      const daily = (balance * rate) / 365;
      accrued += daily;
      monthAccrued += daily;
      if (isQuarterPost(d)) {
        balance += accrued;
        quarterPosted += accrued;
        accrued = 0;
      }
    }

    if (id === cfg.lumpSumDate && cfg.lumpSum) {
      lump = cfg.lumpSum;
      balance -= lump;
    }

    const pay = state.payments[id] || {};
    let emiPaid = pay.emiPaid || 0;
    let extraPaid = pay.extraPaid || 0;

    // Project unpaid past EMIs (May, Jun) as paid for display
    if (!emiPaid && emiDue && cursor < parseDate("2026-07-09") && cursor >= firstEmi) {
      if (!state.payments[id]) {
        emiPaid = cfg.emi;
      }
    }

    if (emiPaid) {
      balance -= emiPaid;
    }
    if (extraPaid) {
      balance -= extraPaid;
    }

    // Project future EMIs
    if (!emiPaid && emiDue && cursor > parseDate("2026-08-09")) {
      balance -= cfg.emi;
      emiPaid = cfg.emi;
    }

    const closing = Math.round(balance * 100) / 100;

    entries.push({
      id,
      date: new Date(cursor),
      monthLabel: fmtMonth(cursor),
      opening: Math.round(opening * 100) / 100,
      emiDue,
      emiPaid: pay.emiPaid || (emiPaid && !pay.paid ? "" : emiPaid) || "",
      extraPaid,
      lumpSum: lump,
      quarterPosted: Math.round(quarterPosted * 100) / 100,
      closing,
      phase: isHoliday ? "holiday" : emiDue ? "emi" : "accrual",
      emiNum: emiDue ? emiNum : 0,
      paid: pay.paid || false,
      notes: pay.notes || "",
      confirmed: false,
    });

    balance = closing;
    cursor = addMonths(cursor, 1);
  }

  state.schedule = entries;
  return entries;
}

function getCurrentBalance(schedule) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let balance = state.config.loanAmount;
  for (const e of schedule) {
    if (e.date <= today) balance = e.closing;
    else break;
  }
  // Prefer confirmed Aug opening if we're in Aug 2026 before next EMI effect
  const aug = schedule.find((e) => e.id === "2026-08-09");
  if (aug && today >= parseDate("2026-07-09") && today < parseDate("2026-09-09")) {
    return aug.paid ? aug.closing : aug.opening;
  }
  const jul = schedule.find((e) => e.id === "2026-07-09");
  if (jul && jul.paid) return jul.closing;
  return balance;
}

function renderDashboard(schedule) {
  const cfg = state.config;
  const balance = getCurrentBalance(schedule);
  const daily = (balance * (cfg.annualRate / 100)) / 365;

  document.getElementById("dash-balance").textContent = fmtEUR(balance);
  document.getElementById("dash-updated").textContent = `As of ${fmtDisplay(new Date())}`;
  document.getElementById("dash-emi").textContent = fmtEUR(cfg.emi);
  document.getElementById("dash-daily").textContent = fmtEUR(daily);
  
  const paidEntries = schedule.filter((e) => e.paid && e.emiPaid);
  const totalPaid = paidEntries.reduce((s, e) => s + Number(e.emiPaid) + Number(e.extraPaid || 0), 0);
  document.getElementById("dash-paid-count").textContent = paidEntries.length;
  document.getElementById("dash-total-paid").textContent = fmtEUR(totalPaid);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = schedule.find(
    (e) => e.emiDue && !e.paid && e.date >= today
  ) || schedule.find((e) => e.emiDue && !e.paid);

  const nextEl = document.getElementById("next-emi-content");
  if (next) {
    const daysUntil = Math.ceil((next.date - today) / (1000 * 60 * 60 * 24));
    nextEl.innerHTML = `
      <div class="next-row">
        <span class="next-date">${fmtDisplay(next.date)}</span>
        <span class="next-amount">${fmtEUR(next.emiDue)}</span>
      </div>
      <p style="color:var(--muted);font-size:0.875rem">
        ${daysUntil > 0 ? `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}` : daysUntil === 0 ? "Due today!" : "Overdue"}
        · Opening balance ${fmtEUR(next.opening)}
      </p>
      <button type="button" class="btn primary" style="width:100%;margin-top:0.75rem" onclick="openPayment('${next.id}')">
        Record Payment
      </button>
    `;
  } else {
    nextEl.innerHTML = `<p class="empty-state">No upcoming EMIs</p>`;
  }

  document.getElementById("loan-summary").innerHTML = `
    <dt>Original loan</dt><dd>${fmtEUR(cfg.loanAmount)}</dd>
    <dt>Interest rate</dt><dd>${cfg.annualRate}% fixed (3 yrs)</dd>
    <dt>Loan start</dt><dd>${fmtDisplay(parseDate(cfg.loanStart))}</dd>
    <dt>First EMI</dt><dd>${fmtDisplay(parseDate(cfg.firstEmi))}</dd>
    <dt>Account</dt><dd>${cfg.mortgageAccount}</dd>
    <dt>Product</dt><dd>${cfg.product}</dd>
    <dt>Loan expiry</dt><dd>${fmtDisplay(parseDate(cfg.loanExpiry))}</dd>
  `;
}

function renderSchedule(schedule) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = schedule.filter((e) => {
    if (currentFilter === "all") return e.emiDue || e.phase === "holiday" || e.lumpSum;
    if (currentFilter === "paid") return e.paid;
    if (currentFilter === "due") return e.emiDue && !e.paid && e.date <= today;
    if (currentFilter === "upcoming") return e.emiDue && !e.paid && e.date > today;
    return true;
  });

  const list = document.getElementById("schedule-list");
  if (!filtered.length) {
    list.innerHTML = `<li class="empty-state">No entries match this filter</li>`;
    return;
  }

  list.innerHTML = filtered
    .slice(0, 120)
    .map((e) => {
      let cls = "schedule-item";
      if (e.phase === "holiday") cls += " holiday";
      if (e.confirmed) cls += " confirmed";
      else if (e.paid) cls += " paid";
      else if (e.emiDue && e.date <= today) cls += " due";

      let badge = e.phase === "holiday" ? "Holiday" : e.paid ? "Paid" : e.emiDue ? "EMI" : "—";
      if (e.confirmed) badge = "Confirmed";

      return `
        <li class="${cls}" onclick="openPayment('${e.id}')">
          <div class="item-top">
            <span class="item-month">${e.monthLabel}</span>
            <span class="item-badge ${e.paid ? "paid" : e.emiDue && !e.paid ? "due" : ""}">${badge}</span>
          </div>
          <div class="item-details">
            <span>Opening <strong>${fmtEUR(e.opening)}</strong></span>
            <span>Closing <strong>${fmtEUR(e.closing)}</strong></span>
            ${e.emiDue ? `<span>EMI <strong>${fmtEUR(e.emiDue)}</strong></span>` : ""}
            ${e.emiPaid ? `<span>Paid <strong>${fmtEUR(e.emiPaid)}</strong></span>` : ""}
            ${e.lumpSum ? `<span>Lump sum <strong>${fmtEUR(e.lumpSum)}</strong></span>` : ""}
          </div>
          ${e.notes ? `<p style="margin-top:0.5rem;font-size:0.75rem;color:var(--muted)">${e.notes}</p>` : ""}
        </li>
      `;
    })
    .join("");
}

function renderSettings() {
  const cfg = state.config;
  const form = document.getElementById("settings-form");
  form.loanAmount.value = cfg.loanAmount;
  form.annualRate.value = cfg.annualRate;
  form.emi.value = cfg.emi;
  form.loanStart.value = cfg.loanStart;
  form.firstEmi.value = cfg.firstEmi;
  form.holidayMonths.value = cfg.holidayMonths;
  form.lumpSum.value = cfg.lumpSum || 0;
}

function render() {
  const schedule = buildSchedule();
  renderDashboard(schedule);
  renderSchedule(schedule);
  renderSettings();
  saveState();
}

function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${name}`).classList.add("active");
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.view === name);
  });
}

window.openPayment = function (id) {
  const entry = state.schedule.find((e) => e.id === id);
  if (!entry || !entry.emiDue) return;

  editingEntryId = id;
  const pay = state.payments[id] || {};
  document.getElementById("modal-title").textContent = "Record Payment";
  document.getElementById("modal-subtitle").textContent = `${fmtDisplay(entry.date)} · EMI ${fmtEUR(entry.emiDue)}`;
  const form = document.getElementById("payment-form");
  form.emiPaid.value = pay.emiPaid || entry.emiDue;
  form.extraPaid.value = pay.extraPaid || 0;
  form.notes.value = pay.notes || "";
  document.getElementById("modal").classList.remove("hidden");
};

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  editingEntryId = null;
}

// Event listeners
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => showView(tab.dataset.view));
});

document.getElementById("btn-settings").addEventListener("click", () => showView("settings"));

document.querySelectorAll(".filter").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderSchedule(buildSchedule());
  });
});

document.getElementById("payment-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  state.payments[editingEntryId] = {
    emiPaid: parseFloat(fd.get("emiPaid")) || 0,
    extraPaid: parseFloat(fd.get("extraPaid")) || 0,
    notes: fd.get("notes") || "",
    paid: true,
    paidAt: fmtDate(new Date()),
  };
  closeModal();
  render();
});

document.getElementById("modal-cancel").addEventListener("click", closeModal);
document.querySelector(".modal-backdrop").addEventListener("click", closeModal);

document.getElementById("modal-unpay").addEventListener("click", () => {
  if (editingEntryId) {
    delete state.payments[editingEntryId];
    closeModal();
    render();
  }
});

document.getElementById("settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  state.config = {
    ...state.config,
    loanAmount: parseFloat(fd.get("loanAmount")),
    annualRate: parseFloat(fd.get("annualRate")),
    emi: parseFloat(fd.get("emi")),
    loanStart: fd.get("loanStart"),
    firstEmi: fd.get("firstEmi"),
    holidayMonths: parseInt(fd.get("holidayMonths"), 10),
    lumpSum: parseFloat(fd.get("lumpSum")) || 0,
  };
  showView("dashboard");
  render();
});

document.getElementById("btn-reset").addEventListener("click", () => {
  if (confirm("Reset all data to defaults? Your payment history will be lost.")) {
    state = {
      config: { ...DEFAULT_CONFIG },
      payments: { ...DEFAULT_PAYMENTS },
      schedule: null,
    };
    render();
    showView("dashboard");
  }
});

// Register service worker for offline
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

render();
