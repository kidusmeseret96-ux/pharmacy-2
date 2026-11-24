import type { Language, UserRole } from '../types/pharmacy.ts';

export type GuideCategoryId =
  | 'getting_started'
  | 'pos_sales'
  | 'inventory_restock'
  | 'attendance_qr'
  | 'staff_payroll'
  | 'finance_audit';

export type LocalizedText = Record<Language, string>;

export interface GuideStep {
  number: number;
  roles: UserRole[];
  targetButton: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  tip?: LocalizedText;
}

export interface GuideCategory {
  id: GuideCategoryId;
  orderLabel: string;
  roles: UserRole[];
  heroAsset: 'pharmacyStore' | 'capsuleHero' | 'pillBottle' | 'careHeart';
  title: LocalizedText;
  subtitle: LocalizedText;
  diagramTitle: LocalizedText;
  diagramCaption: LocalizedText;
  steps: GuideStep[];
}

export interface GuideUiStrings {
  pageTitle: LocalizedText;
  pageSubtitle: LocalizedText;
  searchPlaceholder: LocalizedText;
  roleFilterAll: LocalizedText;
  roleOwner: LocalizedText;
  roleManager: LocalizedText;
  roleSeller: LocalizedText;
  categoriesHeading: LocalizedText;
  interactiveDiagramHint: LocalizedText;
  buttonLabelPrefix: LocalizedText;
  usedByLabel: LocalizedText;
  tipLabel: LocalizedText;
  noResultsTitle: LocalizedText;
  noResultsSub: LocalizedText;
  resetFilters: LocalizedText;
  helplineBanner: LocalizedText;
  roleMatrixTitle: LocalizedText;
  roleMatrixOwnerDesc: LocalizedText;
  roleMatrixManagerDesc: LocalizedText;
  roleMatrixSellerDesc: LocalizedText;
  closeGuide: LocalizedText;
}

