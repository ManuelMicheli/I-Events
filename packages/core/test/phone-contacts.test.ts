import { describe, expect, it } from "vitest";
import { formatPhone, phoneContactsToDrafts } from "../src";

describe("phone address book", () => {
  it("reads name, mobile number, email and a proposed service", () => {
    const { contacts } = phoneContactsToDrafts([
      {
        givenName: "Marco",
        familyName: "Rossi",
        company: "Rossi DJ Service",
        phones: [
          { number: "02 1234567", label: "work" },
          { number: "333 123 4567", label: "mobile" },
        ],
        emails: [{ address: "non valida" }, { address: "Marco@RossiDJ.it" }],
        addresses: [{ city: "" }, { city: "Milano" }],
      },
    ]);
    expect(contacts).toEqual([
      {
        name: "Marco Rossi",
        company: "Rossi DJ Service",
        role_title: undefined,
        email: "marco@rossidj.it",
        phone: "+393331234567",
        website: undefined,
        city: "Milano",
        notes: undefined,
        services: ["entertainment"],
      },
    ]);
  });

  it("falls back to the company or the number as name, skips empty cards and merges duplicates", () => {
    const { contacts, merged } = phoneContactsToDrafts([
      { company: "Vigilanza Sicura" },
      { phones: [{ number: "+39 345 000 1111" }] },
      { fullName: "  " },
      { fullName: "Anna", phones: [{ number: "345 000 1111" }], jobTitle: "Fotografa" },
    ]);
    expect(contacts.map((c) => [c.name, c.phone, c.services])).toEqual([
      ["Vigilanza Sicura", undefined, ["security"]],
      ["Anna", "+393450001111", ["media"]],
    ]);
    expect(merged).toBe(1);
  });

  it("shows phones in a readable form", () => {
    expect(formatPhone("+393331234567")).toBe("+39 333 123 4567");
    expect(formatPhone("+390212345678")).toBe("+39 02 1234 5678");
    expect(formatPhone("+39021234567")).toBe("+39 02 123 4567");
    expect(formatPhone("+390112223333")).toBe("+39 011 222 3333");
    expect(formatPhone("+442079460958")).toBe("+442079460958");
  });
});
