export interface TaxDeadline {
  label: string
  description: string
  dueDate: Date
  daysUntil: number
  urgency: 'overdue' | 'urgent' | 'soon' | 'ok'
  authority: string
  color: string
}

function nextMonthlyDate(today: Date, dayOfMonth: number): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), dayOfMonth)
  if (d <= today) d.setMonth(d.getMonth() + 1)
  return d
}

function nextQuarterlyDate(today: Date): Date {
  const quarters = [
    new Date(today.getFullYear(), 2, 31),  // 31 Mar
    new Date(today.getFullYear(), 5, 30),  // 30 Jun
    new Date(today.getFullYear(), 8, 30),  // 30 Sep
    new Date(today.getFullYear(), 11, 31), // 31 Dec
  ]
  const next = quarters.find(d => d > today)
  if (next) return next
  return new Date(today.getFullYear() + 1, 2, 31)
}

function urgency(days: number): TaxDeadline['urgency'] {
  if (days < 0)  return 'overdue'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'soon'
  return 'ok'
}

function urgencyColor(u: TaxDeadline['urgency']): string {
  return { overdue: '#dc2626', urgent: '#ea580c', soon: '#d97706', ok: '#16a34a' }[u]
}

export function getUpcomingDeadlines(today: Date): TaxDeadline[] {
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  function days(d: Date) {
    return Math.round((d.getTime() - startOfDay.getTime()) / 86400000)
  }

  const payeDate  = nextMonthlyDate(startOfDay, 10)
  const whtDate   = nextMonthlyDate(startOfDay, 14)
  const vatDate   = nextMonthlyDate(startOfDay, 18)
  const citDate   = nextQuarterlyDate(startOfDay)

  const items: Omit<TaxDeadline, 'urgency' | 'color'>[] = [
    {
      label: 'PAYE / NAPSA / NHIMA / SDL',
      description: 'Monthly payroll statutory remittances',
      dueDate: payeDate,
      daysUntil: days(payeDate),
      authority: 'ZRA / NAPSA / NHIMA',
    },
    {
      label: 'Withholding Tax',
      description: 'WHT on dividends, interest, management fees',
      dueDate: whtDate,
      daysUntil: days(whtDate),
      authority: 'ZRA',
    },
    {
      label: 'VAT Return',
      description: 'Monthly VAT return and payment',
      dueDate: vatDate,
      daysUntil: days(vatDate),
      authority: 'ZRA',
    },
    {
      label: 'Provisional CIT',
      description: 'Quarterly corporate income tax instalment',
      dueDate: citDate,
      daysUntil: days(citDate),
      authority: 'ZRA',
    },
  ]

  return items
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .map(item => {
      const u = urgency(item.daysUntil)
      return { ...item, urgency: u, color: urgencyColor(u) }
    })
}

export function formatDaysUntil(days: number): string {
  if (days < 0)  return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `${days} days`
}
