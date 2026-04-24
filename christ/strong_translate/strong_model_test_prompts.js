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
  preset_topic_definice: {
    label: 'Téma: Definice (CZ)',
    topicLabel: 'Definice (CZ)',
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
    label: 'Téma: Český význam',
    topicLabel: 'Český význam',
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
    label: 'Téma: KJV překlady (CZ)',
    topicLabel: 'KJV překlady (CZ)',
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
  }
};

export default MODEL_TEST_PROMPT_CATALOG;
