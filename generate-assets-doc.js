const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak,
} = require('docx');

// Design tokens
const PRIMARY = '00CFFF'; // cyan
const VIOLET = '7C3AED';
const DARK_BG = 'F5F7FA'; // section header bg (light variant for contrast in white doc)
const TABLE_HEADER_BG = '7C3AED';
const TABLE_ROW_ALT = 'F8F9FB';
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' };
const BORDERS_ALL = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function paragraph(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { before: opts.before || 0, after: opts.after || 100 },
    alignment: opts.alignment,
  });
}

function heading(text, level) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, font: 'Arial', bold: true })],
    spacing: { before: 240, after: 160 },
  });
}

function sectionTitle(num, title) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 28, color: '7C3AED', font: 'Arial' }),
      new TextRun({ text: title, bold: true, size: 28, color: '111827', font: 'Arial' }),
    ],
    spacing: { before: 360, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '7C3AED', space: 4 } },
  });
}

function description(text) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, size: 22, color: '4B5563', font: 'Arial' })],
    spacing: { before: 80, after: 200 },
  });
}

function tableCell(text, opts = {}) {
  return new TableCell({
    borders: BORDERS_ALL,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({
          text,
          bold: opts.bold,
          size: opts.size || 20,
          color: opts.color || '111827',
          font: 'Arial',
        })],
        alignment: opts.align,
      }),
    ],
  });
}

function makeTable(rows, columnWidths) {
  const total = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths,
    rows: rows.map((r, i) => {
      const isHeader = i === 0;
      return new TableRow({
        children: r.map((cell, ci) => tableCell(cell, {
          width: columnWidths[ci],
          bold: isHeader,
          color: isHeader ? 'FFFFFF' : '111827',
          bg: isHeader ? TABLE_HEADER_BG : (i % 2 === 0 ? TABLE_ROW_ALT : undefined),
          size: 20,
        })),
        tableHeader: isHeader,
      });
    }),
  });
}

const COLS = [2400, 1500, 1500, 3960]; // Fayl nomi | O'lcham | Format | Tavsif (sums to 9360 = US Letter content)

