// Zambia 2025 payroll calculation constants
const PAYE_BANDS = [
  { from: 0,    to: 5100, rate: 0 },
  { from: 5100, to: 7100, rate: 0.20 },
  { from: 7100, to: 9200, rate: 0.30 },
  { from: 9200, to: Infinity, rate: 0.37 },
]

const NAPSA_RATE    = 0.05
const NAPSA_CEILING = 34164   // ZMW per month (2025 NAPSA announcement)
const NHIMA_RATE    = 0.005
const SDL_RATE      = 0.005

export function calcPAYE(monthlyGross: number): number {
  let tax = 0
  for (const band of PAYE_BANDS) {
    if (monthlyGross <= band.from) break
    const taxable = Math.min(monthlyGross, band.to) - band.from
    tax += taxable * band.rate
  }
  return round2(tax)
}

export function calcNAPSA(monthlyGross: number): { employee: number; employer: number } {
  const capped = Math.min(monthlyGross, NAPSA_CEILING)
  const c = round2(capped * NAPSA_RATE)
  return { employee: c, employer: c }
}

export function calcNHIMA(monthlyGross: number): { employee: number; employer: number } {
  const c = round2(monthlyGross * NHIMA_RATE)
  return { employee: c, employer: c }
}

export function calcSDL(monthlyGross: number): number {
  return round2(monthlyGross * SDL_RATE)
}

export interface PayrollResult {
  grossPay: number
  paye: number
  napsaEmployee: number
  napsaEmployer: number
  nhimaEmployee: number
  nhimaEmployer: number
  sdl: number
  totalDeductions: number   // employee-side: paye + napsa_e + nhima_e + advance + other
  totalEmployerCost: number // gross + napsa_er + nhima_er + sdl
  netPay: number
}

export function calculatePayroll(params: {
  basicSalary: number
  housingAllowance?: number
  transportAllowance?: number
  otherAllowances?: number
  salaryAdvance?: number
  otherDeductions?: number
}): PayrollResult {
  const {
    basicSalary,
    housingAllowance    = 0,
    transportAllowance  = 0,
    otherAllowances     = 0,
    salaryAdvance       = 0,
    otherDeductions     = 0,
  } = params

  const grossPay = basicSalary + housingAllowance + transportAllowance + otherAllowances
  const paye     = calcPAYE(grossPay)
  const napsa    = calcNAPSA(grossPay)
  const nhima    = calcNHIMA(grossPay)
  const sdl      = calcSDL(grossPay)

  const totalDeductions   = round2(paye + napsa.employee + nhima.employee + salaryAdvance + otherDeductions)
  const totalEmployerCost = round2(grossPay + napsa.employer + nhima.employer + sdl)
  const netPay            = round2(grossPay - totalDeductions)

  return {
    grossPay,
    paye,
    napsaEmployee:  napsa.employee,
    napsaEmployer:  napsa.employer,
    nhimaEmployee:  nhima.employee,
    nhimaEmployer:  nhima.employer,
    sdl,
    totalDeductions,
    totalEmployerCost,
    netPay,
  }
}

export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
