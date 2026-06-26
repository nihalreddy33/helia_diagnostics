import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo password for every seeded account (mock-auth login is by role switcher;
// this exists so the password column is realistically populated).
const DEMO_PASSWORD = "helia123";

async function main() {
  console.log("Seeding Helia Diagnostics…");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Default admin account (username "admin" / password "admin123") -------
  // A simple, memorable default for first sign-in. Change it after logging in.
  await prisma.user.upsert({
    where: { email: "admin" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin",
      password: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
    },
  });

  // --- Users (one per role) ------------------------------------------------
  const users: { name: string; email: string; role: "ADMIN" | "RECEPTIONIST" | "RADIOLOGIST" }[] = [
    { name: "Dr. Anita Rao", email: "admin@helia.example", role: "ADMIN" },
    { name: "Priya Menon", email: "reception@helia.example", role: "RECEPTIONIST" },
    { name: "Dr. Vikram Shah", email: "radiologist@helia.example", role: "RADIOLOGIST" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { ...u, password: passwordHash },
    });
  }

  // --- Templates -----------------------------------------------------------
  const templates = [
    {
      title: "Chest X-Ray (PA View)",
      modality: "XRAY" as const,
      defaultFindings:
        "The lung fields are clear with no focal consolidation, effusion, or pneumothorax. The cardiomediastinal silhouette is within normal limits. The visualized bony thorax is intact.",
      defaultImpression: "No acute cardiopulmonary abnormality.",
    },
    {
      title: "CT Brain (Plain)",
      modality: "CT" as const,
      defaultFindings:
        "No acute intracranial hemorrhage, mass effect, or midline shift. Gray-white matter differentiation is preserved. The ventricular system is normal in size and configuration.",
      defaultImpression: "Unremarkable plain CT study of the brain.",
    },
    {
      title: "MRI Lumbar Spine",
      modality: "MRI" as const,
      defaultFindings:
        "Vertebral body heights and marrow signal are preserved. No significant disc herniation or canal stenosis. The conus medullaris terminates at a normal level.",
      defaultImpression: "No significant degenerative or compressive abnormality.",
    },
    {
      title: "USG Abdomen — Male",
      modality: "USG" as const,
      defaultFindings: `LIVER: Normal in size ( cm), shape and echopattern. No intrahepatic biliary dilatation. No focal lesions. CBD and portal vein appear normal.
GALLBLADDER: Normal in contours. Wall thickness appears normal. No calculi.
SPLEEN: Normal in size ( cm), shape and echopattern. No focal lesions noted.
PANCREAS: Normal in size, shape and echopattern. No ductal dilatation. No calcifications / calculi. Peripancreatic fat planes appear normal.
RIGHT KIDNEY:  mm. Normal in size, shape and echopattern. Pelvicalyceal system appears normal. No focal lesions / calculi noted. Corticomedullary differentiation is well maintained.
LEFT KIDNEY:  mm. Normal in size, shape and echopattern. Pelvicalyceal system appears normal. No focal lesions / calculi noted. Corticomedullary differentiation is well maintained.
URINARY BLADDER: Normally distended. Wall thickness appears normal. No calculi.
PROSTATE:  cc. Normal in size and echotexture.
No evidence of free fluid in the peritoneal cavity.
No pre/para-aortic or retrocaval lymphadenopathy.`,
      defaultImpression: `* No significant abnormality detected.
Suggested clinical correlation and follow-up.`,
    },
    {
      title: "USG Abdomen & Pelvis — Female",
      modality: "USG" as const,
      defaultFindings: `LIVER: Normal in size ( cm), shape and echopattern. No intrahepatic biliary dilatation. No focal lesions. CBD and portal vein appear normal.
GALLBLADDER: Normal in contours. Wall thickness appears normal. No calculi.
SPLEEN: Normal in size ( cm), shape and echopattern. No focal lesions noted.
PANCREAS: Normal in size and echopattern. No ductal dilatation. No calcifications.
RIGHT KIDNEY:  mm. Normal in size, shape and echopattern. Pelvicalyceal system appears normal. No focal lesions / calculi noted. Corticomedullary differentiation is well maintained.
LEFT KIDNEY:  mm. Normal in size, shape and echopattern. Pelvicalyceal system appears normal. No focal lesions / calculi noted. Corticomedullary differentiation is well maintained.
URINARY BLADDER: Normal in contours. Wall thickness appears normal. No calculi.
UTERUS:  mm. Anteverted. Normal in size, shape and echotexture. No focal lesions noted.
ENDOMETRIAL THICKNESS:  mm.
BOTH OVARIES: Normal in size and echotexture. No focal lesions. No pathological cyst noted.
RIGHT OVARY:  mm.
LEFT OVARY:  mm.
No ascites noted.
Retroperitoneum obscured by excessive bowel gas.
No dilated bowel loops. Gas-distended bowel loops.`,
      defaultImpression: `* No significant abnormality detected.
Suggested clinical correlation and follow-up.`,
    },
    {
      title: "Obstetric / Growth Scan",
      modality: "USG" as const,
      defaultFindings: `Detailed anatomical survey not done in the present scan due to fetal position and advanced gestational age.

A single live fetus in cephalic presentation.
The placenta is posterior mid-segment, Grade-II maturity.
LIQUOR VOLUME: adequate (AFI:  cc).
CERVICAL LENGTH:  cms. Internal OS closed; no funnelling.

BIOMETRY:
BPD:  cm corresponding to  weeks  days.
HC:  cm corresponding to  weeks  days.
AC:  cm corresponding to  weeks  days.
FL:  cm corresponding to  weeks  days.
FHR:  bpm.
EFBW:  gms (+/-  gms).

LMP:
EGA (USG):  weeks and  days; EDD (USG):
EGA (LMP):  weeks and  days; EDD (LMP):`,
      defaultImpression: `* Single live intrauterine foetus in cephalic presentation of  weeks  days.`,
      defaultFooter: `Note: All anomalies cannot be ruled out by ultrasound, since assessment of fetal anomalies depends on fetal position, liquor volume and period of gestation at the time of scan. Ultrasound alone cannot exclude all genetic syndromes or chromosomal abnormalities; hence this report has limitations.

Declaration of the doctor conducting ultrasonography: I, {{radiologist}}, declare that while conducting ultrasonography on the patient I have neither detected nor disclosed the sex of her fetus to anybody in any manner. This report is not valid for medico-legal process.`,
    },
  ];
  for (const t of templates) {
    await prisma.template.upsert({
      where: { title: t.title },
      update: {
        modality: t.modality,
        defaultFindings: t.defaultFindings,
        defaultImpression: t.defaultImpression,
        defaultFooter: "defaultFooter" in t ? t.defaultFooter : "",
      },
      create: t,
    });
  }

  // --- Billable services (prices in paise) ---------------------------------
  const services = [
    { name: "USG Abdomen — Male", modality: "USG" as const, price: 120000 },
    { name: "USG Abdomen & Pelvis — Female", modality: "USG" as const, price: 130000 },
    { name: "Obstetric / Growth Scan", modality: "USG" as const, price: 150000 },
    { name: "Chest X-Ray (PA View)", modality: "XRAY" as const, price: 40000 },
    { name: "CT Brain (Plain)", modality: "CT" as const, price: 300000 },
    { name: "MRI Lumbar Spine", modality: "MRI" as const, price: 600000 },
    { name: "Consultation", modality: null, price: 30000 },
    { name: "Registration Fee", modality: null, price: 10000 },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: { modality: s.modality, price: s.price },
      create: s,
    });
  }

  // --- Patients ------------------------------------------------------------
  const p1 = await prisma.patient.upsert({
    where: { uhid: "HELIA-1001" },
    update: {},
    create: { uhid: "HELIA-1001", name: "Rahul Verma", age: 45, gender: "Male" },
  });
  await prisma.patient.upsert({
    where: { uhid: "HELIA-1002" },
    update: {},
    create: { uhid: "HELIA-1002", name: "Sara Iqbal", age: 33, gender: "Female" },
  });

  // --- One approved report for the print hub / archive ---------------------
  const radiologist = await prisma.user.findFirst({ where: { role: "RADIOLOGIST" } });
  const xray = await prisma.template.findFirst({ where: { modality: "XRAY" } });
  const existing = await prisma.report.findFirst({ where: { patientId: p1.id } });
  if (!existing && radiologist && xray) {
    await prisma.report.create({
      data: {
        patientId: p1.id,
        templateId: xray.id,
        radiologistId: radiologist.id,
        status: "APPROVED",
        findings: xray.defaultFindings,
        impression: xray.defaultImpression,
        createdMonthYear: "2026-06",
        approvedAt: new Date("2026-06-01T10:00:00Z"),
      },
    });
  }

  console.log(`Seed complete ✔  (demo password for all accounts: "${DEMO_PASSWORD}")`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
