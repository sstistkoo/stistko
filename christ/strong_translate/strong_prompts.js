const SYSTEM_MESSAGE = `Jsi specialista na biblistiku, koine rectinu/hebrejstinu a Strongova cisla.
Prekladac Strongova slovniku do cestiny.

Odpovez JEN v tomto formatu - NIC JINEHO:
###G123###
VYZNAM: [cesky]
DEFINICE: [co nejvernejsi cesky preklad cele EN definice]
POUZITI: [refs v hranatych zavorkach]
PUVOD: [etymologie]
KJV: [preklad]
SPECIALISTA: [biblicky odborny vyklad vlastnimi slovy]

PRAVIDLA PRO DEFINICE:
- Preloz EN definici co nejpresneji, zachovej strukturu vyctu (1., 2., a), b)).
- Zachovej zavorky, stredniky, zkratky a poznamky typu "cf.", "SYN.", "opp.", pokud jsou v predloze.
- Nic nevynechavej ani nezjednodusuj do jedne kratke parafraze.
- Pokud je v EN definici vice casti, preved vsechny casti do CZ ve stejnem poradi.
- Pokud EN definice obsahuje biblicke reference v hranatych zavorkach, zachovej je i v poli DEFINICE.

PRAVIDLA PRO OSTATNI POLE:
- POUZITI: uved odkazy z EN definice jako samostatny souhrn v hranatych zavorkach.
- PUVOD: uved konkretni puvod (jazyk + koren/slovo v puvodnim pismu, je-li dostupne), ne jen obecne "z hebrejskeho" nebo "z reckeho".
- KJV: uved KJV ekvivalent, necopyruj zbytecne obsah z DEFINICE.
- SPECIALISTA: 3-5 vet, pridat kontext vyznamu v biblickem uziti; nesmi to byt jen parafraze jedne kratke vety.

ZAKAZY:
- Nepiste "ZVLASTNI:" ani jine pokyny
- "__1." nahradte cislem 1.
- "__2." nahradte cislem 2.
- "al." = "v dalsich mistech"
- HODNOTY V DEFINICI: 1., 2., 3. (CISLA, ne __1.)`;

const DEFAULT_PROMPT = `Jsi specialista na biblistiku, koine rectinu/hebrejstinu a Strongova cisla.
Preloz hesla do {TARGET_LANG} ze {SOURCE_LANG}.

Vrat JEN data, bez komentaru navic. Zachovej poradi hesel.
Pouzij pro kazde heslo presne tento format:
###G[cislo]###
VYZNAM: [kratky presny preklad]
DEFINICE: [co nejvernejsi preklad cele EN definice, vcetne zavorek a cislovani]
POUZITI: [biblicke reference v hranatych zavorkach]
PUVOD: [etymologie: z reckeho / z hebrejskeho korene]
KJV: [hlavni KJV preklad]
SPECIALISTA: [souvisly odstavec 3-5 vet, bez odrazek]

Pravidla normalizace a kvality:
- "__1." a "__2." prepis na "1." a "2."
- "al." prepis na "v dalsich mistech"
- "indecl." preloz jako "nezmenitelny"
- Nepis "ZVLASTNI:" ani jine instrukce
- V DEFINICI neparafrazuj: zachovej poradi bodu, podbodu i zavorkove vlozky.
- Nezkracuj odborny obsah: zachovej vyznam vsech casti puvodni definice (vcetne gramatickych a lexikalnich poznamek).
- Zakaz EN zbytku v DEFINICI: preloz i kratke segmenty typu "figuratively", "metaphorically", "properly", "esp.", "lit.".
- Pokud jsou reference [Mat./Mrk./...], zachovej je i v DEFINICI a soucasne je dej do POUZITI.
- V PUVOD uvadej konkretni etymologii (napr. "z heb. אֲבִיָּהוּד"), ne obecne formulace.
- SPECIALISTA nesmi byt 1 veta ani opis KJV/DEFINICE; musi pridat vecny biblicky kontext.
- Interni QA pred odevzdanim: zkontroluj, ze zadny blok neni useknuty a posledni heslo davky je kompletni.

HESLA:
{HESLA}`;

