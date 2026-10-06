import { describe, expect, it } from "vitest";
import {
  classifyServices,
  dedupeContacts,
  guessColumns,
  keywordClassifier,
  normalizeEmail,
  normalizePhone,
  parseCsv,
  parseText,
  parseVcard,
  rowsToContacts,
  whatsappUrl,
} from "../src";

describe("normalization", () => {
  it("puts phones in international format", () => {
    expect(normalizePhone("333 123 4567")).toBe("+393331234567");
    expect(normalizePhone("+39 02 1234567")).toBe("+39021234567");
    expect(normalizePhone("0039 333.123.4567")).toBe("+393331234567");
    expect(normalizePhone("02-1234567")).toBe("+39021234567");
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhone("tel:+393331234567")).toBe("+393331234567");
    expect(normalizePhone("1234")).toBeUndefined();
    expect(normalizePhone("n/d")).toBeUndefined();
    expect(whatsappUrl("+393331234567")).toBe("https://wa.me/393331234567");
  });

  it("validates emails", () => {
    expect(normalizeEmail(" Info@Sicura.IT ")).toBe("info@sicura.it");
    expect(normalizeEmail("mailto:a@b.it")).toBe("a@b.it");
    expect(normalizeEmail("non disponibile")).toBeUndefined();
  });
});

describe("service classification", () => {
  it("recognizes event suppliers from Italian and English words", () => {
    expect(classifyServices("DJ Marco - musica per eventi")).toEqual(["entertainment"]);
    expect(classifyServices("Vigilanza Lombarda srl")).toEqual(["security"]);
    expect(classifyServices("Service audio luci e ledwall")).toEqual(["av"]);
    expect(classifyServices("Catering service")).toEqual(["catering"]);
    expect(classifyServices("Impresa di pulizie")).toEqual(["cleaning"]);
    expect(classifyServices("Hostess e promoter")).toEqual(["staffing"]);
    expect(classifyServices("Fotografo e videomaker")).toEqual(["media"]);
    expect(classifyServices("Pratiche SIAE")).toEqual(["permits"]);
    expect(classifyServices("Villa Reale - location matrimoni")).toEqual(["venue"]);
    expect(classifyServices("Mario Bianchi")).toEqual([]);
  });

  it("is pluggable", async () => {
    const out = await keywordClassifier.classify([{ name: "Luca", services: [] }], ["security"]);
    expect(out).toEqual([["security"]]);
  });
});

describe("tables", () => {
  it("parses Italian Excel CSV with semicolons, quotes and a BOM", () => {
    const rows = parseCsv('﻿Nome;Azienda;Cellulare;Note\n"Rossi; Marco";"DJ ""Night""";333 1234567;"riga1\nriga2"\n\n');
    expect(rows).toEqual([
      ["Nome", "Azienda", "Cellulare", "Note"],
      ["Rossi; Marco", 'DJ "Night"', "333 1234567", "riga1\nriga2"],
    ]);
  });

  it("guesses columns from Italian headers and Google exports", () => {
    expect(guessColumns(["Nome", "Cognome", "Ragione sociale", "E-mail", "Cellulare", "Telefono", "Categoria", "Città"])).toEqual([
      "first_name", "last_name", "company", "email", "phone", "ignore", "category", "city",
    ]);
    expect(guessColumns(["First Name", "Last Name", "Organization Name", "Organization Title", "E-mail 1 - Value", "Phone 1 - Value", "Labels"])).toEqual([
      "first_name", "last_name", "company", "role_title", "email", "phone", "category",
    ]);
    expect(guessColumns(["Referente", "Sito web", "Colonna strana"])).toEqual(["name", "website", "ignore"]);
  });

  it("turns rows into contacts with proposed services", () => {
    const { contacts, hints } = rowsToContacts(
      [
        ["Marco", "Rossi", "", "333 1234567", "DJ"],
        ["", "", "Sicura Srl", "02 99887766", "Sicurezza"],
        ["", "", "", "", ""],
      ],
      ["first_name", "last_name", "company", "phone", "category"],
    );
    expect(contacts).toEqual([
      { name: "Marco Rossi", phone: "+393331234567", services: ["entertainment"], company: undefined, role_title: undefined, email: undefined, website: undefined, city: undefined, notes: undefined },
      { name: "Sicura Srl", phone: "+390299887766", services: ["security"], company: undefined, role_title: undefined, email: undefined, website: undefined, city: undefined, notes: undefined },
    ]);
    expect(hints).toEqual(["DJ", "Sicurezza"]);
  });
});

describe("vCard", () => {
  it("reads phone exports with folded lines and grouped properties", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Bianchi;Luca;;;",
      "FN:Luca Bianchi",
      "ORG:Luci & Suoni Srl;",
      "item1.TEL;type=CELL:+39 333 9",
      " 876543",
      "EMAIL;type=INTERNET:luca@luciesuoni.it",
      "ADR;TYPE=WORK:;;Via Roma 1;Bergamo;BG;24100;Italia",
      "CATEGORIES:Service audio",
      "END:VCARD",
      "BEGIN:VCARD",
      "N:;;;;",
      "END:VCARD",
    ].join("\r\n");
    const { contacts } = parseVcard(vcf);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ name: "Luca Bianchi", company: "Luci & Suoni Srl", phone: "+393339876543", email: "luca@luciesuoni.it", city: "Bergamo", services: ["av"] });
  });
});

describe("pasted text", () => {
  it("finds name, phone and email on each line", () => {
    const { contacts } = parseText("Marco Rossi DJ - 333 123 4567 - marco@dj.it\n\nSecurity Milano, 02 1234567\nsolo testo");
    expect(contacts.map((c) => [c.name, c.phone, c.email, c.services])).toEqual([
      ["Marco Rossi DJ", "+393331234567", "marco@dj.it", ["entertainment"]],
      ["Security Milano", "+39021234567", undefined, ["security"]],
      ["solo testo", undefined, undefined, []],
    ]);
  });
});

describe("dedupe", () => {
  it("merges contacts that share an email or a phone", () => {
    const { contacts, merged } = dedupeContacts([
      { name: "Marco", phone: "+393331234567", services: ["entertainment"] },
      { name: "Marco Rossi", phone: "+393331234567", email: "m@dj.it", services: ["av"] },
      { name: "M. Rossi", email: "m@dj.it", city: "Milano", services: [] },
      { name: "Altro", services: [] },
    ]);
    expect(merged).toBe(2);
    expect(contacts).toHaveLength(2);
    expect(contacts[0]).toMatchObject({ name: "Marco", email: "m@dj.it", city: "Milano", services: ["entertainment", "av"] });
  });
});