const sections = [
  {
    num: '01',
    title: 'BRAND VA LOGO',
    description: "Eng muhim — ilovaning identifikatsiyasi. Splash screen, onboarding, header'lar va app icon uchun ishlatiladi. NEXORA brendining cyan→violet→magenta gradient stilini saqlash muhim.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['logo.svg', '512×512', 'SVG', "Asosiy logo (full): 'N' belgi + NEXORA matni. Onboarding 1-sahifa, splash screen, QR kod markazi va header'larda ishlatiladi."],
      ['logo-mark.svg', '100×120', 'SVG', "Faqat 'N' belgi (kompakt versiya). Kichik joylarda — chat avatari, kichik header'lar uchun."],
      ['logo-white.svg', '256×256', 'SVG', "Oq monoxrom variant. Dark fon ustida zarurat tug'ilganda ishlatiladi."],
      ['app-icon.png', '1024×1024', 'PNG', 'iOS va Android Play Store/App Store uchun asosiy ilova ikonkasi. Yumaloq qirralar avtomatik qo\'llanadi.'],
      ['adaptive-icon.png', '1024×1024', 'PNG (alpha)', "Android adaptive icon — markazda safe area, fon avtomatik to'ldiriladi. Logo o'rta 66% da turishi kerak."],
      ['splash-icon.png', '1242×1242', 'PNG (alpha)', 'Ilova ochilganda chiqadigan splash screen markazidagi logo. Fon rangi #080F16.'],
      ['favicon.png', '256×256', 'PNG', "Web versiyasi uchun browser tab ikonkasi (kelajakda kerak bo'ladi)."],
    ],
  },
  {
    num: '02',
    title: 'AVATAR / FOYDALANUVCHI RASMLARI',
    description: 'Foydalanuvchi profili va boshqa o\'yinchilar avatarlari. Chap-yuqori header, chat, reyting va jamoa qidirish sahifalarida ko\'rsatiladi.',
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['avatar-default.png', '200×200', 'PNG', "Default user avatar (foydalanuvchi rasmi yo'q bo'lganda). Cyberpunk stilida gradient fon + person silhouette."],
      ['avatar-akmal.png', '200×200', 'PNG', 'Demo profil rasmi (Akmal). Header, profil, chat va to\'lov sahifalarida ishlatiladi.'],
      ['team-avatars/sn1per.png', '200×200', 'PNG', "Jamoa qidirish + chat: sN1per (LVL 28, AWP Main)"],
      ['team-avatars/kenz0.png', '200×200', 'PNG', 'Jamoa: Kenz0 (LVL 26, Entry Fragger)'],
      ['team-avatars/monesyuz.png', '200×200', 'PNG', 'Jamoa: mONESYuz (LVL 24, Support)'],
      ['team-avatars/r3v0lt.png', '200×200', 'PNG', 'Jamoa: r3v0lt (LVL 22, IGL)'],
      ['team-avatars/v1per.png', '200×200', 'PNG', "Reyting top o'yinchi: v1per"],
      ['rating-avatars/glowyy.png', '200×200', 'PNG', "Reyting top: glowyy"],
      ['rating-avatars/z0r1k.png', '200×200', 'PNG', "Reyting top: z0r1k"],
    ],
  },
  {
    num: '03',
    title: 'KLUB FOTOSURATLARI',
    description: "Gaming klublar (cybercafe, PS zona, VR studios) ichki rasmlari. Klub kartochkasi, klub tafsilotlari hero section, va klub gallereyasida ishlatiladi. Neon cyberpunk muhit.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['clubs/nexora-arena.jpg', '800×600', 'JPG/WebP', "Asosiy demo klub (Nexora Arena Koramangala). Klub tafsilotlari hero, home recommendations va active session da ishlatiladi."],
      ['clubs/galaxy-play.jpg', '800×600', 'JPG/WebP', "Galaxy Play Club — saralanganlar va smart recommendations sahifalarida."],
      ['clubs/cyber-zone.jpg', '800×600', 'JPG/WebP', "Cyber Zone klub rasmi."],
      ['clubs/nexora-ai-hub.jpg', '800×600', 'JPG/WebP', 'Nexora AI Hub — VIP/AI klub.'],
      ['clubs/league-arena.jpg', '800×600', 'JPG/WebP', "Nexora League Arena — bookings tarix sahifasida."],
      ['clubs/gallery-1.jpg', '400×400', 'JPG/WebP', 'Klub ichki gallereya rasmi #1 (klub tafsilotlari pastki qismida)'],
      ['clubs/gallery-2.jpg', '400×400', 'JPG/WebP', 'Klub ichki gallereya rasmi #2'],
      ['clubs/gallery-3.jpg', '400×400', 'JPG/WebP', 'Klub ichki gallereya rasmi #3'],
    ],
  },
  {
    num: '04',
    title: 'ZONA RASMLARI',
    description: "Klub ichidagi turli zonalar — har xil mukammal jihozlar bilan. Zona tanlash sahifasida foydalanuvchi qaysi zonani band qilishini tanlaydi.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['zones/pc-zone.jpg', '600×400', 'JPG', "Yuqori samaradorlikli PC zonasi — 48 joy, soatiga 20 000 so'm."],
      ['zones/vip-zone.jpg', '600×400', 'JPG', "VIP kompyuter zonasi — premium jihozlar, 12 joy, 35 000 so'm/soat."],
      ['zones/ps5-zone.jpg', '600×400', 'JPG', "PS5 xonalari — konsollar va katta ekranlar, 8 zona, 25 000 so'm/soat."],
      ['zones/vr-zone.jpg', '600×400', 'JPG', "VR zona — eng immersiv tajriba (smart recommendations sahifasida)."],
    ],
  },
  {
    num: '05',
    title: 'TURNIR / AKSIYA RASMLARI',
    description: "E-sport turnirlari va promo aksiyalar uchun banner rasmlari. JONLI badge bilan featured kartochkalarda va list itemlarda ishlatiladi.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['tournaments/nexora-cup.jpg', '800×400', 'JPG', 'Asosiy turnir banner — Nexora Cup #12 (CS2, 5v5). Featured kartochka va turnir tafsilotlari hero da.'],
      ['tournaments/night-hunters.jpg', '400×400', 'JPG', "Night Hunters Cup turnir thumbnail."],
      ['tournaments/dota2-masters.jpg', '400×400', 'JPG', 'Dota 2 Masters turnir thumbnail.'],
      ['tournaments/pubg-warriors.jpg', '400×400', 'JPG', 'PUBG Warriors turnir thumbnail.'],
      ['promotions/hayotdan-rohat.jpg', '800×400', 'JPG', "'HAYOTDAN ROHAT' aksiya banner — home page Faol aksiyalar sektsiyasida (25% chegirma, character image)."],
    ],
  },
  {
    num: '06',
    title: 'ONBOARDING RASMLARI',
    description: "Birinchi marta ilova ochilganda ko'rinadigan 3 sahifali onboarding flow uchun. Brendni tanitadi va asosiy funksiyalarni ko'rsatadi.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['onboarding/cyber-city.jpg', '1080×1920', 'JPG', "1-sahifa fon — cyberpunk shahar manzarasi (neon ko'cha, futuristik gradient platforma). Logo va tagline ustida ishlaydi."],
      ['onboarding/building-3d.png', '600×600', 'PNG (alpha)', "2-sahifa illustratsiya — 3D rendered klub binosi NEXORA brending va location pin overlay bilan ('Sizga yaqin klublarni toping')."],
      ['onboarding/feature-pc.png', '200×150', 'PNG', "3-sahifa kartochka 1: Kompyuterlar — gaming setup mini rasm."],
      ['onboarding/feature-controller.png', '200×150', 'PNG', '3-sahifa kartochka 2: PS zona — controller mini rasm.'],
      ['onboarding/feature-wallet.png', '200×150', 'PNG', "3-sahifa kartochka 3: To'ldirish — hamyon/karta mini rasm."],
    ],
  },
  {
    num: '07',
    title: 'AI / NEXORA YORDAMCHI',
    description: "Sun'iy intellekt yordamchi rasmlari. Yordam sahifasi va AI assistant chat'da kattaroq versiyasi, kichik chat avatari sifatida ham.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['ai-assistant.png', '400×400', 'PNG (alpha)', "Yordam va qo'llab-quvvatlash sahifasida katta robot/AI character rasmi (cyan glow effekti bilan)."],
      ['ai-avatar.png', '200×200', 'PNG (alpha)', 'AI chat header avatar (Nexora AI yordamchisi sahifasi). Kichik, doiraviy.'],
    ],
  },
  {
    num: '08',
    title: 'MUKOFOT / LOOT BOX',
    description: "Mukofot kartochkalari, loot box va sodiqlik mukofoti rasmlari. Premium 3D rendering yoki game-style illustratsiya.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['chest/season-chest.png', '200×200', 'PNG (alpha)', "Mavsumiy mukofot quti — Yutuqlar sahifasi 'Mavsumiy mukofotlar' kartochkasida (violet/magenta gradient)."],
      ['gift-box.png', '200×200', 'PNG (alpha)', "Profil sahifasidagi 'Sodiqlik mukofoti' kartochkasi uchun gift box (purple gradient)."],
      ['coin-stack.png', '300×300', 'PNG (alpha)', "Mukofotlar markazi sahifasi — 2 450 ball balansi yonida tanga to'plami (gold)."],
    ],
  },
  {
    num: '09',
    title: "KARTA / TO'LOV LOGOLARI",
    description: "Mahalliy va xalqaro to'lov tizimlari logolari. To'lov, hamyon to'ldirish va kartalar ro'yxatida ko'rsatiladi.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['payment/uzcard.svg', '100×40', 'SVG', "UZCARD rasmiy logo (ko'k brand color). Kartalarim sahifasi va to'lov usullarida."],
      ['payment/humo.svg', '100×40', 'SVG', "HUMO rasmiy logo (yashil brand). Kartalarim va to'lov usullarida."],
      ['payment/click.svg', '100×40', 'SVG', "Click to'lov tizimi rasmiy logo."],
      ['payment/payme.svg', '100×40', 'SVG', "Payme to'lov tizimi rasmiy logo."],
      ['payment/apple-pay.svg', '100×40', 'SVG', 'Apple Pay rasmiy logo.'],
      ['payment/google-pay.svg', '100×40', 'SVG', 'Google Pay rasmiy logo.'],
    ],
  },
  {
    num: '10',
    title: 'SOCIAL LOGIN LOGOLARI',
    description: "Login/Ro'yxatdan o'tish sahifasida 3 ta social login tugmasi uchun rasmiy brand logolari.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['social/google.svg', '48×48', 'SVG', "Google rasmiy 'G' logo (ko'p rangli)."],
      ['social/facebook.svg', '48×48', 'SVG', "Facebook rasmiy 'f' logo (ko'k)."],
      ['social/apple.svg', '48×48', 'SVG', "Apple rasmiy logo (oq, dark fonda)."],
    ],
  },
  {
    num: '11',
    title: 'O\'YIN LOGOLARI',
    description: "O'yin logolari va fon rasmlari. Turnirlar tab filtri, profil sevimli o'yinlar sektsiyasida ishlatiladi.",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['games/cs2.png', '200×200', 'PNG (alpha)', 'Counter-Strike 2 rasmiy logo. Turnirlar filter va statistics.'],
      ['games/dota2.png', '200×200', 'PNG (alpha)', 'Dota 2 rasmiy logo.'],
      ['games/pubg.png', '200×200', 'PNG (alpha)', 'PUBG: Battlegrounds rasmiy logo.'],
      ['games/fc24.png', '200×200', 'PNG (alpha)', 'EA Sports FC 24 rasmiy logo.'],
      ['games/valorant.png', '200×200', 'PNG (alpha)', 'Valorant rasmiy logo.'],
      ['games/cs2-bg.jpg', '400×600', 'JPG', "Profil sevimli o'yinlar — CS2 fon (vertical card)."],
      ['games/dota2-bg.jpg', '400×600', 'JPG', "Profil sevimli o'yinlar — Dota 2 fon."],
      ['games/valorant-bg.jpg', '400×600', 'JPG', "Profil sevimli o'yinlar — Valorant fon."],
    ],
  },
  {
    num: '12',
    title: 'YUTUQ NISHONLARI (Achievements)',
    description: "Yutuqlar/Nishonlar sahifasidagi 6 ta achievement badges. Har biri o'z rangida (cyan, violet, magenta, blue, silver, bronze).",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['badges/turnir-golibi.png', '200×200', 'PNG (alpha)', "'Turnir g'olibi' nishoni — cyan rangda trophy, 5 marta yutgan."],
      ['badges/galaba-seriyasi.png', '200×200', 'PNG (alpha)', "'G'alaba seriyasi' — violet rangda star, 10 g'alaba."],
      ['badges/eng-yaxshi-mvp.png', '200×200', 'PNG (alpha)', "'Eng yaxshi o'yinchi' — magenta rangda crown, MVP 25 marta."],
      ['badges/jamoa-yetakchisi.png', '200×200', 'PNG (alpha)', "'Jamoa yetakchisi' — ko'k rangda gamepad, 50 o'yin."],
      ['badges/kumush-medal.png', '200×200', 'PNG (alpha)', "Kumush medal — 2-marta 2-o'rin."],
      ['badges/bronze-medal.png', '200×200', 'PNG (alpha)', "Bronze medal — 3-marta 3-o'rin."],
      ['badges/level-pro.png', '200×200', 'PNG (alpha)', "'NEXORA PRO' badge (LVL 24) — Yutuqlar sahifasi yuqorisi va Mukofotlar markazida."],
    ],
  },
  {
    num: '13',
    title: 'REYTING NISHONLARI (Rank Badges)',
    description: "ELO reyting tizimi nishonlari — Reyting indikatorlari sektsiyasida (dizayn tizimi pastki qismida ko'rsatilgan).",
    rows: [
      ['Fayl nomi', "O'lcham", 'Format', 'Tavsif'],
      ['ranks/legend.png', '100×100', 'PNG (alpha)', "Legend rank — 2000+ ELO (eng yuqori)."],
      ['ranks/diamond.png', '100×100', 'PNG (alpha)', 'Diamond rank — 1600+ ELO.'],
      ['ranks/platinum.png', '100×100', 'PNG (alpha)', 'Platinum rank — 1200+ ELO.'],
      ['ranks/gold.png', '100×100', 'PNG (alpha)', 'Gold rank — 800+ ELO.'],
      ['ranks/silver.png', '100×100', 'PNG (alpha)', 'Silver rank — 400+ ELO.'],
      ['ranks/bronze.png', '100×100', 'PNG (alpha)', 'Bronze rank — 0-399 ELO.'],
    ],
  },
];