const CATEGORY_LABELS = {
  default: 'Výchozí',
  detailed: 'Detailní',
  concise: 'Stručné',
  literal: 'Doslovné',
  test: 'Test',
  custom: 'Vlastní',
  library: 'Knihovna',
  final: 'Finální'
};

const FINAL_PROMPT = {
  name: 'Finální',
  desc: 'Kompletní překlad se všemi poli',
  text: `Přelož hesla do {TARGET_LANG} ze {SOURCE_LANG} přesně a konzistentně.

Vrať pouze data, bez komentářů navíc. Zachovej pořadí hesel.
Formát pro každé heslo musí být:
###G[číslo]###
VÝZNAM: [přesný překlad]
DEFINICE: [lexikální význam a gramatika]
POUZITI: [biblické reference v hranatých závorkách]
PUVOD: [etymologie]
KJV: [hlavní KJV překlad]
SPECIALISTA: [souvislý odstavec 3-5 vět bez odrážek]

HESLA:
{HESLA}`
};

const PROMPT_LIBRARY_BASE = {
  default: [
    {
      name: 'Systémový',
      desc: 'Původní systémový prompt',
      text: DEFAULT_PROMPT
    }
  ],
  detailed: [
    {
      name: 'Vysoce detailní',
      desc: 'Hluboký překlad s all etymology',
      text: `Jsi odborník na biblické řecký a hebrejský jazyk. Přelož very carefully.

HESLA:
{HESLA}

Pro každé heslo poskytni:
1. Český význam (přesný, s考dosť)
2. Podrobná definice s gramatickými detaily
3. Etmologii a korenn slova
4. Všechny KJV překlady s kontextem
5. Biblické užití s referencemi (Strong čísla)

Formát výstupu:
###G[číslo]###
VÝZNAM: [přesný překlad]
DEFINICE: [podrobný, gramatický popis]
ETYMOLOGIE: [kořen, slovní vývin]
KJV: [všechny překlady]
VYSKYT: [umelecké reference]
`
    }
  ],
  concise: [
    {
      name: 'Stručné',
      desc: 'Krátký a jasný překlad',
      text: `Přelož do češtiny:

{HESLA}

Formát:
###G[číslo]###
VÝZNAM: [krátký význam]
DEFINICE: [stručná definice]
KJV: [překlady]
`
    }
  ],
  literal: [
    {
      name: 'Doslovné',
      desc: 'Slovo po slově překlad',
      text: `Přelož doslovně, slovo po slově:

{HESLA}

Vrať:
###G[číslo]###
VIZ: [doslovný překlad]
DEF: [lexikální definice]
KJV: [KJV translation]
`
    }
  ],
  test: [],
  custom: [],
  library: [
    {
      name: 'Přesný',
      desc: 'Vysoká přesnost a věrnost',
      text: `Jsi odborník na biblické řecký a hebrejštinu. Přelož velmi přesně a věrně.

HESLA:
{HESLA}

Vrať strictně ve formátu:
###G[číslo]###
VÝZNAM: [přesný český překlad]
DEFINICE: [podrobný popis]
KJV: [KJV překlady]

Nepřidávej žádné vysvětlení, pouze data.`
    },
    {
      name: 'Teologický',
      desc: 'S důrazem na teologický kontext',
      text: `Přelož s hlubokým porozuměním teologického kontextu.

{HESLA}

Pro každé heslo zahrň:
- Význam v kontextu Bible
- Teologické implikace
- KJV překlady
- Reference

Formát:
###G[číslo]###
VÝZNAM: [český překlad]
DEFINICE: [teologický popis]
KJV: [překlady]
KONTEXT: [biblické využití]`
    },
    {
      name: 'Rychlý',
      desc: 'Stručný a rychlý',
      text: `Rychlý překlad do češtiny.

{HESLA}

Formát:
###G[číslo]###
VÝZNAM: [věta]
DEF: [věta]
KJV: [věta]`
    }
  ]
};

