import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { JournalPage } from '@/pages/JournalPage'
import { QuotesPage } from '@/pages/QuotesPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { BillsPage } from '@/pages/BillsPage'
import { ExpensesPage } from '@/pages/ExpensesPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { UsersPage } from '@/pages/UsersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { InvoicePrintPage } from '@/pages/InvoicePrintPage'
import { QuotePrintPage } from '@/pages/QuotePrintPage'
import { QuoteCustomerPage } from '@/pages/QuoteCustomerPage'
import { CreditNotesPage } from '@/pages/CreditNotesPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { PayrollPage } from '@/pages/PayrollPage'
import { PayslipPrintPage } from '@/pages/PayslipPrintPage'
import { StatutoryReturnsPage } from '@/pages/StatutoryReturnsPage'
import { ReceiptsPage } from '@/pages/ReceiptsPage'
import { ReceiptPrintPage } from '@/pages/ReceiptPrintPage'
import { InventoryPage } from '@/pages/InventoryPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Print views — no sidebar */}
          <Route path="/invoices/:id/print" element={<ProtectedRoute><InvoicePrintPage /></ProtectedRoute>} />
          <Route path="/invoices/:id/receipt" element={<ProtectedRoute><ReceiptPrintPage /></ProtectedRoute>} />
          <Route path="/quotes/:id/print" element={<ProtectedRoute><QuotePrintPage /></ProtectedRoute>} />
          <Route path="/payroll/:runId/print" element={<ProtectedRoute><PayslipPrintPage /></ProtectedRoute>} />
          <Route path="/payroll/:runId/returns" element={<ProtectedRoute><StatutoryReturnsPage /></ProtectedRoute>} />

          {/* Public customer portal — no auth */}
          <Route path="/q/:token" element={<QuoteCustomerPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="receipts" element={<ReceiptsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="bills" element={<BillsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="credit-notes" element={<CreditNotesPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
