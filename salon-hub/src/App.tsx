import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import LoadingView from "@/components/ui/loading-view";

// Lazy load pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const ItemsCategoryPage = lazy(() => import("./pages/ItemsCategoryPage"));
const AddServicePage = lazy(() => import("./pages/AddServicePage"));
const AddComboServicePage = lazy(() => import("./pages/AddComboServicePage"));
const AddAddonPage = lazy(() => import("./pages/AddAddonPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const EditStaffPage = lazy(() => import("./pages/EditStaffPage"));
const AddStaffPage = lazy(() => import("./pages/AddStaffPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SetupPage = lazy(() => import("./pages/SetupPage"));
const MarketingPage = lazy(() => import("./pages/MarketingPage"));
const ReferralProgramPage = lazy(() => import("./pages/ReferralProgramPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const BusinessPage = lazy(() => import("./pages/BusinessPage"));
const BusinessHoursPage = lazy(() => import("./pages/BusinessHoursPage"));
const RegistrationPage = lazy(() => import("./pages/RegistrationPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const PaymentMethodPage = lazy(() => import("./pages/PaymentMethodPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const PublicRoute = lazy(() => import("./components/PublicRoute"));
const BusinessOwnerRoute = lazy(() => import("./components/BusinessOwnerRoute"));

// Optimized QueryClient with better caching and performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: data is fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time: keep unused data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests
      retry: 2,
      // Refetch on window focus (can be disabled for better performance)
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingView />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes - Login and Registration */}
            <Route
              path="/login"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                </Suspense>
              }
            />
            <Route
              path="/register"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PublicRoute>
                    <RegistrationPage />
                  </PublicRoute>
                </Suspense>
              }
            />
            
            {/* Protected routes - Business selection/home page */}
            <Route
              path="/"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            
            {/* Business-specific routes */}
            <Route
              path="/:businessId"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute>
                    <BusinessOwnerRoute>
                      <Outlet />
                    </BusinessOwnerRoute>
                  </ProtectedRoute>
                </Suspense>
              }
            >
              <Route index element={<Navigate to="calendar" replace />} />
              <Route path="calendar" element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
              <Route path="tasks" element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
              <Route path="clients" element={<Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>} />
              <Route path="inventory" element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />
              <Route path="shopping" element={<Suspense fallback={<PageLoader />}><SalesPage /></Suspense>} />
              <Route path="sales" element={<Suspense fallback={<PageLoader />}><SalesPage /></Suspense>} />
              <Route path="items-category" element={<Suspense fallback={<PageLoader />}><ItemsCategoryPage /></Suspense>} />
              <Route path="services" element={<Suspense fallback={<PageLoader />}><ServicesPage /></Suspense>} />
              <Route path="add-service" element={<Suspense fallback={<PageLoader />}><AddServicePage /></Suspense>} />
              <Route path="edit-service/:id" element={<Suspense fallback={<PageLoader />}><AddServicePage /></Suspense>} />
              <Route path="add-combo-service" element={<Suspense fallback={<PageLoader />}><AddComboServicePage /></Suspense>} />
              <Route path="edit-combo-service/:id" element={<Suspense fallback={<PageLoader />}><AddComboServicePage /></Suspense>} />
              <Route path="add-addon" element={<Suspense fallback={<PageLoader />}><AddAddonPage /></Suspense>} />
              <Route path="marketing" element={<Suspense fallback={<PageLoader />}><MarketingPage /></Suspense>} />
              <Route path="referral-program" element={<Suspense fallback={<PageLoader />}><ReferralProgramPage /></Suspense>} />
              <Route path="contacts" element={<Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
              <Route path="staff" element={<Suspense fallback={<PageLoader />}><StaffPage /></Suspense>} />
              <Route path="edit-staff/:id" element={<Suspense fallback={<PageLoader />}><EditStaffPage /></Suspense>} />
              <Route path="add-staff" element={<Suspense fallback={<PageLoader />}><AddStaffPage /></Suspense>} />
              <Route path="business" element={<Suspense fallback={<PageLoader />}><BusinessPage /></Suspense>} />
              <Route path="business-hours" element={<Suspense fallback={<PageLoader />}><BusinessHoursPage /></Suspense>} />
              <Route path="setup" element={<Suspense fallback={<PageLoader />}><SetupPage /></Suspense>} />
              <Route path="help" element={<Suspense fallback={<PageLoader />}><SetupPage /></Suspense>} />
              <Route path="reviews" element={<Suspense fallback={<PageLoader />}><ReviewsPage /></Suspense>} />
              <Route path="payment-method" element={<Suspense fallback={<PageLoader />}><PaymentMethodPage /></Suspense>} />
            </Route>
            
            {/* Legacy routes */}
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute>
                    <Navigate to="/" replace />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute>
                    <NotFound />
                  </ProtectedRoute>
                </Suspense>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