// Build document
const children = [];

// Title page
children.push(
  new Paragraph({
    children: [new TextRun({ text: 'NEXORA CLOUD', bold: true, size: 56, color: '7C3AED', font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 100 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Mobile Application', size: 28, color: '6B7280', font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Asset Files Requirements', bold: true, size: 36, color: '111827', font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'To\'liq fayllar ro\'yxati va texnik talablar', size: 24, italics: true, color: '4B5563', font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
  }),
);

// Project info card
children.push(
  new Paragraph({
    children: [new TextRun({ text: 'Loyiha haqida', bold: true, size: 26, color: '7C3AED', font: 'Arial' })],
    spacing: { before: 600, after: 120 },
  }),
  paragraph("NEXORA Cloud — gaming klublari (kompyuter klublari, PS zonalari, VR studios) uchun mobil bron qilish ilovasi. iOS va Android uchun React Native + Expo asosida qurilgan.", { size: 22, font: 'Arial' }),
  new Paragraph({
    children: [new TextRun({ text: 'Dizayn tizimi', bold: true, size: 26, color: '7C3AED', font: 'Arial' })],
    spacing: { before: 240, after: 120 },
  }),
  paragraph("• Ranglar: #00E5FF (Nexora Movi), #0066FF (Elektrik Ko'k), #7C3AED (Violet), #FF34E0 (Magenta), #1A1F2B (Shisha), #080F16 (Kulte)", { size: 22, font: 'Arial' }),
  paragraph("• Tipografiya: Orbitron Bold (sarlavhalar), Inter Regular/Medium (matn)", { size: 22, font: 'Arial' }),
  paragraph("• Tema: Dark cyberpunk gaming aesthetic (neon glow, gradient effects)", { size: 22, font: 'Arial' }),
  new Paragraph({
    children: [new TextRun({ text: 'Tavsiya etiladigan formatlar', bold: true, size: 26, color: '7C3AED', font: 'Arial' })],
    spacing: { before: 240, after: 120 },
  }),
  paragraph("• SVG — iconlar va logolar uchun (vector, har qanday DPI)", { size: 22, font: 'Arial' }),
  paragraph("• PNG @1x/@2x/@3x — emoji, 3D render va alpha kanal kerak bo'lgan rasmlar", { size: 22, font: 'Arial' }),
  paragraph("• WebP yoki JPG — fotosuratlar (kichik fayl hajmi, tezroq yuklanadi)", { size: 22, font: 'Arial' }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Each section
sections.forEach((s) => {
  children.push(sectionTitle(s.num, s.title));
  children.push(description(s.description));
  children.push(makeTable(s.rows, COLS));
  children.push(new Paragraph({ children: [new TextRun({ text: '', size: 4 })], spacing: { after: 200 } }));
});

// Footer / Notes
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  new Paragraph({
    children: [new TextRun({ text: "QO'SHIMCHA ESLATMALAR", bold: true, size: 28, color: '7C3AED', font: 'Arial' })],
    spacing: { before: 240, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '7C3AED', space: 4 } },
  }),
  paragraph("📂 Tashlash usuli", { bold: true, size: 24, font: 'Arial', after: 120 }),
  paragraph("• Barcha fayllarni quyidagi papka strukturasi bilan zip qilib yuboring:", { size: 22, font: 'Arial' }),
  paragraph("  assets/brand, assets/avatars, assets/clubs, assets/zones, assets/tournaments,", { size: 22, font: 'Arial', color: '6B7280' }),
  paragraph("  assets/onboarding, assets/ai, assets/games, assets/badges, assets/ranks,", { size: 22, font: 'Arial', color: '6B7280' }),
  paragraph("  assets/payment, assets/social, assets/icons (ixtiyoriy)", { size: 22, font: 'Arial', color: '6B7280' }),
  paragraph("• Yoki to'g'ridan-to'g'ri assets/ papkasiga qo'yib, kodga avtomatik ulanadi.", { size: 22, font: 'Arial' }),
  paragraph("🎨 UI Iconlar (60+ adet)", { bold: true, size: 24, font: 'Arial', before: 240, after: 120 }),
  paragraph("Hozir 60+ SVG icon kodda mavjud (phone, qr, bell, gamepad, monitor, trophy, wallet, plus, star, coin, bookmark, clock, robot, close, location-pin, va boshqalar). Agar siz brand stiliga mos custom iconlar berishni xohlasangiz, har biri 24×24 viewBox SVG'da bo'lishi tavsiya etiladi.", { size: 22, font: 'Arial' }),
  paragraph("✅ Hozirgi holat", { bold: true, size: 24, font: 'Arial', before: 240, after: 120 }),
  paragraph("Ilova hozir Unsplash va pravatar.cc dan placeholder rasmlar bilan to'liq ishlayapti. Real assetlar yuborilgach, /constants/Images.ts faylida URL'lar avtomatik o'zgartirilib, ilova darhol yangilanadi.", { size: 22, font: 'Arial' }),
);

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: '7C3AED' },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: '111827' },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('NEXORA-Cloud-Assets-List.docx', buffer);
  console.log('OK: NEXORA-Cloud-Assets-List.docx generated');
});
