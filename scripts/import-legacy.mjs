/**
 * One-time migration of the old Helia software's 2022-2026 export.
 *
 *   node scripts/import-legacy.mjs <workbook.xlsx>            # dry run, writes nothing
 *   node scripts/import-legacy.mjs <workbook.xlsx> --apply    # performs the import
 *
 * Three phases, each idempotent so a re-run tops up rather than duplicating:
 *   1. Services   — the old price list, merged by name against the live one.
 *   2. Patients   — one record per MR number, keyed on legacyMrNo.
 *   3. Bills      — historical invoices, keyed on legacyBillNo.
 *
 * Deliberately NOT imported: the referring-doctor payout columns on the bill
 * sheets (a 50% split on 92% of rows). Paying a doctor for a referral is
 * prohibited under the Indian Medical Council (Professional Conduct, Etiquette
 * and Ethics) Regulations 2002, cl. 6.4, so this brings across the revenue and
 * who referred, and leaves the commission ledger behind.
 */
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const FILE = process.argv[2];
if (!FILE || !fs.existsSync(FILE)) {
  console.error("usage: node scripts/import-legacy.mjs <workbook.xlsx> [--apply]");
  process.exit(1);
}

const log = (...a) => console.log(...a);
const rupeesToPaise = (v) => Math.round(Number(v || 0) * 100);
const nn = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

function normMobile(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : "";
}

/** Gender column carries "Baby of" on a few rows; the app knows three values. */
function normGender(raw) {
  const g = String(raw ?? "").trim().toLowerCase();
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  return "Other";
}

function deptOf(raw) {
  const d = String(raw ?? "").trim().toLowerCase();
  if (d.startsWith("lab")) return "LAB";
  if (d.startsWith("rad")) return "RADIOLOGY";
  return "OTHER";
}

/** DDMMYY stamp used by the UHID scheme, from an IST calendar day. */
function stamp(day) {
  const [y, m, d] = day.split("-");
  return `${d}${m}${y.slice(2)}`;
}

// --- read the workbook via python/openpyxl -----------------------------------
log("reading workbook …");
const PY = `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
out = {"services": [], "patients": [], "bills": []}
ws = wb['bills']
for row in ws.iter_rows(min_row=3, values_only=True):
    if not row or row[2] is None: continue
    _, idx, name, price, dept, sub, typ, st = (list(row)+[None]*8)[:8]
    if not str(name).strip(): continue
    out["services"].append({"name": str(name).strip(), "price": price,
                            "dept": str(dept or ""), "status": str(st or "")})
for sheet in ['2026','2025','2024','2023','2022']:
    for row in wb[sheet].iter_rows(min_row=2, values_only=True):
        if not row or row[2] is None: continue
        sno, mr, pname, gender, mobile, doctor, dept, date, fee = (list(row)+[None]*9)[:9]
        if not str(pname).strip(): continue
        out["patients"].append({"mr": str(mr or "").strip(), "name": str(pname).strip(),
                                "gender": str(gender or ""), "mobile": str(mobile or ""),
                                "date": str(date)[:10] if date else ""})
for sheet in ['2026 REFFARAL','2025 REFFARAL','2024 REFFARAL','2023 REFFARAL','2022 REFFARAL']:
    for row in wb[sheet].iter_rows(min_row=2, values_only=True):
        if not row or row[1] is None: continue
        idx, billno, date, mr, pname, doctor, blank, tests, total = (list(row)+[None]*9)[:9]
        if not str(billno).strip(): continue
        out["bills"].append({"no": str(billno).strip(), "date": str(date)[:10] if date else "",
                             "mr": str(mr or "").strip(), "name": str(pname or "").strip(),
                             "doctor": str(doctor or "").strip(), "tests": str(tests or ""),
                             "total": total})
json.dump(out, open(sys.argv[2], "w"))
`;
const tmp = "/tmp/helia-legacy.json";
execFileSync("python3", ["-c", PY, FILE, tmp], { maxBuffer: 1 << 28 });
const data = JSON.parse(fs.readFileSync(tmp, "utf8"));
fs.unlinkSync(tmp);
log(`  services=${data.services.length} patientRows=${data.patients.length} billRows=${data.bills.length}\n`);

// =============================================================== 1. SERVICES
log("── phase 1: services ──");
const liveServices = await prisma.service.findMany({ select: { id: true, name: true, price: true } });
const svcByName = new Map(liveServices.map((s) => [nn(s.name), s]));

