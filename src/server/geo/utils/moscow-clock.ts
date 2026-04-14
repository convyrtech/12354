export function parseClockMinutes(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function getMoscowTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return {
    hour,
    minute,
    label: `${hour}:${minute}`,
    minutesSinceMidnight: Number(hour) * 60 + Number(minute),
  };
}

export function isPastMoscowCutoff(clock: string | null, date = new Date()) {
  const cutoffMinutes = parseClockMinutes(clock);

  if (cutoffMinutes === null) {
    return false;
  }

  return getMoscowTimeParts(date).minutesSinceMidnight > cutoffMinutes;
}
