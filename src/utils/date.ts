export function combineDateWithCurrentTime(date: string) {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return new Date().toISOString()
  }

  const now = new Date()
  const withTime = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  )

  return withTime.toISOString()
}