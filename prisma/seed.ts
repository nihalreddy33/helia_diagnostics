import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Helia Diagnostics…");

  // --- Users (one per role) ------------------------------------------------
  await prisma.user.upsert({
    where: { email: "admin@helia.example" },
    update: {},
    create: { name: "Dr. Anita Rao", email: "admin@helia.example", role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "radiologist@helia.example" },
    update: {},
    create: {
      name: "Dr. Vikram Shah",
      email: "radiologist@helia.example",
      role: "RADIOLOGIST",
    },
  });
  await prisma.user.upsert({
    where: { email: "reception@helia.example" },
    update: {},
    create: {
      name: "Priya Menon",
      email: "reception@helia.example",
      role: "RECEPTION",
    },
  });

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
    const existing = await prisma.template.findFirst({ where: { title: t.title } });
    if (!existing) await prisma.template.create({ data: t });
  }

  // --- A couple of patients so the queues aren't empty ---------------------
  const p1 = await prisma.patient.upsert({
    where: { uhid: "HD-100001" },
    update: {},
    create: {
      uhid: "HD-100001",
      name: "Rahul Verma",
      age: 45,
      gender: "Male",
      targetModality: "XRAY",
    },
  });
  await prisma.patient.upsert({
    where: { uhid: "HD-100002" },
    update: {},
    create: {
      uhid: "HD-100002",
      name: "Sara Iqbal",
      age: 33,
      gender: "Female",
      targetModality: "USG",
    },
  });

  // --- One approved report for the archive view ----------------------------
  const radiologist = await prisma.user.findFirst({ where: { role: "RADIOLOGIST" } });
  const xrayTemplate = await prisma.template.findFirst({ where: { modality: "XRAY" } });
  const existingReport = await prisma.report.findFirst({
    where: { patientId: p1.id },
  });
  if (!existingReport && radiologist && xrayTemplate) {
    await prisma.report.create({
      data: {
        patientId: p1.id,
        templateId: xrayTemplate.id,
        radiologistId: radiologist.id,
        status: "APPROVED",
        findings: xrayTemplate.defaultFindings,
        impression: xrayTemplate.defaultImpression,
        createdMonthYear: "2026-06",
        approvedAt: new Date("2026-06-01T10:00:00Z"),
      },
    });
  }

  console.log("Seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
