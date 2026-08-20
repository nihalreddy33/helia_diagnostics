// One-time (re-runnable) import of the USG / radiology report templates supplied
// as Word documents. Upserts by title, so re-running updates existing rows.
// Run from the project root:  node scripts/import-usg-templates.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RADIOLOGIST = "Dr. Deepthi Reddy Solipuram";

const OBSTETRIC_DECLARATION =
  "Note : All anomalies cannot be ruled out by ultrasound, since assessment of fetal anomalies depends on fetal position, liquor volume and period of gestation at the time of scan. Ultrasound alone cannot exclude all genetic syndromes or chromosomal abnormalities. Hence the report has limitations.\n\n" +
  `Declaration of doctor conducting ultrasonography : I, ${RADIOLOGIST}, declare that while conducting ultrasonography on Mrs. ______ I have neither detected nor disclosed the sex of her fetus to anybody in any manner.`;

const templates = [
  {
    title: "USG Abdomen & Pelvis – Female",
    modality: "USG",
    defaultFindings: `LIVER: Normal in size (___ cm), shape and echopattern. No intrahepatic biliary dilatation. No obvious focal lesions. CBD and Portal vein appear normal.
GALLBLADDER: Normal in contours. Wall thickness appears normal. No calculi.
SPLEEN: Normal in size (___ cm), shape and echopattern. No obvious focal lesions noted.
PANCREAS: Normal in size and echopattern. No ductal dilatation. No calcifications.
RIGHT KIDNEY: ___ x ___ cm. Normal in size, shape and echopattern. Pelvicalyceal system appears normal. No obvious focal lesions / calculi noted. Corticomedullary differentiation is well maintained.
LEFT KIDNEY: ___ x ___ cm. Normal in size, shape and echopattern. Pelvicalyceal system appears normal. No obvious focal lesions / calculi noted. Corticomedullary differentiation is well maintained.
URINARY BLADDER: Normal in contours. No calculi. Wall thickness appears normal.
UTERUS: ___ x ___ x ___ cm. Anteverted. Normal in size, shape and echotexture. No obvious focal lesions noted.
ENDOMETRIAL THICKNESS: ___ mm.
BOTH OVARIES: Normal in size and echotexture. No focal lesions. No pathological cyst noted.
RIGHT OVARY: ___ x ___ cm.
LEFT OVARY: ___ x ___ cm.
No ascites noted.
Retroperitoneum obscured by excessive bowel gas.
No obvious dilated bowel loops. Gas distended bowel loops.`,
    defaultImpression: `* No significant abnormality detected.
Suggested clinical correlation and follow-up.`,
    defaultFooter: "",
  },
  {
    title: "USG Abdomen – Female Child",
    modality: "USG",
    defaultFindings: `LIVER: Normal in size (___ cm), shape and echopattern. No intrahepatic biliary dilatation. No obvious focal lesions. Portal vein appears normal.
GALL BLADDER: Normal in contours. Wall thickness appears normal. No calculi.
SPLEEN: Normal in size (___ cm), shape and echopattern. No obvious focal lesions noted.
PANCREAS: Head and proximal body appear normal in size and echopattern. No ductal dilatation. No calcifications. Rest of the pancreas is obscured by bowel gas.
RIGHT KIDNEY: ___ mm. Normal in size, shape and echopattern. Pelvicalyceal system appears normal. No obvious focal lesions / calculi noted. Corticomedullary differentiation is well maintained.
LEFT KIDNEY: ___ mm. Normal in size, shape and echopattern. Pelvicalyceal system appears normal. No obvious focal lesions / calculi noted. Corticomedullary differentiation is well maintained.
URINARY BLADDER: Normal in contours. No calculi. Wall thickness appears normal.
Pelvic organs: Prepubertal status.
No ascites noted.
Retroperitoneum obscured by excessive bowel gas.
No obvious dilated bowel loops. Gas distended bowel loops.
Appendix could not be visualized to the extent seen.`,
    defaultImpression: `* No significant sonographic abnormality detected.
Suggested clinical correlation and follow-up.`,
    defaultFooter: "",
  },
  {
    title: "USG Follicular Study",
    modality: "USG",
    defaultFindings: `UTERUS: ___ cm. Normal in size, shape and echotexture. No evidence of focal lesions noted.
BOTH OVARIES: Normal in size, shape and echotexture. No e/o cyst noted.
RIGHT OVARY: ___ cm, Vol: ___ cc.
LEFT OVARY: ___ cm, Vol: ___ cc.
No adnexal mass lesions.

Follicular tracking:
Date | Day of cycle | ET | Right ovary | Left ovary | POD
___`,
    defaultImpression: `* Ongoing follicular study — findings tabulated above.
Suggested clinical correlation and follow-up.`,
    defaultFooter: "",
  },
  {
    title: "USG Early Pregnancy",
    modality: "USG",
    defaultFindings: `Gravid uterus with evidence of single live intrauterine gestation.
Yolk sac and fetal pole are visualized.
Cardiac activity present.
No perigestational collection.
CRL : ___ cm corresponding to ___ weeks ___ days.
MSD : ___ cm corresponding to ___ weeks ___ days.
FHR : ___ bpm.
LMP : ___
EGA (USG) : ___ weeks ___ days ; EDD (USG) : ___
EGA (LMP) : ___ weeks ___ days ; EDD (LMP) : ___
Both adnexa: Normal.
Cervical length: ___ cm. Internal Os closed; No funnelling.`,
    defaultImpression: `* Single live intrauterine gestation of ___ weeks ___ days.
Suggested NT scan at 11 - 13 weeks.
For clinical correlation and follow-up.`,
    defaultFooter:
      "Ultrasound alone cannot exclude all genetic syndromes or chromosomal abnormalities. This report is not valid for medico-legal process.",
  },
  {
    title: "USG Early TIFFA (Anomaly Scan)",
    modality: "USG",
    defaultFindings: `A single live fetus in variable cephalic presentation.
The placenta is anterior, upper and mid segment, Grade-___ maturity.
The liquor volume is adequate. (AFI: ___).
Internal Os: Closed. No funneling.
Cervical length: ___ mm.
Foetal cardiac activity is good.
Fetal calvarium, spine, abdomen and limbs are grossly normal.
Stomach bubble visualized.

BIOMETRY:
BPD: ___ cm corresponding to ___ weeks ___ days.
HC: ___ cm corresponding to ___ weeks ___ days.
AC: ___ cm corresponding to ___ weeks ___ days.
FL: ___ cm corresponding to ___ weeks ___ days.
FHR: ___ bpm.
EFBW: ___ gms (+/- ___ gms).
EGA (USG): ___ weeks ___ days; EDD (USG): ___
EGA (LMP): ___ weeks ___ days; EDD (LMP): ___`,
    defaultImpression: `* Single live intrauterine gestation of ___ weeks ___ days gestational age.
* Normal early TIFFA scan.
Suggested review TIFFA scan after 3-4 weeks.`,
    defaultFooter: OBSTETRIC_DECLARATION,
  },
  {
    title: "USG Biophysical Profile (BPP)",
    modality: "USG",
    defaultFindings: `Single live intrauterine gestation in cephalic presentation at the time of scan.
Foetal body movements are good.
Foetal cardiac activity good, recorded on M-mode.
Placenta : Anterior wall, Grade : III maturity.
Liquor : Adequate (AFI : ___ cm).
Internal Os : Closed.

BIOMETRY
BPD : ___ cm corresponding to ___ weeks ___ days.
HC : ___ cm corresponding to ___ weeks ___ days.
AC : ___ cm corresponding to ___ weeks ___ days.
FL : ___ cm corresponding to ___ weeks ___ days.
FHR : ___ beats / min.
EFBW : ___ gms.
EGA (USG) : ___ weeks ___ days; EDD (USG) : ___
EGA (LMP) : ___ weeks ___ days; EDD (LMP) : ___

Biophysical Profile Score :
1. Fetal posture and tone (FT) = 2
2. Fetal movement (FM) = 2
3. Fetal breathing movement = 2
4. Qualitative amniotic fluid = 2
Total score = 8/8`,
    defaultImpression: `* Single live intrauterine gestation of ___ weeks ___ days gestational age.
* Biophysical profile scoring 8/8.`,
    defaultFooter: OBSTETRIC_DECLARATION,
  },
  {
    title: "USG Obstetric Doppler",
    modality: "USG",
    defaultFindings: `Detailed anatomical survey not done in the present scan due to fetal position and advanced gestational age.
A single live fetus in cephalic presentation at the time of scan.
The placenta is anterior, mid segment, Grade-II maturity.
The liquor volume is adequate. (AFI : ___ cc).
Cervical length : ___ cms.

BIOMETRY
BPD : ___ cm corresponding to ___ weeks ___ days.
HC : ___ cm corresponding to ___ weeks ___ days.
AC : ___ cm corresponding to ___ weeks ___ days.
FL : ___ cm corresponding to ___ weeks ___ days.
FHR : ___ bpm.
EFBW : ___ gms (+/- ___ gms).
EGA (USG): ___ weeks ___ days; EDD (USG): ___
EGA (LMP): ___ weeks ___ days; EDD (LMP): ___

DOPPLER OF GRAVID UTERUS:
01. FETAL CEREBRAL BLOOD FLOW: Normal fetal cerebral flow noted with normal resistance.
02. FETOPLACENTAL BLOOD FLOW: Normal resistance and impedance. No flow reversal noted.
03. UTEROPLACENTAL BLOOD FLOW: No compromise with normal flow resistance. No early diastolic notch.

Spectral doppler indices:
                          RI      PI      S/D Ratio
MCA                       ___     ___     ___
Umbilical artery          ___     ___     ___
Right uterine artery      ___     ___     ___
Left uterine artery       ___     ___     ___`,
    defaultImpression: `* Single live intrauterine foetus in cephalic presentation at the time of scan with ___ weeks ___ days gestational age.
* No uteroplacental or fetoplacental insufficiency.
Suggested clinical correlation.`,
    defaultFooter: OBSTETRIC_DECLARATION,
  },
  {
    title: "USG Both Lower Limbs Venous Doppler",
    modality: "USG",
    defaultFindings: `Colour Doppler duplex sonography of both lower limbs venous system was performed.
Bilateral common, superficial femoral, popliteal, posterior & anterior tibial veins are normal in caliber and course with normal compressibility.
Bilateral great and small saphenous veins show normal compressibility and venous flow. They show normal augmentation of signal on distal compression.
No evidence of thrombus noted.
SFJ and SPJ show no incompetence.
No evidence of deep venous reflux.
No evidence of significant varicosities / incompetent perforators.`,
    defaultImpression: `* No evidence of deep / superficial venous thrombosis.
* No junctional incompetence.
Suggested clinical correlation / follow-up.`,
    defaultFooter: "",
  },
  {
    title: "USG Upper Limb Venous Doppler",
    modality: "USG",
    defaultFindings: `Superior vena cava is not commentable due to poor window.
Bilateral brachiocephalic veins are seen through a poor window and are patent to the visualised extent.
Bilateral subclavian, axillary, brachial, radial and ulnar veins show normal colour flow, compressibility, augmentation and respiratory variation.
No significantly stenotic or dilated segments. No deep vein thrombosis.
Calibre of Cephalic Vein is ___ mm at distal forearm, ___ mm at proximal forearm and ___ mm at cubital fossa and distal arm. Normal in calibre with no thrombosis.
Calibre of Basilic Vein is ___ mm at distal forearm, ___ mm at proximal forearm and ___ mm at cubital fossa and distal arm. Normal in calibre with no thrombosis.`,
    defaultImpression: `* No DVT.
Suggested clinical correlation and further evaluation.`,
    defaultFooter: "",
  },
  {
    title: "Carotid Doppler",
    modality: "USG",
    defaultFindings: `TECHNIQUE: Colour Doppler duplex sonography of bilateral carotid and vertebral arteries was performed.
Bilateral common, external and internal carotid arteries are normal in caliber, course and echogenicity. No plaques / significant luminal compromise noted.
IMT (intima-medial thickness) in bilateral mid CCA measuring (Right : ___ mm, Left : ___ mm).
Colour mapping revealed normal flow on both sides. No flow turbulence noted.
Doppler tracing revealed normal spectral wave pattern in bilateral common, external and internal carotid arteries. Peak systolic velocities are within normal limits.
S/D ratios and indices are within normal limits.
Both vertebral arteries appear normal in caliber with normal flow and spectral wave pattern to the extent seen. No spectral widening noted.`,
    defaultImpression: `* Normal carotid doppler study.
* No e/o hemodynamically significant stenosis / plaques.
Suggested clinical correlation.`,
    defaultFooter: "",
  },
  {
    title: "Mammography – Breast",
    modality: "XRAY",
    defaultFindings: `Routine two-view mammography done with craniocaudal and mediolateral oblique views.
Skin thickness and vascularity normal.
Both breasts show normal pattern of fibroglandular and fatty tissues.
No obvious mass lesion.
No asymmetric opacity.
No micro / macro calcification.
Both axillae appear normal.

Correlative ultrasound screening:
No focal solid or cystic lesion noted in either breast.
No abnormal ductal dilatation. No suspicious vascularity.`,
    defaultImpression: `* Normal bilateral mammography and ultrasound screening.
* ACR BIRADS Category - 1.
Return to routine annual screening.`,
    defaultFooter: `ACR BIRADS CATEGORIES:
0 - Needs additional mammographic or other imaging evaluation.
1 - Negative: Return to annual screening.
2 - Benign finding: Return to annual screening.
3 - Probably benign: Six months follow-up.
4 - Probably malignant (20 - 30%): Biopsy.
5 - Malignant (99% certainty): Biopsy / Excision.`,
  },
  {
    title: "X-Ray Nasopharynx (Adenoids)",
    modality: "XRAY",
    defaultFindings: `Evidence of soft tissue dense opacity noted in the postero-superior aspect of the nasopharynx - S/O ADENOIDS.
Rest of the naso & oropharynx appear normal.
Trachea appears normal.
Alignment of the cervical spine is normal.
Pretracheal and prevertebral soft tissues appear normal.`,
    defaultImpression: `* Soft tissue dense opacity in the postero-superior aspect of the nasopharynx causing mild luminal compromise - S/O MILD (GRADE I) ADENOID HYPERTROPHY.`,
    defaultFooter: "",
  },
];

let created = 0;
let updated = 0;
for (const t of templates) {
  const existing = await prisma.template.findUnique({ where: { title: t.title }, select: { id: true } });
  await prisma.template.upsert({
    where: { title: t.title },
    create: t,
    update: {
      modality: t.modality,
      defaultFindings: t.defaultFindings,
      defaultImpression: t.defaultImpression,
      defaultFooter: t.defaultFooter,
    },
  });
  if (existing) updated++;
  else created++;
  console.log(`${existing ? "updated" : "created"}: ${t.title} [${t.modality}]`);
}

console.log(`\nDone. ${created} created, ${updated} updated, ${templates.length} total.`);
await prisma.$disconnect();
