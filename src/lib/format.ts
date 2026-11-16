const DATE_FORMATTER = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const MINUTE_FORMATTER = new Intl.NumberFormat("es", {
  style: "unit",
  unit: "minute",
  unitDisplay: "long",
});

const HOUR_FORMATTER = new Intl.NumberFormat("es", {
  style: "unit",
  unit: "hour",
  unitDisplay: "long",
});

export function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return DATE_FORMATTER.format(date);
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const remainingMinutes = total % 60;

  if (hours === 0) {
    return MINUTE_FORMATTER.format(remainingMinutes);
  }
  if (remainingMinutes === 0) {
    return HOUR_FORMATTER.format(hours);
  }
  return `${HOUR_FORMATTER.format(hours)} ${MINUTE_FORMATTER.format(
    remainingMinutes,
  )}`;
}