const newServices = [];
const priceConflicts = [];
const seenSvc = new Set();
for (const s of data.services) {
  const key = nn(s.name);
  if (!key || seenSvc.has(key)) continue;
  seenSvc.add(key);
  const live = svcByName.get(key);
  const paise = rupeesToPaise(s.price);
  if (live) {
    if (live.price !== paise) priceConflicts.push({ name: s.name, live: live.price, file: paise });
  } else {
    newServices.push({
      name: s.name,
      department: deptOf(s.dept),
      price: paise,
      active: String(s.status).trim().toLowerCase() === "active",
    });
  }
}
log(`  already live : ${seenSvc.size - newServices.length}`);
log(`  to create    : ${newServices.length}`);
log(`  price differs: ${priceConflicts.length} (left as-is; live price wins)`);
if (priceConflicts.length) {
  log("    e.g. " + priceConflicts.slice(0, 3).map((c) => `${c.name} live ₹${c.live / 100} vs file ₹${c.file / 100}`).join(" | "));
}
if (APPLY && newServices.length) {
  for (let i = 0; i < newServices.length; i += 500) {
    await prisma.service.createMany({ data: newServices.slice(i, i + 500), skipDuplicates: true });
  }
  log(`  ✓ created ${newServices.length} services`);
}

// =============================================================== 2. PATIENTS
log("\n── phase 2: patients ──");
// One record per MR number; the latest visit supplies the details.
const byMr = new Map();
for (const r of data.patients) {
  if (!r.mr) continue;
  const prev = byMr.get(r.mr);
  if (!prev || r.date > prev.date) byMr.set(r.mr, r);
}
log(`  unique MR numbers: ${byMr.size}`);

const livePatients = await prisma.patient.findMany({
  select: { id: true, uhid: true, name: true, mobile: true, legacyMrNo: true },
});
const liveByMr = new Map(livePatients.filter((p) => p.legacyMrNo).map((p) => [p.legacyMrNo, p]));
const liveByNameMobile = new Map(livePatients.map((p) => [`${nn(p.name)}|${p.mobile}`, p]));

// Continue the UHID serial from the highest number already issued.
const maxRow = await prisma.$queryRaw`
  SELECT MAX(CAST(substring(uhid FROM '[0-9]+$') AS INTEGER)) AS max FROM "Patient" WHERE uhid LIKE 'HELIA-%'`;
let serial = Number(maxRow[0]?.max ?? 1000) + 1;
log(`  next UHID serial : ${serial}`);

const toCreate = [];
const toTag = []; // already in the new system — just record their old MR number
let alreadyImported = 0;
for (const [mr, r] of byMr) {
  if (liveByMr.has(mr)) { alreadyImported++; continue; }
  const mobile = normMobile(r.mobile);
  const existing = liveByNameMobile.get(`${nn(r.name)}|${mobile}`);
  if (existing && mobile) {
    if (!existing.legacyMrNo) toTag.push({ id: existing.id, mr });
    continue;
  }
  const day = /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : "2022-01-01";
  toCreate.push({
    uhid: `HELIA-${stamp(day)}-${serial++}`,
    name: r.name,
    age: null,
    gender: normGender(r.gender),
    mobile,
    legacyMrNo: mr,
    createdAt: new Date(`${day}T12:00:00+05:30`),
  });
}
log(`  already imported : ${alreadyImported}`);
log(`  matched a live patient (tag MR only): ${toTag.length}`);
log(`  to create        : ${toCreate.length}`);
log(`  without a usable mobile: ${toCreate.filter((p) => !p.mobile).length}`);
if (toCreate.length) log(`    first: ${toCreate[0].uhid} ${toCreate[0].name} | last: ${toCreate[toCreate.length - 1].uhid}`);

if (APPLY) {
  for (const t of toTag) {
    await prisma.patient.update({ where: { id: t.id }, data: { legacyMrNo: t.mr } });
  }
  for (let i = 0; i < toCreate.length; i += 500) {
    await prisma.patient.createMany({ data: toCreate.slice(i, i + 500), skipDuplicates: true });
    if (i % 5000 === 0) log(`    … ${i}/${toCreate.length}`);
  }
  log(`  ✓ created ${toCreate.length} patients, tagged ${toTag.length}`);
}

// =============================================================== 3. BILLS
log("\n── phase 3: bills ──");
const patientByMr = new Map(
  (APPLY
    ? await prisma.patient.findMany({ where: { legacyMrNo: { not: null } }, select: { id: true, legacyMrNo: true } })
    : []
  ).map((p) => [p.legacyMrNo, p.id]),
);
const existingBillNos = new Set(
  (await prisma.bill.findMany({ where: { legacyBillNo: { not: null } }, select: { legacyBillNo: true } }))
    .map((b) => b.legacyBillNo),
);
// Services by name, for linking each listed test to the catalogue.
const svcAll = await prisma.service.findMany({ select: { id: true, name: true, price: true, department: true } });
const svcLookup = new Map(svcAll.map((s) => [nn(s.name), s]));