export const GUIDE_UI: GuideUiStrings = {
  pageTitle: {
    en: 'Complete Pharmacy User Manual',
    am: 'ሙሉ የፋርማሲ አጠቃቀም መመሪያ',
    om: 'Qajeelfama Guutuu Fayyadama Faarmaasii',
  },
  pageSubtitle: {
    en: 'Step-by-step visual instructions with interactive button arrows for Owners, Managers, and Sellers in every language.',
    am: 'ለባለቤቶች፣ ለሥራ አስኪያጆች እና ለሻጮች በሁሉም ቋንቋዎች የቁልፍ ቀስቶችን ያካተተ ዝርዝር የአጠቃቀም መመሪያ።',
    om: 'Qajeelfama tartiiba hojii fi agarsiiftuu qabduu (xiyyaa) Abbootii Qabeenyaa, Hoggantootaa fi Gurgurtootaaf afaan hundaan qophaa’e.',
  },
  searchPlaceholder: {
    en: 'Search a button, feature, or instruction (e.g. QR, Restock, Rx, Telebirr)...',
    am: 'ቁልፍ ወይም መመሪያ ይፈልጉ (ለምሳሌ QR፣ ክምችት፣ ማዘዣ፣ ቴሌብር)...',
    om: 'Qabduu ykn ajaja barbaadi (fkn. QR, Kuusaa, Ajaja Hakimii, Telebirr)...',
  },
  roleFilterAll: {
    en: 'All Accounts',
    am: 'ሁሉም መለያዎች',
    om: 'Eenyummeessaa Hunda',
  },
  roleOwner: {
    en: 'Owner',
    am: 'ባለቤት',
    om: 'Abbaa Qabeenyaa',
  },
  roleManager: {
    en: 'Manager',
    am: 'ሥራ አስኪያጅ',
    om: 'Hogganaa',
  },
  roleSeller: {
    en: 'Seller / Cashier',
    am: 'ሻጭ / ገንዘብ ተቀባይ',
    om: 'Gurguraa',
  },
  categoriesHeading: {
    en: 'Instruction Categories',
    am: 'የመመሪያ ምድቦች',
    om: 'Kutaalee Qajeelfamaa',
  },
  interactiveDiagramHint: {
    en: 'Click or hover any numbered arrow or step below to highlight the exact app button.',
    am: 'ትክክለኛውን የመተግበሪያ ቁልፍ ለማጉላት ከታች ወይም በምስሉ ላይ ያሉትን ቁጥሮች ይንኩ።',
    om: 'Qabduu sirrii agarsiisuuf lakkoofsota xiyyaa ykn tartiiba armaan gadii tuqaa.',
  },
  buttonLabelPrefix: {
    en: 'App Button / Control',
    am: 'የመተግበሪያው ቁልፍ',
    om: 'Qabduu Appii',
  },
  usedByLabel: {
    en: 'Account Access',
    am: 'የሚጠቀሙት መለያዎች',
    om: 'Eenyummeessaa Fayyadamuu Danda’an',
  },
  tipLabel: {
    en: 'Important Rule / Tip',
    am: 'ጠቃሚ ማሳሰቢያ',
    om: 'Hubachiisa Barbaachisaa',
  },
  noResultsTitle: {
    en: 'No matching instructions found',
    am: 'ተዛማጅ መመሪያ አልተገኘም',
    om: 'Qajeelfamni walsimu hin argamne',
  },
  noResultsSub: {
    en: 'Clear your search or switch the account filter back to All Accounts.',
    am: 'ፍለጋዎን ያጽዱ ወይም የመለያ ማጣሪያውን ወደ ሁሉም መለያዎች ይመልሱ።',
    om: 'Barbaacha keessan haqaa ykn filannoo gara Eenyummeessaa Hundaatti deebisaa.',
  },
  resetFilters: {
    en: 'Show All Guides',
    am: 'ሁሉንም መመሪያዎች አሳይ',
    om: 'Qajeelfama Hunda Agarsiisi',
  },
  helplineBanner: {
    en: 'Need live assistance or owner password recovery? Call 0945206759',
    am: 'ቀጥታ እርዳታ ወይም የባለቤት የይለፍ ቃል መመለሻ ከፈለጉ በ 0945206759 ይደውሉ',
    om: 'Gargaarsa ykn jecha iccitii abbaa deebisuuf 0945206759 irratti bilbilaa',
  },
  roleMatrixTitle: {
    en: 'What Each Account Role Can Do',
    am: 'እያንዳንዱ መለያ ምን መስራት ይችላል?',
    om: 'Gaheen Eenyummeessaa Tokkoon Tokkoo',
  },
  roleMatrixOwnerDesc: {
    en: 'Full control: Profit Overview, Drug Catalog, Restock Sheets, POS, Transactions, Expenses & Suppliers, Audit Log, QR Attendance, Staff + Fayda IDs, Payroll, and Settings.',
    am: 'ሙሉ ቁጥጥር፡ የትርፍ እይታ፣ የመድኃኒት ዝርዝር፣ የግዢ ማዘዣ፣ POS፣ ግብይቶች፣ ወጪ እና አቅራቢዎች፣ ኦዲት፣ QR፣ ሠራተኞች፣ ደመወዝ እና ቅንብሮች።',
    om: 'Too’annoo guutuu: Bu’aa, Tarree Qorichaa, Kuusaa, POS, Gurgurtaa, Baasii fi Dhiyeessaa, Odiitii, QR, Hojjettoota, Mindaa fi Qindaa’ina.',
  },
  roleMatrixManagerDesc: {
    en: 'Operations control: Drug Catalog, Add Stock & Restock Sheets, Counter POS, Transactions, Attendance QR Poster & Logs, plus personal Portal & QR Clock-In.',
    am: 'የሥራ አስኪያጅ መዳረሻ፡ የመድኃኒት ዝርዝር፣ ክምችት መጨመር፣ የሽያጭ መስኮት (POS)፣ ግብይቶች፣ የQR ሰዓት መመዝገቢያ እና የግል ደመወዝ ገጽ።',
    om: 'Hogganaa hojii: Tarree Qorichaa, Kuusaa Dabaluu, Bakka Gurgurtaa (POS), Gurgurtaawwan, Poostarii QR fi Seensa/Bahumsa dhuunfaa.',
  },
  roleMatrixSellerDesc: {
    en: 'Counter & shift focus: Counter POS checkout (with Rx & payment-proof capture), Hold/Park Cart, Shift Cash Count, QR Camera Clock-In/Out, and personal Salary/Sales stats.',
    am: 'የሽያጭ ባለሙያ፡ የPOS ሽያጭ (ከማዘዣ እና የክፍያ ፎቶ ጋር)፣ ጋሪ ማቆየት፣ የፈረቃ ገንዘብ ቆጠራ፣ የQR ካሜራ መግቢያ/መውጫ እና የግል ሽያጭ/ደመወዝ።',
    om: 'Gurguraa: Gurgurtaa POS (suuraa ajaja hakimii fi kaffaltii waliin), Gaarii Tursiisuu, Lakkoofsa Shifftii, Iskaana QR fi Mindaa/Gurgurtaa dhuunfaa.',
  },
  closeGuide: {
    en: 'Close Guide',
    am: 'መመሪያውን ዝጋ',
    om: 'Qajeelfama Cufi',
  },
};

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: 'getting_started',
    orderLabel: '01',
    roles: ['owner', 'manager', 'seller'],
    heroAsset: 'pharmacyStore',
    title: {
      en: 'Getting Started, Sign-In & Preferences',
      am: 'መግቢያ፣ የቋንቋ እና የቀን/ሌሊት ቅንብሮች',
      om: 'Jalqaba, Seensa fi Qindaa’ina Afaanii',
    },
    subtitle: {
      en: 'How Owners setup the system, how Staff sign in, how to switch English / አማርኛ / Afaan Oromoo, and how Offline Sync works.',
      am: 'ባለቤቶች ስርዓቱን እንዴት እንደሚከፍቱ፣ ሠራተኞች እንዴት እንደሚገቡ፣ ቋንቋ መቀየር እና ያለ ኢንተርኔት መስራት።',
      om: 'Akkaataa Abbaan sirna banu, Hojjettoonni seenan, Afaan jijjiiranii fi Intarneetii malee hojjetan.',
    },
    diagramTitle: {
      en: 'Sign-In, Navigation Bar & Top Controls',
      am: 'የመግቢያ ገጽ፣ የጎን ማውጫ እና የላይኛው መቆጣጠሪያዎች',
      om: 'Fuula Seensaa fi Qabduuwwan Ijoo',
    },
    diagramCaption: {
      en: 'Annotated map of the login controls, language switcher, offline queue sync, and quick action buttons.',
      am: 'የመግቢያ ቁልፎች፣ የቋንቋ መቀየሪያ፣ የኦፍላይን ማመሳሰያ እና የፈጣን ተግባር ቁልፎች ገለጻ።',
      om: 'Fakkii agarsiiftuu qabduuwwan seensaa, jijjiirraa afaanii, walsimsiisa intarneetii malee fi qabduu saffisaa.',
    },
    steps: [
      {
        number: 1,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Language Selector (English / አማርኛ / Afaan Oromoo)',
          am: 'የቋንቋ መምረጫ (English / አማርኛ / Afaan Oromoo)',
          om: 'Filannoo Afaanii (English / አማርኛ / Afaan Oromoo)',
        },
        title: {
          en: 'Choose Your Preferred Language Anytime',
          am: 'በማንኛውም ጊዜ የሚፈልጉትን ቋንቋ ይምረጡ',
          om: 'Yeroo Hunda Afaan Barbaaddan Filadhaa',
        },
        description: {
          en: 'On both the Sign-In screen and the bottom of the left Sidebar (or Menu button on mobile), tap the Language selector to switch the entire pharmacy interface instantly between English, Amharic, and Afaan Oromoo.',
          am: 'በመግቢያው ገጽ ላይ ወይም በግራ በኩል ባለው ዝርዝር ግርጌ (በስልክ ደግሞ Menu ውስጥ) ያለውን የቋንቋ መምረጫ በመንካት መላውን ስርዓት ወደ እንግሊዝኛ፣ አማርኛ ወይም ኦሮምኛ በፍጥነት መቀየር ይችላሉ።',
          om: 'Fuula seensaa irraa ykn jalqaba/gadiitti (bilbilaa irratti Menu keessaa) filannoo afaanii tuquun appii guutuu gara Afaan Ingilizii, Amaaraa ykn Afaan Oromootti battalumatti jijjiiraa.',
        },
      },
      {
        number: 2,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Username & Password -> Sign In',
          am: 'የተጠቃሚ ስም እና የይለፍ ቃል -> ግባ',
          om: 'Maqaa Fayyadamaa & Jecha Iccitii -> Seeni',
        },
        title: {
          en: 'Owner First Setup & Daily Staff Login',
          am: 'የመጀመሪያ የባለቤት መለያ እና የሠራተኞች መግቢያ',
          om: 'Qindaa’ina Jalqabaa Abbaa fi Seensa Hojjettootaa',
        },
        description: {
          en: 'On first installation, the Owner creates the primary Owner Username and Password. Afterward, Owners, Managers, and Sellers all sign in using their assigned Username and Password. Only the Owner can reset credentials or add new workers.',
          am: 'ስርዓቱ ለመጀመሪያ ጊዜ ሲከፈት ባለቤቱ ዋና የተጠቃሚ ስም እና የይለፍ ቃል ይፈጥራል። ከዚያ በኋላ ባለቤቱ፣ ሥራ አስኪያጁ እና ሻጮች በተሰጣቸው የተጠቃሚ ስምና የይለፍ ቃል ይገባሉ።',
          om: 'Jalqaba yeroo banamu Abbaan Qabeenyaa maqaa fi jecha iccitii mataa isaa uuma. Sana booda Abbaan, Hoggantoonnii fi Gurgurtoonni maqaa fi jecha iccitii isaaniitiin seenu.',
        },
        tip: {
          en: 'If the Owner forgets their password, tap "Forgot Owner Password?" on the login page and call 0945206759 for the recovery passcode.',
          am: 'ባለቤቱ የይለፍ ቃሉን ከረሱ በመግቢያው ገጽ ላይ "የባለቤት የይለፍ ቃል ረሱ?" የሚለውን ነክተው የማስመለሻ ኮድ ለማግኘት በ 0945206759 ይደውሉ።',
          om: 'Yoo Abbaan Qabeenyaa jecha iccitii dagatan "Jecha Iccitii Abbaa Dagattanii?" tuquun koodii deebisaa argachuuf 0945206759 irratti bilbilaa.',
        },
      },
      {
        number: 3,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Day Mode / Night Mode & Sound Toggle',
          am: 'የቀን / የሌሊት ገጽታ እና የድምፅ መቆጣጠሪያ',
          om: 'Ifa Guyyaa / Halkan fi Sagalee',
        },
        title: {
          en: 'Comfortable Viewing & Audio Feedback',
          am: 'ለዓይን ምቹ እይታ እና የድምፅ ምልክት',
          om: 'Mul’ata Mijataa fi Sagalee Hubachiisaa',
        },
        description: {
          en: 'Switch between Day Mode (bright clinical blue-white) and Night Mode (low-glare midnight glass) for evening shifts. Toggle the speaker icon if you want silent POS tapping.',
          am: 'ለማታ ፈረቃዎች የቀን ወይም የሌሊት ገጽታን ይቀይሩ። የሽያጭ ድምፅ እንዲጠፋ ከፈለጉ የድምፅ ማጉያ ምልክቱን ይንኩ።',
          om: 'Hojii halkaniitiif Ifa Guyyaa fi Halkan gidduu jijjiiraa. Sagalee gurgurtaa dhaamsuuf mallattoo sagalee tuqaa.',
        },
      },
      {
        number: 4,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Sync Now (Offline Mode Queue)',
          am: 'አሁን አመሳስል (ከመስመር ውጭ መዝገብ)',
          om: 'Amma Walsimsiisi (Intarneetii Malee)',
        },
        title: {
          en: 'Keep Selling Even If Internet Drops',
          am: 'ኢንተርኔት ቢቋረጥም ሽያጭ እና ሰዓት መመዝገብ ይቀጥላል',
          om: 'Intarnetiin Yoo Cites Gurgurtaan Hin Dhaabbatu',
        },
        description: {
          en: 'When Offline appears in the top bar, POS sales and QR punches are safely stored inside your device. As soon as Wi-Fi or mobile data reconnects, the app auto-syncs—or tap "Sync Now" in the top bar to push queued records immediately.',
          am: 'ኢንተርኔት ሲቋረጥ የPOS ሽያጮች እና የQR ሰዓት ምዝገባዎች በመሳሪያዎ ውስጥ በጥንቃቄ ይቀመጣሉ። ኢንተርኔት ሲመለስ ራሱ ይልካል ወይም "አሁን አመሳስል" የሚለውን ይንኩ።',
          om: 'Yeroo intarnetiin citu gurgurtaa fi galmeen QR meeshaa keessan keessatti olkaa’ama. Yommuu deebi’u ofumaan erga ykn "Amma Walsimsiisi" tuqaa.',
        },
      },
      {
        number: 5,
        roles: ['owner', 'manager'],
        targetButton: {
          en: 'Ethiopian / Gregorian Calendar & Settings Kit',
          am: 'የኢትዮጵያ / የፈረንጆች ቀን መቁጠሪያ',
          om: 'Kalandara Itoophiyaa / Awurooppaa',
        },
        title: {
          en: 'Dual Calendar Display & Clinic Name Welcome',
          am: 'የሁለቱም ቀን መቁጠሪያ እና የባለቤት እንኳን ደህና መጡ ስም',
          om: 'Mul’ata Kalandara Lamaa fi Maqaa Abbaa',
        },
        description: {
          en: 'In Settings & Kit, the Owner chooses Ethiopian, Gregorian, or Both calendars so expiry dates, receipts, and payroll show the exact date format your staff prefer, and updates the Owner Name shown next to "Welcome" in the sidebar.',
          am: 'ባለቤቱ በቅንብሮች ገጽ ውስጥ የኢትዮጵያ ወይም የፈረንጆች ወይም ሁለቱንም ቀን መቁጠሪያ መምረጥ እንዲሁም ከ"እንኳን ደህና መጡ" ጎን የሚታየውን የባለቤት ስም ማስተካከል ይችላሉ።',
          om: 'Qindaa’ina keessatti Abbaan Kalandara Itoophiyaa, Awurooppaa ykn Lamaanuu filachuu fi maqaa "Baga nagaan dhuftan" jedhu cinatti mul’atu jijjiiruu danda’a.',
        },
      },
    ],
  },
  {
    id: 'pos_sales',
    orderLabel: '02',
    roles: ['owner', 'manager', 'seller'],
    heroAsset: 'capsuleHero',
    title: {
      en: 'Counter POS, Prescriptions & Shift Close',
      am: 'የሽያጭ መስኮት (POS)፣ የሐኪም ማዘዣ እና የፈረቃ ገንዘብ ቆጠራ',
      om: 'Bakka Gurgurtaa (POS), Ajaja Hakimii fi Lakkoofsa Shifftii',
    },
    subtitle: {
      en: 'Complete workflow for selling single units, packs, or boxes, capturing Rx and payment proofs, parking carts, and closing shifts.',
      am: 'በነጠላ፣ በፓክ ወይም በሳጥን መሸጥ፣ የማዘዣ እና የክፍያ ፎቶ ማያያዝ፣ ጋሪ ማቆየት እና የፈረቃ ገንዘብ መዝጋት።',
      om: 'Qoricha tokkoon, paakiidhaan ykn saanduqqaan gurguruu, suuraa ajaja hakimii fi kaffaltii galchuu, fi shifftii cufuu.',
    },
    diagramTitle: {
      en: 'Counter POS Checkout Controls',
      am: 'የሽያጭ መስኮት (POS) ዋና ቁልፎች',
      om: 'Qabduuwwan Bakka Gurgurtaa (POS)',
    },
    diagramCaption: {
      en: 'Follow numbered arrows 1 through 6 during every customer checkout at the counter.',
      am: 'በእያንዳንዱ የደንበኛ ሽያጭ ጊዜ ከ1 እስከ 6 ያሉትን ቀስቶች ይከተሉ።',
      om: 'Yeroo gurgurtaa maamilaa hunda xiyyaa 1 hanga 6 hordofaa.',
    },
    steps: [
      {
        number: 1,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Unit Tier Selector (Tablet / Pack / Box) & + Add',
          am: 'የመለኪያ መምረጫ (ነጠላ / ፓክ / ሳጥን) እና + ጨምር',
          om: 'Filannoo Safartuu (Tokko / Paakii / Saanduqa) fi + Dabali',
        },
        title: {
          en: 'Pick Medicine & Select Base, Pack, or Box Tier',
          am: 'መድኃኒቱን ፈልገው ነጠላ፣ ፓክ ወይም ሳጥን ይምረጡ',
          om: 'Qoricha Barbaadaa fi Safartuu Sirrii Filadhaa',
        },
        description: {
          en: 'Search by brand name, generic name, or shelf code (e.g. A-04). If a drug has Pack or Box pricing configured, tap the tier button right on the medicine card before adding to the cart—the app multiplies stock deduction automatically.',
          am: 'በመድኃኒቱ ስም ወይም በመደርደሪያ ኮድ ይፈልጉ። መድኃኒቱ የፓክ ወይም የሳጥን ዋጋ ካለው ከመጨመርዎ በፊት መለኪያውን ይምረጡ፤ ስርዓቱ ክምችቱን በራሱ አስልቶ ይቀንሳል።',
          om: 'Maqaa qorichaa ykn koodii sheelfiitiin barbaadaa. Yoo gatiin paakii ykn saanduqaa qabaate qabduu safartuu tuqaa—sirni kuusaa ofumaan shallagee hir’isa.',
        },
      },
      {
        number: 2,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Hold Cart / Parked Carts',
          am: 'ጋሪውን አቆይ / የተያዙ ጋሪዎች',
          om: 'Gaarii Tursi / Gaariiwwan Tursan',
        },
        title: {
          en: 'Pause One Customer to Serve Another Faster',
          am: 'ደንበኛ ገንዘብ እስኪያመጣ ጋሪውን አቆይተው ሌላ ያስተናግዱ',
          om: 'Maamila Tokko Tursiisanii Kan Biraa Keessummeessuu',
        },
        description: {
          en: 'If a customer steps aside to check Telebirr or ask a doctor, tap "Hold Cart" to save their cart and clear the counter. Tap "Parked Carts" anytime to resume that cart in one click.',
          am: 'ደንበኛው ገንዘብ እስኪያመጣ ወይም እስኪደውል "ጋሪውን አቆይ" የሚለውን ይንኩ። ሲመለስ "የተያዙ ጋሪዎች" ውስጥ በአንድ ንኪት መመለስ ይችላሉ።',
          om: 'Maamilli yeroo biraa deebi’uuf "Gaarii Tursi" tuquun gaarii olkaa’aa; yeroo deebi’an "Gaariiwwan Tursan" keessaa deebisaa.',
        },
      },
      {
        number: 3,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Payment Method: Cash / Transfer / Card / Split Pay',
          am: 'የክፍያ ዘዴ፡ ጥሬ ገንዘብ / ዝውውር / ካርድ / ድብልቅ',
          om: 'Haala Kaffaltii: Callaa / Ergii / Kaardii / Walmakaa',
        },
        title: {
          en: 'Select How the Customer Is Paying',
          am: 'ደንበኛው የሚከፍልበትን መንገድ ይምረጡ',
          om: 'Akkaataa Maamilli Itti Kaffalu Filadhaa',
        },
        description: {
          en: 'Choose Cash, Transfer (Telebirr/CBE), Card, or Split Pay (part cash + part transfer). Choosing Split Pay lets you enter exact Cash and Transfer amounts so shift reconciliation stays accurate.',
          am: 'ጥሬ ገንዘብ፣ የባንክ/ቴሌብር ዝውውር፣ ካርድ ወይም ድብልቅ ክፍያ (ከፊል በጥሬ ገንዘብ ከፊል በዝውውር) ይምረጡ።',
          om: 'Maallaqa Callaa, Ergii Baankii/Telebirr, Kaardii ykn Kaffaltii Walmakaa filadhaa. Kaffaltiin walmakaa maallaqa callaa fi ergii kophaatti galchuuf gargaara.',
        },
      },
      {
        number: 4,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Rx Photo & Payment Proof Camera / Upload',
          am: 'የማዘዣ ፎቶ እና የክፍያ መልዕክት ፎቶ',
          om: 'Suuraa Ajaja Hakimii fi Ergaa Kaffaltii',
        },
        title: {
          en: 'Capture Mandatory Prescription & Payment Proof Photos',
          am: 'አስገዳጅ የሐኪም ማዘዣ እና የክፍያ ማረጋገጫ ፎቶዎችን ያንሱ',
          om: 'Suuraa Ajaja Hakimii fi Mirkaneessa Kaffaltii Dirqamaa Kaasaa',
        },
        description: {
          en: 'Whenever the cart contains an Rx-required medicine, the app requires a Prescription Photo before checkout. Whenever Transfer or Split Pay is selected, you must capture or upload the Telebirr/bank SMS payment screenshot.',
          am: 'በጋሪው ውስጥ የሐኪም ማዘዣ የሚጠይቅ መድኃኒት ካለ የማዘዣ ፎቶ ያስፈልጋል። እንዲሁም ዝውውር ወይም ድብልቅ ክፍያ ሲመረጥ የክፍያ መልዕክቱን ፎቶ ማያያዝ ግዴታ ነው።',
          om: 'Gaarii keessatti qorichi ajaja hakimii barbaadu yoo jiraate suuraan ajaja hakimii dirqama. Kaffaltii ergii yoo ta’e suuraan SMS baankii dirqama.',
        },
        tip: {
          en: 'Both Camera Capture and File Upload buttons work on laptops, tablets, and phones—images are compressed automatically so they save fast.',
          am: 'ካሜራም ሆነ ፋይል መምረጫ ሁለቱም ይሰራሉ፤ ፎቶዎቹ በፍጥነት እንዲቀመጡ መጠናቸው በራሱ ይቀንሳል።',
          om: 'Kaameeraa fi faayila olkaa’uun lamaanuu ni hojjetu; suuraawwan saffisaan akka olkaa’aman ofumaan ni xiqqaatu.',
        },
      },
      {
        number: 5,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Complete Sale & Deduct Stock',
          am: 'ሽያጩን አጠናቅቅ እና ክምችት ቀንስ',
          om: 'Gurgurtaa Xumuri fi Kuusaa Hir’isi',
        },
        title: {
          en: 'Finalize Order, Print Receipt or Download PNG',
          am: 'ሽያጩን ያጠናቅቁና ደረሰኝ ያትሙ ወይም ያውርዱ',
          om: 'Gurgurtaa Xumuri, Nagahee Maxxansi ykn Buufadhu',
        },
        description: {
          en: 'Tap "Complete Sale & Deduct Stock". Inventory deducts immediately, the transaction logs with cashier name and timestamp, and the Receipt Modal opens so you can Print or Download PNG for the patient.',
          am: '"ሽያጩን አጠናቅቅ" ሲነኩ ክምችቱ ወዲያውኑ ይቀነሳል፤ የደረሰኝ መስኮቱ ስለሚከፈት ማተም ወይም በPNG ማውረድ ይችላሉ።',
          om: '"Gurgurtaa Xumuri" yeroo tuqan kuusaan battalumatti hir’ata; foddaan nagahee banamee maxxansuu ykn PNG buufachuu dandeessu.',
        },
      },
      {
        number: 6,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'End Shift Cash Count (Blind Z-Report)',
          am: 'የፈረቃ ገንዘብ ቆጠራ',
          om: 'Lakkoofsa Maallaqa Xumuraa (Shifftii)',
        },
        title: {
          en: 'Submit End-of-Shift Cash Count',
          am: 'በፈረቃ መጨረሻ በእጅ ያለውን ገንዘብ ቆጥረው ያስገቡ',
          om: 'Xumura Shifftii irratti Maallaqa Harkaa Galchaa',
        },
        description: {
          en: 'At the end of your shift, tap "End Shift Cash Count" in the POS header, count your physical drawer cash + transfer receipts blindly without seeing expected totals first, and submit. The Owner sees Balanced / Short / Over status in Finance & Audit.',
          am: 'ፈረቃዎ ሲያልቅ "የፈረቃ ገንዘብ ቆጠራ" የሚለውን ነክተው በሳጥኑ ውስጥ ያለውን ጥሬ ገንዘብና ዝውውር ቆጥረው ያስገቡ። ባለቤቱ በኦዲት ገጽ ላይ ልዩነት ካለ ያያሉ።',
          om: 'Yeroo shiffti xumuramu "Lakkoofsa Maallaqa Xumuraa" tuqaa, maallaqa sanduuqa keessaa lakkaa’aa galchaa. Abbaan Qabeenyaa Gabaasa Shifftii keessatti ni ilaala.',
        },
      },
    ],
  },
  {
    id: 'inventory_restock',
    orderLabel: '03',
    roles: ['owner', 'manager'],
    heroAsset: 'pillBottle',
    title: {
      en: 'Drug Catalog, Stock & One-Click Restock Sheet',
      am: 'የመድኃኒት ዝርዝር፣ ክምችት እና የግዢ ማዘዣ ወረቀት',
      om: 'Tarree Qorichaa, Kuusaa fi Waraqaa Ajaja Bittaa',
    },
    subtitle: {
      en: 'Adding new medicines, organizing Drug Kinds & icons, updating shelf stock, and generating instant supplier restock sheets.',
      am: 'አዲስ መድኃኒት መመዝገብ፣ የመድኃኒት ዓይነቶችን ማስተካከል፣ ክምችት መጨመር እና ለአቅራቢ የሚላክ የግዢ ዝርዝር በአንድ ንኪት ማዘጋጀት።',
      om: 'Qoricha haaraa galmeessuu, Gosa qorichaa qindeessuu, kuusaa dabaluu fi tarree bittaa dhiyeessaa cuqaasuu tokkoon qopheessuu.',
    },
    diagramTitle: {
      en: 'Drug Catalog & Restock Toolbar',
      am: 'የመድኃኒት ዝርዝር እና የግዢ ማዘዣ ቁልፎች',
      om: 'Qabduuwwan Tarree Qorichaa fi Ajaja Kuusaa',
    },
    diagramCaption: {
      en: 'Managers and Owners use these 5 controls to keep stock accurate and prevent shortages.',
      am: 'ሥራ አስኪያጆች እና ባለቤቶች ክምችትን ለመቆጣጠር እና እጥረትን ለመከላከል እነዚህን 5 ቁልፎች ይጠቀማሉ።',
      om: 'Hoggantoonnii fi Abbootiin Qabeenyaa qabduuwwan 5 kana fayyadamuun kuusaa too’atu.',
    },
    steps: [
      {
        number: 1,
        roles: ['owner', 'manager'],
        targetButton: {
          en: '+ New Medicine',
          am: '+ አዲስ መድኃኒት',
          om: '+ Qoricha Haaraa',
        },
        title: {
          en: 'Register a New Medicine with Units, Fridge Flag & Photo',
          am: 'አዲስ መድኃኒት ከመለኪያ፣ ከማቀዝቀዣ ምልክት እና ከፎቶ ጋር ይመዝግቡ',
          om: 'Qoricha Haaraa Safartuu, Firiijii fi Suuraa Waliin Galmeessi',
        },
        description: {
          en: 'Click "+ New Medicine" (in the top header or Catalog). Enter Name, Generic Name, Dosage Form, Shelf Location (e.g. B-12), Cold-Chain / Fridge flag if needed, Buying & Selling Prices, Units per Pack / Packs per Box, Low-Stock Threshold, and optional medicine photo.',
          am: '"+ አዲስ መድኃኒት" ነክተው ስም፣ የመደርደሪያ ቦታ፣ የማቀዝቀዣ (Fridge) ምልክት፣ የግዢና የመሸጫ ዋጋ፣ በፓክ/ሳጥን ያለ ብዛት፣ እና የማስጠንቀቂያ ገደብ ያስገቡ።',
          om: '"+ Qoricha Haaraa" tuqaa, maqaa, bakka sheelfii, mallattoo firiijii, gatii bittaa fi gurgurtaa, baay’ina paakii/saanduqaa fi daangaa akeekkachiisaa galchaa.',
        },
      },
      {
        number: 2,
        roles: ['owner', 'manager'],
        targetButton: {
          en: 'Add Drug Kind (Categories & Icons)',
          am: 'አዲስ የመድኃኒት ዓይነት (ምድብ እና ምስል)',
          om: 'Gosa Qorichaa Haaraa (Ramaddii fi Mallattoo)',
        },
        title: {
          en: 'Create or Edit Custom Drug Kinds',
          am: 'የመድኃኒት ዓይነቶችን ይፍጠሩ ወይም ያስተካክሉ',
          om: 'Gosa Qorichaa Uumaa ykn Gulaalaa',
        },
        description: {
          en: 'Use Drug Kinds to classify medicines (e.g. Tablet, Syrup, Vial, Inhaler, Cream, Drops) with custom icons and unit labels so cashiers spot items quickly in POS.',
          am: 'መድኃኒቶችን (ክኒን፣ ሽሮፕ፣ መርፌ፣ ወዘተ) በምስል እና በመለኪያ ስም ለመለየት የመድኃኒት ዓይነቶችን ይጨምሩ ወይም ያስተካክሉ።',
          om: 'Gurgurtoonni akka dafanii adda baasaniif gosa qorichaa (Kiniinii, Siiraappii, Limmoo kkf) mallattoo waliin uumaa.',
        },
      },
      {
        number: 3,
        roles: ['owner', 'manager'],
        targetButton: {
          en: 'Add Stock / Restock Button',
          am: 'አዲስ ክምችት ጨምር / ክምችት ጨምር',
          om: 'Kuusaa Haaraa Dabali',
        },
        title: {
          en: 'Add Incoming Deliveries by Base, Pack, or Box',
          am: 'አዲስ የገባ መድኃኒት በነጠላ፣ በፓክ ወይም በሳጥን ይጨምሩ',
          om: 'Kuusaa Haaraa Dhufe Tokkoon, Paakiin ykn Saanduqqaan Dabali',
        },
        description: {
          en: 'Tap "Add Stock" on the top bar or the Restock icon on any medicine row. You can add incoming boxes/packs, update the new Batch Number and Expiry Date, and adjust Buying/Selling price.',
          am: 'በላይኛው አሞሌ ወይም በመድኃኒቱ መስመር ላይ "አዲስ ክምችት ጨምር" ነክተው በሳጥን/በፓክ ብዛት፣ አዲስ የባች ቁጥር እና የአገልግሎት ጊዜ ገደብ ያስገቡ።',
          om: 'Qabduu "Kuusaa Haaraa Dabali" tuquun saanduqa ykn paakii dhufe, lakkoofsa baachii fi guyyaa tajaajilaa haaraa galchaa.',
        },
      },
      {
        number: 4,
        roles: ['owner', 'manager'],
        targetButton: {
          en: 'Restock Order Sheet (One-Click Supplier List)',
          am: 'የግዢ ማዘዣ ወረቀት (በአንድ ንኪት)',
          om: 'Waraqaa Ajaja Kuusaa (Cuqaasuu Tokkoon)',
        },
        title: {
          en: 'Auto-Generate a Ready-to-Send Supplier Order Sheet',
          am: 'ያለቁ እና የሚያልቁ መድኃኒቶችን የግዢ ዝርዝር በአንድ ንኪት ያዘጋጁ',
          om: 'Tarree Qorichoota Dhumaa Jiranii Cuqaasuu Tokkoon Qopheessi',
        },
        description: {
          en: 'Click "Restock Order Sheet" in Drug Catalog (or "Restock Sheet" on Overview). It automatically pulls every low-stock medicine, suggests Box/Pack/Unit quantities, calculates estimated wholesale cost, lets you add 45-day expiring or extra items, and exports via Copy Text (for Telegram/WhatsApp), Download PNG, or Print.',
          am: '"የግዢ ማዘዣ ወረቀት" ሲነኩ ከገደብ በታች የሆኑትን መድኃኒቶች ሁሉ በራሱ ሰብስቦ፣ የሳጥን/ፓክ ብዛትና ጠቅላላ የግዢ ዋጋ አስልቶ በጽሑፍ (ለቴሌግራም/ዋትስአፕ)፣ በPNG ወይም በወረቀት ማተም ያስችልዎታል።',
          om: '"Waraqaa Ajaja Kuusaa" tuquun qorichoota hamma akeekkachiisaa gadi jiran ofumaan walitti qaba; gatii bittaa shallagee barreeffamaan koppii gochuu, PNG buufachuu ykn maxxansuu dandeessisa.',
        },
      },
      {
        number: 5,
        roles: ['owner', 'manager'],
        targetButton: {
          en: 'Edit (Pencil) & Delete (Trash - Owner Only)',
          am: 'አስተካክል (እርሳስ) እና ሰርዝ (ባለቤት ብቻ)',
          om: 'Gulaali fi Balleessi (Abbaa Qofa)',
        },
        title: {
          en: 'Update Prices, Expiry Dates, or Remove Discontinued Items',
          am: 'ዋጋዎችን እና መረጃዎችን ያስተካክሉ ወይም ይሰርዙ',
          om: 'Gatii fi Odeeffannoo Jijjiiri ykn Haqi',
        },
        description: {
          en: 'Both Owners and Managers can edit medicine details anytime using the Edit icon on a drug row. Only the Owner can permanently delete a medicine from the catalog.',
          am: 'ባለቤቱም ሆነ ሥራ አስኪያጁ በመድኃኒቱ ረድፍ ላይ ያለውን የማስተካከያ (እርሳስ) ቁልፍ ተጠቅመው ማሻሻል ይችላሉ። መድኃኒት መሰረዝ የሚችለው ግን ባለቤቱ ብቻ ነው።',
          om: 'Abbaan Qabeenyaa fi Hogganaan qoricha kamiyyuu gulaaluu danda’u. Haquu garuu Abbaa Qabeenyaa qofatu danda’a.',
        },
      },
    ],
  },
  {
    id: 'attendance_qr',
    orderLabel: '04',
    roles: ['owner', 'manager', 'seller'],
    heroAsset: 'careHeart',
    title: {
      en: 'QR Clock-In / Clock-Out & My Portal',
      am: 'የQR ኮድ የሥራ ሰዓት መመዝገቢያ እና የሠራተኛ የግል ገጽ',
      om: 'Koodii QR Seensaa/Bahumsaa fi Fuula Dhuunfaa',
    },
    subtitle: {
      en: 'Printing clinic QR posters, scanning with the staff camera scanner, lateness rules, and checking personal sales & salary receipts.',
      am: 'የፋርማሲ QR ፖስተሮችን ማውረድ/ማተም፣ በካሜራ ስካን ማድረግ፣ የመዘግየት ስሌት እና የግል ሽያጭና ደመወዝ መመልከት።',
      om: 'Poostarii QR maxxansuu, kaameeraan iskaani gochuu, shallaggii barfachuu fi gurgurtaa/mindaa dhuunfaa ilaaluu.',
    },
    diagramTitle: {
      en: 'Staff Attendance QR & Camera Scanner Flow',
      am: 'የQR ኮድ ፖስተር እና የካሜራ ስካነር አሰራር',
      om: 'Adeemsa Poostarii QR fi Iskaana Kaameeraa',
    },
    diagramCaption: {
      en: 'Managers/Owners print the clinic QR posters; Sellers and Managers scan them with the camera upon arrival.',
      am: 'ባለቤቱ/ሥራ አስኪያጁ የQR ፖስተሩን አትመው ግድግዳ ላይ ይለጥፋሉ፤ ሠራተኞች ሲገቡና ሲወጡ በካሜራ ስካን ያደርጋሉ።',
      om: 'Abbaan/Hogganaan poostarii QR maxxansanii dhaabu; hojjettoonni yeroo dhufanii fi bahan kaameeraan iskaani godhu.',
    },
    steps: [
      {
        number: 1,
        roles: ['owner', 'manager'],
        targetButton: {
          en: 'Download QR (PNG) / Print Poster (Attendance & QR Tab)',
          am: 'QR አውርድ (PNG) / አትም (የሥራ ሰዓት እና QR ገጽ)',
          om: 'QR Buufadhu (PNG) / Maxxansi (Hordoffii Sa’aatii fi QR)',
        },
        title: {
          en: 'Download & Wall-Mount Official Clock-In & Clock-Out QRs',
          am: 'የመግቢያ እና የመውጫ QR ኮዶችን አውርደው ግድግዳ ላይ ይለጥፉ',
          om: 'Koodii QR Seensaa fi Bahumsaa Buufadhaatii Dhaabaa',
        },
        description: {
          en: 'Open "Attendance & QR". You will see two distinct encrypted clinic posters: Clock-In QR Code (green) and Clock-Out QR Code (amber). Click "Download QR (PNG)" or Print and place them at the pharmacy entrance.',
          am: '"የሥራ ሰዓት እና QR" ገጽን ይክፈቱ። የመግቢያ QR ኮድ እና የመውጫ QR ኮድ ያገኛሉ። "QR አውርድ (PNG)" ወይም አትም ነክተው በፋርማሲው መግቢያ ላይ ይለጥፉ።',
          om: '"Hordoffii Sa’aatii fi QR" banaa. Poostarii QR Seensaa fi Bahumsaa ni argitu. "QR Buufadhu (PNG)" tuquun maxxansaa balbala faarmaasiitti maxxansaa.',
        },
      },
      {
        number: 2,
        roles: ['manager', 'seller'],
        targetButton: {
          en: 'Scan QR Code (Camera-Only Verification)',
          am: 'QR ኮድ ስካን ያድርጉ (በቀጥታ ካሜራ)',
          om: 'Koodii QR Iskaani (Kaameeraa Qofaan)',
        },
        title: {
          en: 'Scan the Wall QR Using Your Live Device Camera',
          am: 'በስራ ቦታ ያለውን QR ኮድ በቀጥታ ካሜራ ስካን ያድርጉ',
          om: 'Koodii QR Dhaabbataa Kaameeraa Keessaniin Iskaani Godhaa',
        },
        description: {
          en: 'Open "My Portal & Stats" (Sellers) or use your device camera / "Scan QR Code" button. Point your camera at the pharmacy Clock-In or Clock-Out QR poster. Uploaded screenshots or unrelated QR codes are automatically rejected so attendance stays honest.',
          am: 'በግል ገጽዎ ላይ "QR ኮድ ስካን ያድርጉ" የሚለውን ይንኩና ካሜራዎን በግድግዳው QR ላይ ያቅኑ። ሌላ QR ወይም ከስልክ የተላከ ምስል ተቀባይነት የለውም።',
          om: '"Odeeffannoo fi Gurgurtaa Koo" keessatti "Koodii QR Iskaani" tuqaatii kaameeraa gara QR faarmaasiitti qabaa. QR biraa ykn suuraa hin qabu.',
        },
        tip: {
          en: 'Allow browser Camera permission when prompted so the live QR viewfinder opens immediately.',
          am: 'ስርዓቱ የካሜራ ፈቃድ ሲጠይቅ "Allow / ፍቀድ" የሚለውን ይንኩ።',
          om: 'Yeroo kaameeraan hayyama gaafatu "Allow" tuqaa.',
        },
      },
      {
        number: 3,
        roles: ['owner', 'manager', 'seller'],
        targetButton: {
          en: 'Clock In / Clock Out & Punctuality Badge',
          am: 'በሰዓቱ / ዘግይቷል የሰዓት ምልክት',
          om: 'Yeroon / Barfateera Mallattoo Sa’aatii',
        },
        title: {
          en: 'Automatic On-Time vs. Late Minutes Calculation',
          am: 'በሰዓቱ መግባት እና የመዘግየት ደቂቃ በራሱ ይሰላል',
          om: 'Shallaggii Yeroon Seenuu fi Daqiiqaa Barfachuu',
        },
        description: {
          en: 'The system compares your scan time against your assigned Scheduled Clock-In + Grace Minutes (e.g., 08:30 + 5 min). Within grace = "On Time"; past grace = "Late (+X min)". Leaving before Scheduled Clock-Out flags "Early Leave".',
          am: 'ስርዓቱ ስካን ያደረጉበትን ሰዓት ከተመደበልዎ የስራ መግቢያ ሰዓት + የምህረት ደቂቃ ጋር ያነጻጽራል። ካለፈ "ዘግይቷል (+ደቂቃ)" ብሎ ይመዘግባል።',
          om: 'Sirni sa’aatii iskaanii keessan yeroo hojii ramadame + daqiiqaa eeyyamaa waliin madaala. Yoo darbe "Barfateera (+daqiiqaa)" jedhee galmeessa.',
        },
      },
      {
        number: 4,
        roles: ['manager', 'seller'],
        targetButton: {
          en: 'My Portal & Stats (Sales, Late Days & Salary Card)',
          am: 'የግል መረጃ እና ሽያጭ (ደመወዝ እና የሰዓት መዝገብ)',
          om: 'Odeeffannoo fi Gurgurtaa Koo (Mindaa fi Sa’aatii)',
        },
        title: {
          en: 'Track Your Daily Sales & Monthly Salary Receipts',
          am: 'የዕለት ሽያጭዎን፣ የመዘግየት መጠንዎን እና የደመወዝ ክፍያዎን ይከታተሉ',
          om: 'Gurgurtaa Guyyaa, Guyyaa Barfachuu fi Nagahee Mindaa Ilaalaa',
        },
        description: {
          en: 'Workers open "My Portal & Stats" to see Today Sold, Total Orders, On-Time vs. Late Days, monthly salary amount, upcoming Payday date, and Owner-confirmed salary payment receipts.',
          am: 'ሠራተኞች "የግል መረጃ እና ሽያጭ" ገጽ ውስጥ የዛሬውን ሽያጭ፣ በሰዓቱ የገቡባቸውን ቀናት፣ የወር ደመወዛቸውን እና የክፍያ ማረጋገጫዎችን ማየት ይችላሉ።',
          om: 'Hojjettoonni "Odeeffannoo fi Gurgurtaa Koo" keessatti gurgurtaa har’aa, baay’ina guyyaa barfatanii, mindaa ji’aa fi mirkaneessa kaffaltii argachuu danda’u.',
        },
      },
    ],
  },
  {
    id: 'staff_payroll',
    orderLabel: '05',
    roles: ['owner'],
    heroAsset: 'careHeart',
    title: {
      en: 'Staff Accounts, Fayda IDs, Payroll & Owner Passwords',
      am: 'ሠራተኞች፣ የፋይዳ መታወቂያ፣ የደመወዝ ክፍያ እና የባለቤት የይለፍ ቃል',
      om: 'Hojjettoota, Waraqaa Faayidaa, Mindaa fi Jecha Iccitii Abbaa',
    },
    subtitle: {
      en: 'Managing Seller/Manager accounts, storing Fayda National IDs, paying salaries, and updating or recovering Owner passwords.',
      am: 'የሻጭ እና የሥራ አስኪያጅ መለያ መፍጠር፣ የፋይዳ መታወቂያ ፎቶ መመዝገብ፣ ደመወዝ መክፈል እና የይለፍ ቃል መቀየር።',
      om: 'Eenyummeessaa gurguraa fi hogganaa uumuu, suuraa Faayidaa olkaa’uu, mindaa kaffaluu fi jecha iccitii abbaa jijjiiruu.',
    },
    diagramTitle: {
      en: 'Staff, Fayda ID & Payroll Control Center',
      am: 'የሠራተኞች፣ የፋይዳ ID እና የደመወዝ መቆጣጠሪያ',
      om: 'To’annoo Hojjettootaa, Faayidaa fi Mindaa',
    },
    diagramCaption: {
      en: 'Owner-only tools for onboarding staff securely, verifying Fayda IDs, and confirming monthly salaries.',
      am: 'ባለቤቱ ብቻ የሚጠቀምባቸው የሠራተኛ መመዝገቢያ፣ የፋይዳ መታወቂያ እና የደመወዝ ክፍያ ቁልፎች።',
      om: 'Qabduuwwan Abbaa Qabeenyaa qofaan hojjettoota galmeessuuf, Faayidaa ilaaluu fi mindaa kaffaluuf tajaajilan.',
    },
    steps: [
      {
        number: 1,
        roles: ['owner'],
        targetButton: {
          en: 'Staff & Users -> Seller / Manager + Shift Schedule',
          am: 'ሠራተኞች እና ተጠቃሚዎች -> ሚና እና የሥራ ሰዓት',
          om: 'Hojjettootaafi Fayyadamtoota -> Gahee fi Sa’aatii',
        },
        title: {
          en: 'Create & Edit Staff Accounts, Roles & Passwords',
          am: 'የሠራተኛ መለያ ይፍጠሩ፣ የስራ ሰዓት ይመድቡ ወይም የይለፍ ቃል ይቀይሩ',
          om: 'Eenyummeessaa Hojjetaa Uumaa, Sa’aatii fi Jecha Iccitii Gulaalaa',
        },
        description: {
          en: 'In "Staff & Users", pick Seller or Manager, enter Name, Phone, Username, Password, Job Title, and individual Scheduled Clock-In/Out + Grace Minutes. Use the Edit button on any worker anytime to update details, reset their password, or Disable/Enable their access.',
          am: '"ሠራተኞች እና ተጠቃሚዎች" ውስጥ ሻጭ ወይም ሥራ አስኪያጅ መርጠው ስም፣ ስልክ፣ የተጠቃሚ ስም፣ የይለፍ ቃል እና የመግቢያ/መውጫ ሰዓት ያስገቡ። ማንኛውንም ሠራተኛ Edit በመንካት መረጃውን ወይም የይለፍ ቃሉን መቀየር ይችላሉ።',
          om: '"Hojjettootaafi Fayyadamtoota" keessatti Gurguraa ykn Hogganaa filadhaa; maqaa, bilbila, maqaa fayyadamaa, jecha iccitii fi sa’aatii galchaa. Yeroo barbaaddan "Edit" tuquun jecha iccitii isaanii jijjiiraa.',
        },
      },
      {
        number: 2,
        roles: ['owner'],
        targetButton: {
          en: 'Worker Photo + Fayda Front & Back Camera / Upload',
          am: 'የሠራተኛ ፎቶ + የፋይዳ መታወቂያ (ፊት እና ጀርባ)',
          om: 'Suuraa Hojjetaa + Faayidaa (Fuuldura fi Duuba)',
        },
        title: {
          en: 'Capture & Inspect Fayda National ID Cards',
          am: 'የሠራተኛ ፎቶ እና የፋይዳ ብሔራዊ መታወቂያ (ፊት እና ጀርባ) ያስቀምጡ',
          om: 'Suuraa Hojjetaa fi Waraqaa Faayidaa (Fuuldura & Duuba) Olkaa’aa',
        },
        description: {
          en: 'Use the Camera or Upload buttons inside the Staff form to store each worker’s Portrait, Fayda ID Front, and Fayda ID Back. Click the Eye / Inspect icon on any saved staff card to view or download high-res copies anytime.',
          am: 'በመመዝገቢያው ውስጥ የሠራተኛውን ፎቶ እና የፋይዳ መታወቂያ የፊትና የጀርባ ገጾች በካሜራ ወይም ከፋይል ያስቀምጡ። በሠራተኛው ካርድ ላይ ያለውን የዓይን ምልክት ነክተው ማየት ይችላሉ።',
          om: 'Kaameeraa ykn faayilaan suuraa hojjetaa fi Waraqaa Faayidaa fuulduraafi duuba olkaa’aa. Kaardii hojjetaa irraa mallattoo ijaa tuquun yeroo hunda ilaalaa.',
        },
      },
      {
        number: 3,
        roles: ['owner'],
        targetButton: {
          en: 'Payroll & Pay -> Confirm Paid (Telebirr / CBE / Cash)',
          am: 'የደመወዝ ክፍያ -> መከፈሉን አረጋግጥ',
          om: 'Kaffaltii Mindaa -> Kaffalamuu Mirkaneessi',
        },
        title: {
          en: 'Schedule Paydays & Confirm Monthly Salary Payments',
          am: 'የደመወዝ ቀን ይመድቡ እና ክፍያ ሲፈጸም ያረጋግጡ',
          om: 'Guyyaa Mindaa Qindeessaa fi Kaffaltii Mirkaneessaa',
        },
        description: {
          en: 'Open "Payroll & Pay" to assign Monthly Salary and Payday (1–28) per worker. When a payday is due within 3 days or overdue, Overview alerts you automatically. Tap "Confirm Paid", pick Telebirr, CBE Birr, Cash, or Bank Transfer, and add a reference number—workers immediately see "Paid" in their portal.',
          am: '"የደመወዝ ክፍያ" ውስጥ ለእያንዳንዱ ሠራተኛ ወርሃዊ ደመወዝ እና የክፍያ ቀን ይመድቡ። ቀኑ ሲደርስ "መከፈሉን አረጋግጥ" ነክተው በቴሌብር፣ CBE ወይም ጥሬ ገንዘብ መከፈሉን ይመዝግቡ።',
          om: '"Kaffaltii Mindaa" keessatti mindaa ji’aa fi guyyaa kaffaltii galchaa. Yeroo gahu "Kaffalamuu Mirkaneessi" tuquun Telebirr, CBE ykn Callaadhaan mirkaneessaa.',
        },
      },
      {
        number: 4,
        roles: ['owner'],
        targetButton: {
          en: 'Settings & Kit -> Owner Credentials & Recovery',
          am: 'ቅንብሮች -> የባለቤት የይለፍ ቃል መቀየሪያ',
          om: 'Qindaa’ina -> Jijjiirraa Jecha Iccitii Abbaa',
        },
        title: {
          en: 'Change Owner Password or Recover Access',
          am: 'የባለቤት የይለፍ ቃል መቀየር ወይም ማስመለስ',
          om: 'Jecha Iccitii Abbaa Jijjiiruu ykn Deebisuu',
        },
        description: {
          en: 'In "Settings & Kit", scroll to Owner Security Credentials to change your Owner Username or Password using your current password. If you ever get locked out, use "Forgot Owner Password?" on the Sign-In screen and call 0945206759.',
          am: 'በ"ቅንብሮች" ገጽ ውስጥ የአሁኑን የይለፍ ቃል በማስገባት የባለቤት ስም እና የይለፍ ቃል መቀየር ይችላሉ። ከተረሳ ደግሞ በመግቢያ ገጽ ላይ በ 0945206759 ይደውሉ።',
          om: '"Qindaa’ina" keessatti jecha iccitii ammaa galchuun maqaa fi jecha iccitii abbaa jijjiiraa. Yoo dagatame 0945206759 irratti bilbilaa.',
        },
      },
    ],
  },
  {
    id: 'finance_audit',
    orderLabel: '06',
    roles: ['owner'],
    heroAsset: 'pharmacyStore',
    title: {
      en: 'Profit Analytics, Expenses, Suppliers & Audit Log',
      am: 'የትርፍ ትንተና፣ ወጪዎች፣ አቅራቢዎች እና የማይበረዝ ኦዲት',
      om: 'Xiinxala Bu’aa, Baasii, Dhiyeessaa fi Odiitii',
    },
    subtitle: {
      en: 'Understanding True Net Profit, logging rent/utility expenses, managing supplier credit invoices, and auditing cashiers.',
      am: 'የተጣራ ትርፍን መከታተል፣ የኪራይና የመብራት ወጪዎችን መመዝገብ፣ የአቅራቢ ዕዳዎችን መክፈል እና የሽያጭ ኦዲት ማረጋገጥ።',
      om: 'Bu’aa Qulqulluu ilaaluu, baasiiwwan galmeessuu, liqii dhiyeessitootaa kaffaluu fi galmee odiitii mirkaneessuu.',
    },
    diagramTitle: {
      en: 'Finance & Audit Executive Suite',
      am: 'የፋይናንስ፣ የአቅራቢዎች እና የኦዲት ክፍሎች',
      om: 'Kutaalee Faayinaansii, Dhiyeessitootaa fi Odiitii',
    },
    diagramCaption: {
      en: 'Owner dashboard tabs that guard pharmacy cashflow against leakage, missing cash, or tampered records.',
      am: 'የፋርማሲውን ገንዘብ፣ ወጪ፣ ብድር እና የመዝገብ ደህንነት የሚጠብቁ የባለቤት ገጾች።',
      om: 'Kutaalee Abbaa Qabeenyaa kan maallaqa, baasii, liqii fi amanamummaa galmee eegan.',
    },
    steps: [
      {
        number: 1,
        roles: ['owner'],
        targetButton: {
          en: 'Overview -> Period Filter (Today / 7d / 30d / All) & True Net Profit',
          am: 'አጠቃላይ እይታ -> የተጣራ ትርፍ እና የጊዜ ማጣሪያ',
          om: 'Ilaalcha Waliigalaa -> Bu’aa Qulqulluu fi Filannoo Yeroo',
        },
        title: {
          en: 'Compare Gross Drug Profit vs. True Net Profit',
          am: 'የመድኃኒት ትርፍን እና ከወጪ በኋላ ያለ የተጣራ ትርፍን ይመልከቱ',
          om: 'Bu’aa Qorichaa fi Bu’aa Qulqulluu (Baasii Booda) Madaalaa',
        },
        description: {
          en: 'On Overview, filter by Today, 7 Days, 30 Days, or All Time. "Gross Drug Profit" is Selling minus Buying price; "True Net Profit" automatically subtracts clinic Expenses and paid Staff Salaries so you see real bottom-line cash.',
          am: 'በአጠቃላይ እይታ ላይ በቀን፣ በ7 ቀን፣ በ30 ቀን ወይም ሙሉውን መምረጥ ይችላሉ። "የተጣራ ትርፍ" ከመድኃኒት ትርፍ ላይ የፋርማሲ ወጪዎችን እና የሠራተኛ ደመወዝን ቀንሶ እውነተኛውን ትርፍ ያሳያል።',
          om: 'Ilaalcha Waliigalaa irratti Har’a, Guyyaa 7, Guyyaa 30 ykn Hunda filadhaa. "Bu’aa Qulqulluu" baasiiwwanii fi mindaa hojjettootaa hir’isee bu’aa dhugaa agarsiisa.',
        },
      },
      {
        number: 2,
        roles: ['owner'],
        targetButton: {
          en: 'Finance & Audit -> Expenses (+ Record Expense)',
          am: 'ወጪዎች እና ኦዲት -> ወጪዎች (+ አዲስ ወጪ)',
          om: 'Baasii fi Odiitii -> Baasiiwwan (+ Baasii Galmeessi)',
        },
        title: {
          en: 'Track Rent, Utilities, License Fees & Clinic Costs',
          am: 'የቤት ኪራይ፣ መብራት፣ ፈቃድ እና ሌሎች ወጪዎችን ይመዝግቡ',
          om: 'Kiraa Manaa, Ibsaa fi Baasiiwwan Biraa Galmeessaa',
        },
        description: {
          en: 'Inside "Finance & Audit" -> "Expenses", record outgoing clinic bills (Rent, Utilities, Packaging, Tax, Maintenance) and edit or remove entries anytime. Every expense updates True Net Profit live.',
          am: '"ወጪዎች እና ኦዲት" -> "ወጪዎች" ውስጥ የኪራይ፣ የመብራት፣ የግብር እና የጥገና ወጪዎችን ይመዝግቡ ወይም ያስተካክሉ። ወጪዎቹ በቀጥታ ከተጣራ ትርፍ ላይ ይሰላሉ።',
          om: '"Baasii fi Odiitii" -> "Baasiiwwan" keessatti kiraa, ibsaa, gibiraafi baasii biroo galmeessaa. Bu’aa Qulqulluu keessatti ofumaan hir’ata.',
        },
      },
      {
        number: 3,
        roles: ['owner'],
        targetButton: {
          en: 'Suppliers & Credit -> Invoices & Record Payment',
          am: 'አቅራቢዎች እና ብድር -> ደረሰኞች እና ክፍያ መዝግብ',
          om: 'Dhiyeessitootaa fi Liqii -> Nagahee fi Kaffaltii Galmeessi',
        },
        title: {
          en: 'Manage Wholesale Suppliers & Track Unpaid Credit Invoices',
          am: 'የጅምላ አቅራቢዎችን እና ያልተከፈሉ የብድር ደረሰኞችን ይቆጣጠሩ',
          om: 'Dhiyeessitootaa fi Nagahee Liqii Hordofaa',
        },
        description: {
          en: 'Add Suppliers with phone & TIN numbers (these also auto-fill your Restock Order Sheet!). Log credit invoices with Due Dates and record partial or full payments until each invoice reaches Paid.',
          am: 'አቅራቢዎችን ከስልክና TIN ቁጥር ጋር ይመዝግቡ (በግዢ ማዘዣ ወረቀቱ ላይም ይመጣሉ)። የብድር ደረሰኞችን እና የመጨረሻ የክፍያ ቀናትን አስገብተው በከፊልም ሆነ ሙሉ በሙሉ ሲከፍሉ ይመዝግቡ።',
          om: 'Dhiyeessitoota bilbilaafi TIN waliin galmeessaa. Nagahee liqii guyyaa xumuraa waliin galchaatii yeroo kaffaltan walakkaas ta’e guutuu galmeessaa.',
        },
      },
      {
        number: 4,
        roles: ['owner'],
        targetButton: {
          en: 'Shift Z-Reports & Tamper-Proof Audit Chain',
          am: 'የፈረቃ ገንዘብ ሪፖርት እና የማይበረዝ ኦዲት',
          om: 'Gabaasa Maallaqa Shifftii fi Galmee Odiitii',
        },
        title: {
          en: 'Inspect Cashier Cash Variances & Hash-Verified Audit Logs',
          am: 'የሻጮችን የገንዘብ ልዩነት እና የማይበረዝ የኦዲት ሰንሰለት ያረጋግጡ',
          om: 'Garaagarummaa Maallaqaa fi Galmee Odiitii Hin Jijjiiramne Mirkaneessaa',
        },
        description: {
          en: 'In "Shift Z-Reports", review each cashier’s declared drawer cash vs. expected sales (Balanced, Short, or Over). In "Tamper-Proof Audit", verify the cryptographic chain showing every login, price edit, deletion, and sale.',
          am: 'በ"የፈረቃ ገንዘብ ሪፖርት" ውስጥ የሻጮችን ቆጠራ ከሽያጩ ጋር ያነጻጽሩ (ትክክል / ጎደለ / ተረፈ)። በ"ኦዲት መዝገብ" ውስጥ ደግሞ እያንዳንዱ መግቢያ፣ የዋጋ ለውጥ እና ስረዛ በሚስጥር ቁልፍ ተጠብቆ ይታያል።',
          om: '"Gabaasa Shifftii" keessatti maallaqa gurguraan lakkaa’e fi kan sirni eegu madaalaa. "Galmee Odiitii" keessatti seenaa seensaa, jijjiirraa gatii fi haquu hunda mirkaneessaa.',
        },
      },
    ],
  },
];
