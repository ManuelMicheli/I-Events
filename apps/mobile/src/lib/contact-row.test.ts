import { describe, expect, it } from "vitest";
import { contactRow, type Fields } from "./contact-row";

const empty: Record<Fields, string> = { name: "", company: "", role_title: "", city: "", phone: "", email: "", website: "", notes: "" };

describe("contact form", () => {
  it("normalizes phone and email and turns blanks into null", () => {
    const { row, errors } = contactRow({ ...empty, name: " Luca Bianchi ", phone: "333 123 4567", email: "Luca@SecurPoint.it " }, ["security"], 4);
    expect(errors).toBeUndefined();
    expect(row).toEqual({
      name: "Luca Bianchi",
      company: null,
      role_title: null,
      city: null,
      website: null,
      notes: null,
      phone: "+393331234567",
      email: "luca@securpoint.it",
      services: ["security"],
      rating: 4,
    });
  });

  it("names each wrong field", () => {
    const { row, errors } = contactRow({ ...empty, phone: "abc", email: "not-an-email" }, [], null);
    expect(row).toBeUndefined();
    expect(errors).toMatchObject({ name: "Inserisci un nome", phone: "Telefono non valido", email: "Email non valida" });
  });
});
