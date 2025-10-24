import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

/**
 * Zwraca nazwę dnia tygodnia po polsku
 */
export function getDayOfWeek(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'EEEE', { locale: pl })
}

/**
 * Formatuje datę do postaci "15 stycznia 2024"
 */
export function formatDate(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'd MMMM yyyy', { locale: pl })
}

/**
 * Formatuje dzień (liczba) dla badge
 */
export function formatDay(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'd')
}

/**
 * Formatuje zakres dat "15 sty - 21 sty 2024"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  return `${format(start, 'd MMM', { locale: pl })} - ${format(end, 'd MMM yyyy', { locale: pl })}`
}