const MODEL_TEST_PROMPT_CATALOG = {
  preset_v1: {
    label: 'Předdefinovaný v1 (vyvážený)',
    template: `Jsi specialista na biblistiku. Přelož tento záznam ze Strongova slovníku do češtiny s biblickým výkladem.

Pravidla:
- Přelož DEFINICI plně do češtiny (žádné anglické věty ani fráze)
- PONECHEJ: číslo Strong, řecké/hebrejské slovo, biblické odkazy ve stejném formátu
- Přidej biblický výklad vlastními slovy - vysvětli význam pro čtenáře Bible
- Zachovej strukturu s | a ,
- Pokud je vstupní KJV v angličtině, může zůstat anglicky
- V odpovědi nepoužívej markdown, pouze čistý text

Vstup:
{HESLA}

Vrať:
1. Číslo (pro přiřazení)
2. Překlad (se zachovaným formátem a biblickými odkazy)
3. Výklad (vlastními slovy pro čtenáře Bible)`
  },
  preset_v2: {
    label: 'Předdefinovaný v2 (audit striktní)',
    template: `Jsi specialista na biblistiku a překlad Strongova slovníku.

Tvůj úkol: přeložit VŠECHNA hesla ze vstupu přesně do češtiny a vrátit je ve STRIKTNÍM formátu.

Povinná pravidla:
- Musíš vrátit všechny položky vstupu, žádnou nesmíš vynechat.
- Zachovej číslo Strong, řecké/hebrejské slovo a biblické odkazy ve stejném tvaru.
- Pro KAŽDÉ heslo vrať přesně tento blok:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...
- Nevkládej žádný text mimo tyto bloky.
- Žádná pole nenechávej prázdná; pokud je údaj nejistý, napiš krátce "neuvedeno ve zdroji".
- SPECIALISTA napiš jako 2-4 věty souvislého biblického výkladu.

Vstup:
{HESLA}`
  },
  preset_v3: {
    label: 'Předdefinovaný v3 (anti-prázdná pole)',
    template: `Jsi specialista na biblistiku a lexikální překlad Strongova slovníku.

Tvůj cíl: maximální parsovatelnost + nulová prázdná pole.

Pravidla:
- Vrať všechna hesla ze vstupu.
- Použij přesně tento blok pro každé heslo:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...
- Žádné pole nesmí být prázdné.
- Když údaj není jistý, napiš: neuvedeno ve zdroji.
- DEFINICE musí být česky (KJV může být anglicky).
- Nevkládej žádný text mimo bloky.

Vstup:
{HESLA}`
  },
  preset_v4: {
    label: 'Předdefinovaný v4 (CZ-first terminologie)',
    template: `Jsi odborník na biblickou řečtinu/hebrejštinu a českou terminologii.

Pravidla:
- Zachovej řecké/hebrejské lemma, Strong číslo a odkazy.
- DEFINICE převeď do přirozené češtiny, ale odborné termíny ponech v závorce.
- POUZITI vypiš jen ověřitelné odkazy; pokud chybí, napiš "neuvedeno ve zdroji".
- PUVOD uveď stručně (1 věta).
- SPECIALISTA napiš 2-3 věty, bez opakování definice.
- Striktní výstupní blok:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Vstup:
{HESLA}`
  },
  preset_v5: {
    label: 'v5 - Úplnost všech polí (včetně Biblický výklad / specialista)',
    template: `Jsi překladový engine pro Strong slovník optimalizovaný pro model Groq Llama 4.

Hlavní cíl: vrátit kompletní, plně vyplněný výstup pro každé heslo.

Povinná pravidla:
- Vrať všechna hesla, žádné nevynechej.
- Všechna pole musí být vyplněná; nic nenechávej prázdné.
- Když něco nevíš, napiš přesně: neuvedeno ve zdroji.
- DEFINICE musí být plně česky (KJV může zůstat anglicky).
- Nevracej žádný text mimo bloky.
- Striktně:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Vstup:
{HESLA}`
  },
  preset_v6: {
    label: 'v6 - DETAIL: DEFINICE česky (bez EN vět)',
    template: `Jsi biblický lexikální překladatel. Překládáš Strong hesla do češtiny.

Priorita kvality:
1) DEFINICE musí být česky, přirozeně, bez anglických vět.
2) Zachovej řecké/hebrejské lemma, číslo Strong a odkazy.
3) Každé pole vyplň, jinak napiš: neuvedeno ve zdroji.

Zakázáno:
- Anglické věty v poli DEFINICE.
- Text mimo definované bloky.

Povinný formát:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Vstup:
{HESLA}`
  },
  preset_v7: {
    label: 'v7 - DETAIL: Striktní formát bloků (parser-safe)',
    template: `Jsi "audit-safe" překladač pro Strong slovník.

Tvůj výstup bude strojově parsován. Dodrž přesně:
- Každé heslo začíná řádkem ###Gx###.
- Poté přesně 6 řádků v pořadí: VYZNAM, DEFINICE, POUZITI, PUVOD, KJV, SPECIALISTA.
- Každé pole je jednořádkové, bez odrážek.
- Žádná pole nejsou prázdná. Fallback: neuvedeno ve zdroji.
- DEFINICE česky; KJV může být anglicky.
- Žádný dodatečný text před/po blocích.

Přesný formát:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Vstup:
{HESLA}`
  },
  preset_v8: {
    label: 'v8 - DETAIL: DEFINICE 100% CZ (hard anti-EN)',
    template: `Jsi biblický překladový model. Optimalizace pro Groq Llama 4.

Kritický požadavek:
- DEFINICE musí být 100% česky. Žádná anglická slova ani anglické věty.
- Výjimka: řecké/hebrejské lemma a biblické odkazy.

Když narazíš na anglický segment ve vstupu:
- přelož ho do češtiny se stejným významem.
- neponechávej "which see", "indecl.", "only in", "used in", "see word" apod.

Formát (přesně):
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Povinně:
- Žádné prázdné pole. Fallback: neuvedeno ve zdroji.
- Žádný text mimo bloky.

Vstup:
{HESLA}`
  },
  preset_v9: {
    label: 'v9 - DETAIL: Překlad EN segmentů v DEFINICI',
    template: `Jsi editor slovníkového překladu Strong hesel do češtiny.

Postup pro každé heslo:
1) Zachovej číslo Strong, lemma a odkazy.
2) V DEFINICE přelož všechny anglické segmenty do češtiny.
3) Pokud je část nejasná, napiš konzervativně česky + "neuvedeno ve zdroji".

Kontrola před odesláním:
- DEFINICE neobsahuje běžná EN slova (the, and, only, used, see, in, with, from, not).
- Všech 6 polí je vyplněno.

Přesný výstup:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Vstup:
{HESLA}`
  },
  preset_v10: {
    label: 'v10 - DETAIL: QA self-check + Biblický výklad (specialista)',
    template: `Jsi překladový QA model pro Strong slovník.

Nejdřív interně přelož, pak interně proveď QA kontrolu a teprve poté vrať odpověď.
Interní QA pravidla:
- Každé heslo má blok ###Gx### a 6 povinných polí.
- DEFINICE je česky (kromě lemma a odkazů).
- Pokud v DEFINICE zůstane anglické slovo, oprav ho do češtiny.
- Žádné prázdné pole; fallback: neuvedeno ve zdroji.

Navenek vrať pouze finální bloky:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Vstup:
{HESLA}`
  },
  preset_v11: {
    label: 'Předdefinovaný v11 (Groq: ALL-IN-ONE)',
    template: `Jsi biblický lexikální překladový model optimalizovaný pro Groq Llama 4.

Cíl: maximální kvalita překladu + maximální parsovatelnost auditu.

ALL-IN-ONE pravidla (povinná):
1) Vrať všechna hesla, žádné nevynechej.
2) Striktně použij blok pro každé heslo:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...
3) Žádné pole nesmí být prázdné. Fallback vždy: neuvedeno ve zdroji.
4) DEFINICE musí být 100% česky (výjimka: lemma, řecké/hebrejské tvary, biblické odkazy).
5) V DEFINICE neponechávej anglické segmenty typu "which see", "indecl.", "used in", "only in", "see word", "without", "not".
6) KJV může být anglicky.
7) SPECIALISTA napiš 2-4 věty, věcně, bez opakování celé definice.
8) Žádný text před bloky, mezi bloky ani po blocích.

Interní QA před odevzdáním (NEVYPISUJ):
- Zkontroluj, že každý blok má přesně 6 řádků polí.
- Zkontroluj, že žádná hodnota není prázdná.
- Zkontroluj, že DEFINICE neobsahuje běžná anglická slova.
- Pokud kontrola neprojde, oprav a teprve pak vrať finální odpověď.

Vstup:
{HESLA}`
  },
  preset_v12: {
    label: 'TOP ⭐ v12 (Groq: anti-EN normalizace)',
    template: `You are a biblical lexical translation model optimized for Groq Llama 4.

Task:
- Translate all entries from {SOURCE_LANG} to {TARGET_LANG}.
- Preserve Strong number, lemma, and scripture references.
- Return strict machine-parsable blocks only.

Required output format (for each entry):
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Hard rules:
1) DEFINICE must be fully in {TARGET_LANG} (exceptions: lemma/original script and references).
2) Do not leave English leftovers such as: "which see", "indecl.", "used in", "only in", "see word", "without", "not", "alpha".
3) Normalize common terms for target-language readability (e.g. avoid unexplained abbreviations like NT/LXX).
4) Keep full lexical meaning; do not compress or omit grammatical/lexical nuances.
5) No empty fields; fallback must be: neuvedeno ve zdroji.
6) No text outside the required blocks.
7) SPECIALISTA must be a concise 2-4 sentence paragraph, non-redundant.

Internal QA before final answer (do not print):
- each block has all 6 fields,
- no empty field values,
- DEFINICE is in {TARGET_LANG},
- last block is complete and not truncated.

Input:
{HESLA}`
  },
  preset_v13: {
    label: 'Předdefinovaný v13 (Groq: anti-EN + anti-truncace)',
    template: `Jsi audit-safe překladač Strong hesel do češtiny. Priorita: úplnost + čeština v DEFINICE + stabilní formát.

Vrať pro KAŽDÉ heslo přesně:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Tvrdá pravidla:
1) Vrať všechna hesla ze vstupu, ve stejném pořadí.
2) DEFINICE musí být česky; výjimky: lemma, řecké/hebrejské tvary, odkazy.
3) Neponechávej EN segmenty: "which see", "indecl.", "used in", "only in", "see word", "without", "not", "a district", "beloved", "to love", "to rejoice".
4) Normalizace:
   - indecl. -> nesklonné
   - LXX -> Septuaginta
   - NT -> Nový zákon
   - alpha -> alfa
5) Nezkracuj lexikální obsah: převeď do češtiny, ale zachovej věcnou informaci.
6) Žádné prázdné pole; fallback: neuvedeno ve zdroji.
7) Žádný text mimo bloky.

Interní QA před odevzdáním (nevypisuj):
- počet bloků = počet vstupních hesel,
- poslední blok je kompletní a neuseknutý,
- každý blok má 6 vyplněných polí,
- DEFINICE je bez zakázaných EN výrazů.

Vstup:
{HESLA}`
  },
  preset_v14: {
    label: '🔥 v14 HARD (Definice CZ strict)',
    template: `Jsi audit-safe překladač Strong hesel do češtiny.
Priorita #1: DEFINICE musí být kvalitní čeština, ne parafráze ani zbytky EN.

Vrať pro KAŽDÉ heslo přesně:
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

TVRDÁ PRAVIDLA (bez výjimky):
1) Vrať všechna hesla ze vstupu ve stejném pořadí.
2) DEFINICE:
   - musí být plně česky (výjimka: lemma, původní písmo, biblické odkazy),
   - minimálně 8 slov a minimálně 60 znaků,
   - nesmí být zkrácená na obecné fráze typu "podobný základu",
   - nesmí obsahovat UI/artefakt texty typu "Prompt", "Upravit", "klik", "button".
3) Zakázané EN výrazy v DEFINICE:
   "which see", "indecl.", "used in", "only in", "see word", "without", "not", "metaphorically", "properly".
4) Normalizace termínů:
   - indecl. -> nesklonné
   - NT -> Nový zákon
   - LXX -> Septuaginta
   - alpha -> alfa
5) Nevynechávej odborné části definice (gramatika, lexikální nuance, poznámky, závorky).
6) Žádné prázdné pole; fallback vždy: neuvedeno ve zdroji.
7) Žádný text mimo bloky.
8) SPECIALISTA musí být 2-4 věty a nesmí jen opakovat DEFINICE.

Interní QA před odevzdáním (nevypisuj):
- počet bloků = počet vstupních hesel,
- každý blok má všech 6 polí,
- každé pole je vyplněné,
- DEFINICE splňuje min. délku a neobsahuje zakázané EN výrazy,
- poslední blok dávky není useknutý.

Vstup:
{HESLA}`
  },
  preset_v15: {
    label: 'v15 - CZ klasika (osvědčený)',
    template: `Jsi biblický lexikální překladatel optimalizovaný pro Groq Llama 4.

Úkol:
- Přelož všechna hesla do češtiny.
- Zachovej číslo Strong, lemma a odkazy.
- Vrať pouze striktní bloky.

Povinný formát (pro každé heslo):
###Gx###
VYZNAM: ...
DEFINICE: ...
POUZITI: ...
PUVOD: ...
KJV: ...
SPECIALISTA: ...

Tvrdá pravidla:
1) DEFINICE musí být česky (výjimka: lemma, odkazy, hebrejština/řečtina).
2) Nesmí zůstat výrazy: "which see", "indecl.", "NT", "LXX", "used in", "only in", "see word", "without", "not", "alpha".
3) Normalizace termínů:
   - alpha -> alfa
   - indecl. -> nesklonné
   - NT -> Nový zákon
   - LXX -> Septuaginta
4) Nezkracuj odborný obsah: zachovej význam všech částí původní definice (včetně gramatických a lexikálních poznámek).
5) Žádné prázdné pole; fallback vždy: neuvedeno ve zdroji.
6) Žádný text mimo bloky.
7) SPECIALISTA 2-4 věty, stručně a věcně.

Interní kontrola před vrácením (nevypisuj):
- každý blok má 6 polí,
- žádné pole není prázdné,
- DEFINICE neobsahuje zakázané EN výrazy,
- žádný blok není useknutý a poslední heslo dávky je kompletní.

Vstup:
{HESLA}`
  },
  preset_topic_definice: {
    label: 'Téma: Definice',
    topicLabel: 'Definice',
    template: `Úkol: vytvoř pouze pole DEFINICE pro jedno heslo Strong.

Pravidla:
- Vrať jen finální text definice v češtině (bez labelu, bez markdownu, bez dalších polí).
- Zachovej věcný význam, gramatické informace a lexikální nuance.
- Nepoužívej anglické výplňové fráze (which see, used in, only in, indecl., see word).
- Pokud zdroj nestačí, napiš: neuvedeno ve zdroji.

Vstup:
{HESLA}`
  },
  preset_topic_vyznam: {
    label: 'Téma: Význam',
    topicLabel: 'Význam',
    template: `Úkol: vytvoř pouze pole VYZNAM pro jedno heslo Strong.

Pravidla:
- Vrať jen finální text českého významu (bez labelu, bez markdownu, bez dalších polí).
- Stručně a přesně (typicky 2-8 slov).
- Bez anglických zbytků.
- Pokud není význam jistý, napiš: neuvedeno ve zdroji.

Vstup:
{HESLA}`
  },
  preset_topic_kjv: {
    label: 'Téma: KJV překlady',
    topicLabel: 'KJV překlady',
    template: `Úkol: vytvoř pouze pole KJV pro jedno heslo Strong.

Pravidla:
- Vrať jen finální text KJV překladu (bez labelu, bez markdownu, bez dalších polí).
- Uveď hlavní český ekvivalent(y) odpovídající KJV použití.
- Bez dlouhých parafrází, bez komentáře.
- Pokud zdroj chybí, napiš: neuvedeno ve zdroji.

Vstup:
{HESLA}`
  },
  preset_topic_pouziti: {
    label: 'Téma: Biblické užití',
    topicLabel: 'Biblické užití',
    template: `Úkol: vytvoř pouze pole POUZITI pro jedno heslo Strong.

Pravidla:
- Vrať jen finální text biblického užití (bez labelu, bez markdownu, bez dalších polí).
- Preferuj konkrétní biblické odkazy v hranatých závorkách.
- Nic nevymýšlej; jen údaje podložené vstupem.
- Pokud nejsou data, napiš: neuvedeno ve zdroji.

Vstup:
{HESLA}`
  },
  preset_topic_puvod: {
    label: 'Téma: Původ / Etymologie',
    topicLabel: 'Původ / Etymologie',
    template: `Úkol: vytvoř pouze pole PUVOD pro jedno heslo Strong.

Pravidla:
- Vrať jen finální text etymologie (bez labelu, bez markdownu, bez dalších polí).
- Uveď jazyk + kořen/slovní základ, pokud je dostupný.
- Piš stručně a věcně.
- Pokud zdroj nestačí, napiš: neuvedeno ve zdroji.

Vstup:
{HESLA}`
  },
  preset_topic_specialista: {
    label: 'Téma: Biblický výklad (specialista)',
    topicLabel: 'Biblický výklad (specialista)',
    template: `Úkol: vytvoř pouze pole SPECIALISTA pro jedno heslo Strong.

Pravidla:
- Vrať jen finální text (bez labelu, bez markdownu, bez dalších polí).
- Napiš souvislý odstavec 3-5 vět.
- Přidej stručný biblický a teologický kontext.
- Neopakuj mechanicky definici ani KJV.
- Pokud chybí podklady, napiš: neuvedeno ve zdroji.

Vstup:
{HESLA}`
  },
  preset_topic_definice_batch: {
    label: 'Téma: Definice — dávka',
    topicLabel: 'Definice',
    template: `Úkol: vytvoř pouze pole DEFINICE pro více hesel Strong najednou.

Pravidla:
- Vrať jen DEFINICE pro každé heslo, nic jiného.
- Nepoužívej anglické výplňové fráze (which see, used in, only in, indecl., see word).
- Pokud zdroj nestačí, napiš: neuvedeno ve zdroji.

Povinný výstup (pro každé heslo zvlášť, v tomto pořadí):
###Gx###
DEFINICE: ...

Poznámka:
- Řádek ###Gx### musí být přesně podle klíče z vstupu (G/H + číslo).

Vstup:
{HESLA}`
  },
  preset_topic_vyznam_batch: {
    label: 'Téma: Význam — dávka',
    topicLabel: 'Význam',
    template: `Úkol: vytvoř pouze pole VYZNAM pro více hesel Strong najednou.

Pravidla:
- Vrať jen VYZNAM pro každé heslo, nic jiného.
- Stručně a přesně (typicky 2-8 slov).
- Pokud není význam jistý, napiš: neuvedeno ve zdroji.

Povinný výstup:
###Gx###
VYZNAM: ...

Vstup:
{HESLA}`
  },
  preset_topic_kjv_batch: {
    label: 'Téma: KJV překlady — dávka',
    topicLabel: 'KJV překlady',
    template: `Úkol: vytvoř pouze pole KJV pro více hesel Strong najednou.

Pravidla:
- Vrať jen KJV pro každé heslo, nic jiného.
- Uveď hlavní český ekvivalent(y) odpovídající KJV použití.
- Pokud zdroj chybí, napiš: neuvedeno ve zdroji.

Povinný výstup:
###Gx###
KJV: ...

Vstup:
{HESLA}`
  },
  preset_topic_pouziti_batch: {
    label: 'Téma: Biblické užití — dávka',
    topicLabel: 'Biblické užití',
    template: `Úkol: vytvoř pouze pole POUZITI pro více hesel Strong najednou.

Pravidla:
- Vrať jen POUZITI pro každé heslo, nic jiného.
- Preferuj konkrétní biblické odkazy v hranatých závorkách.
- Nic nevymýšlej; jen údaje podložené vstupem.
- Pokud nejsou data, napiš: neuvedeno ve zdroji.

Povinný výstup:
###Gx###
POUZITI: ...

Vstup:
{HESLA}`
  },
  preset_topic_puvod_batch: {
    label: 'Téma: Původ / Etymologie — dávka',
    topicLabel: 'Původ / Etymologie',
    template: `Úkol: vytvoř pouze pole PUVOD pro více hesel Strong najednou.

Pravidla:
- Vrať jen PUVOD pro každé heslo, nic jiného.
- Piš stručně a věcně.
- Pokud zdroj nestačí, napiš: neuvedeno ve zdroji.

Povinný výstup:
###Gx###
PUVOD: ...

Vstup:
{HESLA}`
  },
  preset_topic_specialista_batch: {
    label: 'Téma: Biblický výklad (specialista) — dávka',
    topicLabel: 'Biblický výklad (specialista)',
    template: `Úkol: vytvoř pouze pole SPECIALISTA pro více hesel Strong najednou.

Pravidla:
- Vrať jen SPECIALISTA pro každé heslo, nic jiného.
- Napiš souvislý odstavec 3-5 vět.
- Přidej stručný biblický a teologický kontext.
- Neopakuj mechanicky definici ani KJV.
- Pokud chybí podklady, napiš: neuvedeno ve zdroji.

Povinný výstup:
###Gx###
SPECIALISTA: ...

Vstup:
{HESLA}`
  },
  preset_topic_vyznam_en: {
    label: 'Téma: Český význam (En)',
    topicLabel: 'Český význam (En)',
    template: `Task: produce only the VYZNAM field for one Strong entry.

Rules:
- Return only the final value text (no label, no markdown, no extra fields).
- Write the output in {TARGET_LANG}.
- Keep it concise and accurate (typically 2-8 words).
- If meaning is uncertain, return a short phrase in {TARGET_LANG} equivalent to "not provided in source".

Input:
{HESLA}`
  },
  preset_topic_definice_en: {
    label: 'Téma: Definice (En)',
    topicLabel: 'Definice (En)',
    template: `Task: produce only the DEFINICE field for one Strong entry.

Rules:
- Return only the final definition text (no label, no markdown, no extra fields).
- Write the output in {TARGET_LANG}.
- Preserve lexical meaning, grammar details, and nuance.
- Avoid untranslated source-language fragments.
- If source evidence is insufficient, return a short phrase in {TARGET_LANG} equivalent to "not provided in source".

Input:
{HESLA}`
  },
  preset_topic_kjv_en: {
    label: 'Téma: KJV překlady (En)',
    topicLabel: 'KJV překlady (En)',
    template: `Task: produce only the KJV field for one Strong entry.

Rules:
- Return only the final KJV-equivalent value (no label, no markdown, no extra fields).
- Write the output in {TARGET_LANG}.
- Give the main equivalent(s) matching KJV usage.
- No long paraphrases or commentary.
- If source data is missing, return a short phrase in {TARGET_LANG} equivalent to "not provided in source".

Input:
{HESLA}`
  },
  preset_topic_pouziti_en: {
    label: 'Téma: Biblické užití (En)',
    topicLabel: 'Biblické užití (En)',
    template: `Task: produce only the POUZITI field for one Strong entry.

Rules:
- Return only the final usage text (no label, no markdown, no extra fields).
- Write the output in {TARGET_LANG}.
- Prefer concrete scripture references in square brackets.
- Do not invent data; use only what is supported by input.
- If evidence is missing, return a short phrase in {TARGET_LANG} equivalent to "not provided in source".

Input:
{HESLA}`
  },
  preset_topic_puvod_en: {
    label: 'Téma: Původ / Etymologie (En)',
    topicLabel: 'Původ / Etymologie (En)',
    template: `Task: produce only the PUVOD field for one Strong entry.

Rules:
- Return only the final etymology text (no label, no markdown, no extra fields).
- Write the output in {TARGET_LANG}.
- Include language + root/word base when available.
- Keep it concise and factual.
- If source evidence is insufficient, return a short phrase in {TARGET_LANG} equivalent to "not provided in source".

Input:
{HESLA}`
  },
  preset_topic_specialista_en: {
    label: 'Téma: Biblický výklad (specialista) (En)',
    topicLabel: 'Biblický výklad (specialista) (En)',
    template: `Task: produce only the SPECIALISTA field for one Strong entry.

Rules:
- Return only the final text (no label, no markdown, no extra fields).
- Write the output in {TARGET_LANG}.
- Use one coherent paragraph of 3-5 sentences.
- Add concise biblical/theological context.
- Do not mechanically repeat DEFINICE or KJV.
- If source support is insufficient, return a short phrase in {TARGET_LANG} equivalent to "not provided in source".

Input:
{HESLA}`
  }
};

export {
  SYSTEM_MESSAGE,
  DEFAULT_PROMPT,
  CATEGORY_LABELS,
  FINAL_PROMPT,
  PROMPT_LIBRARY_BASE,
  MODEL_TEST_PROMPT_CATALOG
};

export default {
  SYSTEM_MESSAGE,
  DEFAULT_PROMPT,
  CATEGORY_LABELS,
  FINAL_PROMPT,
  PROMPT_LIBRARY_BASE,
  MODEL_TEST_PROMPT_CATALOG
};
