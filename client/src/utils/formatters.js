export const formatPhoneNumber = (value) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  let formatted = cleaned;
  if (cleaned.length > 0) {
    const matches = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!matches) return cleaned;
    formatted =
      matches[1] +
      (matches[2] ? "-" + matches[2] : "") +
      (matches[3] ? "-" + matches[3] : "");
  }
  return formatted;
};

export const unformatPhoneNumber = (value) => {
  return value ? value.replace(/-/g, "") : "";
};
