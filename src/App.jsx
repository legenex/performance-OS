import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import RoleRoute from '@/components/RoleRoute';
import HomeRedirect from '@/components/HomeRedirect';
import CashBanking from '@/pages/CashBanking';
import Receivables from '@/pages/Receivables';
import Payables from '@/pages/Payables';
import TruePnL from '@/pages/TruePnL';
import ImportCenter from '@/pages/ImportCenter';
import DataSources from '@/pages/DataSources';
import Settings from '@/pages/Settings';
import AdCommand from '@/pages/AdCommand';
import AdAccounts from '@/pages/AdAccounts';
import CampaignExplorer from '@/pages/CampaignExplorer';
import CreativeIntelligence from '@/pages/CreativeIntelligence';
import KnowledgeBase from '@/pages/KnowledgeBase';
import OpsBoard from '@/pages/OpsBoard';
import PipelineHealth from '@/pages/PipelineHealth';
import PerformanceOverview from '@/pages/performance/PerformanceOverview';
import BuyerReport from '@/pages/performance/BuyerReport';
import SupplierPerformance from '@/pages/performance/SupplierPerformance';
import StateReport from '@/pages/performance/StateReport';
import LeadQuality from '@/pages/performance/LeadQuality';
import CampaignTrueMargin from '@/pages/performance/CampaignTrueMargin';
import ReportBuilder from '@/pages/performance/ReportBuilder';
import Buyers from '@/pages/ops/Buyers';
import Suppliers from '@/pages/ops/Suppliers';
import StatesTiers from '@/pages/ops/StatesTiers';
import Qualification from '@/pages/ops/Qualification';
import BillingRecon from '@/pages/ops/BillingRecon';
import UsersRoles from '@/pages/UsersRoles';
import DailyBriefing from '@/pages/DailyBriefing';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-graphite-base">
        <div className="w-8 h-8 border-4 border-graphite-border border-t-brand-red rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleRoute />}>
            <Route path="/" element={<HomeRedirect />} />
            {/* MONEY */}
            <Route path="/cash-banking" element={<CashBanking />} />
            <Route path="/receivables" element={<Receivables />} />
            <Route path="/payables" element={<Payables />} />
            <Route path="/pnl" element={<TruePnL />} />
            {/* PERFORMANCE */}
            <Route path="/performance" element={<PerformanceOverview />} />
            <Route path="/performance/buyers" element={<BuyerReport />} />
            <Route path="/performance/suppliers" element={<SupplierPerformance />} />
            <Route path="/performance/states" element={<StateReport />} />
            <Route path="/performance/lead-quality" element={<LeadQuality />} />
            <Route path="/performance/campaign-margin" element={<CampaignTrueMargin />} />
            <Route path="/performance/report-builder" element={<ReportBuilder />} />
            {/* AD INTELLIGENCE */}
            <Route path="/ad-command" element={<AdCommand />} />
            <Route path="/ad-accounts" element={<AdAccounts />} />
            <Route path="/campaign-explorer" element={<CampaignExplorer />} />
            <Route path="/creative-intelligence" element={<CreativeIntelligence />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            {/* OPS */}
            <Route path="/ops-board" element={<OpsBoard />} />
            <Route path="/pipeline-health" element={<PipelineHealth />} />
            <Route path="/buyers" element={<Buyers />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/states-tiers" element={<StatesTiers />} />
            <Route path="/qualification" element={<Qualification />} />
            <Route path="/billing-recon" element={<BillingRecon />} />
            <Route path="/import" element={<ImportCenter />} />
            <Route path="/data-sources" element={<DataSources />} />
            {/* AI */}
            <Route path="/daily-briefing" element={<DailyBriefing />} />
            {/* SYSTEM */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<UsersRoles />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App