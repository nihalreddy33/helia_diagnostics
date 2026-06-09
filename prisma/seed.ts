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
      title: "USG Abdomen & Pelvis",
      modality: "USG" as const,
      defaultFindings:
        "Liver is normal in size and echotexture with no focal lesion. Gallbladder is unremarkable without calculi. Both kidneys show normal corticomedullary differentiation. No free fluid.",
      defaultImpression: "Normal ultrasound study of the abdomen and pelvis.",
    },
  ];
  for (const t of templates) {
    await prisma.template.upsert({
      where: { title: t.title },
      update: {},
      create: t,
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