let billsPlanned = 0, noPatient = 0, skipped = 0, itemsPlanned = 0, exactPriced = 0, stubsCreated = 0;
let revenue = 0;
const billRows = [];
const seenBillNo = new Set();
for (const b of data.bills) {
  if (!b.no || seenBillNo.has(b.no)) continue;
  seenBillNo.add(b.no);
  if (existingBillNos.has(b.no)) { skipped++; continue; }
  // The bill sheets run a few weeks past the patient sheets, so a handful of
  // bills name an MR number that was never exported as a patient. Create a stub
  // from the bill's own patient name rather than dropping the revenue; gender
  // and mobile are genuinely unknown and left blank for reception to fill.
  let pid = patientByMr.get(b.mr);
  if (APPLY && !pid && b.mr && b.name) {
    const day0 = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : "2022-01-01";
    const stub = await prisma.patient.create({
      data: {
        uhid: `HELIA-${stamp(day0)}-${serial++}`,
        name: b.name,
        age: null,
        gender: "Other",
        mobile: "",
        legacyMrNo: b.mr,
        createdAt: new Date(`${day0}T12:00:00+05:30`),
      },
      select: { id: true },
    });
    pid = stub.id;
    patientByMr.set(b.mr, pid);
    stubsCreated++;
  }
  if (APPLY && !pid) { noPatient++; continue; }
  if (!APPLY && !b.mr) { noPatient++; continue; }

  const total = rupeesToPaise(b.total);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : "2022-01-01";
  const names = String(b.tests).split(",").map((t) => t.trim()).filter(Boolean);

  // Per-item amounts: use catalogue prices when every test is known AND they
  // reconcile to the recorded total; otherwise apportion the total evenly,
  // because the export records only a bill total, never line prices.
  let items;
  const hits = names.map((n) => svcLookup.get(nn(n)));
  const sum = hits.every(Boolean) ? hits.reduce((a, s) => a + s.price, 0) : -1;
  if (names.length && sum === total) {
    exactPriced++;
    items = names.map((n, i) => ({ description: n, serviceId: hits[i].id, quantity: 1, unitPrice: hits[i].price, amount: hits[i].price }));
  } else if (names.length) {
    const each = Math.floor(total / names.length);
    const rem = total - each * names.length;
    items = names.map((n, i) => {
      const amt = each + (i === 0 ? rem : 0);
      return { description: n, serviceId: hits[i]?.id ?? null, quantity: 1, unitPrice: amt, amount: amt };
    });
  } else {
    items = [{ description: "Services", serviceId: null, quantity: 1, unitPrice: total, amount: total }];
  }

  billsPlanned++; itemsPlanned += items.length; revenue += total;
  billRows.push({
    legacyBillNo: b.no,
    invoiceNo: `HELIA-INV-${stamp(day)}-L${b.no.replace(/\D/g, "")}`,
    patientId: pid,
    referringDoctor: b.doctor,
    subtotal: total,
    discount: 0,
    total,
    // The export carries no payment field. These are closed years, so they are
    // recorded as settled; otherwise four years of business would surface as
    // outstanding dues. Payment mode is genuinely unknown and left null.
    amountPaid: total,
    paymentMethod: null,
    status: "PAID",
    createdMonthYear: day.slice(0, 7),
    createdAt: new Date(`${day}T12:00:00+05:30`),
    items,
  });
}
log(`  to create   : ${billsPlanned} bills, ${itemsPlanned} line items`);
log(`  priced from catalogue exactly : ${exactPriced} (rest apportioned from the bill total)`);
log(`  already imported : ${skipped}`);
log(`  ${APPLY ? "no matching patient (skipped)" : "rows without an MR number"} : ${noPatient}`);
log(`  revenue represented : ₹${(revenue / 100).toLocaleString("en-IN")}`);

if (APPLY) {
  // Ids are generated here so bills and their items can both go in by
  // createMany; one nested create per bill would be ~19k round trips.
  const bills = [];
  const items = [];
  for (const b of billRows) {
    const { items: its, ...bill } = b;
    const id = randomUUID();
    bills.push({ id, ...bill });
    for (const it of its) items.push({ billId: id, ...it });
  }
  for (let i = 0; i < bills.length; i += 500) {
    await prisma.bill.createMany({ data: bills.slice(i, i + 500), skipDuplicates: true });
    if (i % 5000 === 0) log(`    bills … ${i}/${bills.length}`);
  }
  for (let i = 0; i < items.length; i += 1000) {
    await prisma.billItem.createMany({ data: items.slice(i, i + 1000), skipDuplicates: true });
    if (i % 10000 === 0) log(`    items … ${i}/${items.length}`);
  }
  log(`  ✓ created ${bills.length} bills and ${items.length} line items`);
}

log(`\n${APPLY ? "IMPORT COMPLETE" : "DRY RUN — nothing was written. Re-run with --apply to perform the import."}`);
await prisma.$disconnect();
