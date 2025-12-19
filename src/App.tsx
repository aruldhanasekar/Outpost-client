import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Inbox from "./pages/Inbox";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Sent from "./pages/Sent";
import Done from "./pages/Done";
import Settings from "./pages/Settings";
import Drafts from "@/pages/Drafts";
import Trash from "@/pages/Trash";
import Scheduled from "@/pages/Scheduled";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
// import Blogs from "@/pages/Blogs";
import Payment from "@/pages/Payment";

const queryClient = new QueryClient();

const App = () => (

    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ✅ PUBLIC ROUTE: Sign-in page */}
            <Route path="/" element={<Index />} />

            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/payment" element={<Payment />} />

            {/* ✅ PROTECTED ROUTE: Inbox */}
            <Route path="/inbox" element={
                <ProtectedRoute>
                  <Inbox />
                </ProtectedRoute>
              } />
            
            <Route path="/inbox/:messageId" element={
                <ProtectedRoute>
                  <Inbox />
                </ProtectedRoute>
              } />

            {/* ✅ PROTECTED ROUTE: Sent */}
            <Route path="/sent" element={
              <ProtectedRoute>
                <Sent />
              </ProtectedRoute>
            } />

            <Route path="/sent/:messageId" element={
              <ProtectedRoute>
                <Sent />
              </ProtectedRoute>
            } />

            {/* ✅ PROTECTED ROUTE: Done */}
            <Route path="/done" element={
              <ProtectedRoute>
                <Done />
              </ProtectedRoute>
            } />

            <Route path="/done/:messageId" element={
              <ProtectedRoute>
                <Done />
              </ProtectedRoute>
            } />

            {/* ✅ PROTECTED ROUTE: Drafts */}
            <Route path="/drafts" element={
              <ProtectedRoute>
                <Drafts />
              </ProtectedRoute>
            } />

            <Route path="/drafts/:draftId" element={
              <ProtectedRoute>
                <Drafts />
              </ProtectedRoute>
            } />

            {/* ✅ PROTECTED ROUTE: Scheduled */}
            <Route path="/scheduled" element={
              <ProtectedRoute>
                <Scheduled />
              </ProtectedRoute>
            } />

            <Route path="/scheduled/:emailId" element={
              <ProtectedRoute>
                <Scheduled />
              </ProtectedRoute>
            } />

            {/* ✅ PROTECTED ROUTE: Trash */}
            <Route path="/trash" element={
              <ProtectedRoute>
                <Trash />
              </ProtectedRoute>
            } />

            <Route path="/trash/:messageId" element={
              <ProtectedRoute>
                <Trash />
              </ProtectedRoute>
            } />

            {/* ✅ PROTECTED ROUTE: Settings */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
                
            {/* Catch-all: 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
);

export default App;