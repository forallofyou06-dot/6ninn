export function splitFullName(fullName: string | null | undefined) {
  const [lastName = "", ...givenNameParts] = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { lastName, firstName: givenNameParts.join(" ") };
}

export function joinFullName(lastName: string, firstName: string) {
  return `${lastName.trim()} ${firstName.trim()}`;
}
