import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserProvider } from "./contexts/UserContext";
import { RoomProvider } from "./contexts/RoomContext";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Feedback from "./pages/Feedback";
import Favorites from "./pages/Favorites";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import AboutUs from "./pages/AboutUs";
import OrderStatus from "./pages/OrderStatus";

import { CurrencyProvider } from "./contexts/CurrencyContext";
import CurrencySettings from "./pages/CurrencySettings";
import LanguageSettings from "./pages/LanguageSettings";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryPusherSync } from "./components/QueryPusherSync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes cache
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <QueryPusherSync />
    <ThemeProvider>
      <UserProvider>
        <CurrencyProvider>
          <BrowserRouter>
            <RoomProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner duration={2000} />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings/currency" element={<CurrencySettings />} />
                  <Route path="/settings/language" element={<LanguageSettings />} />
                  <Route path="/settings/about" element={<AboutUs />} />
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/order-status" element={<OrderStatus />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </RoomProvider>
          </BrowserRouter>
        </CurrencyProvider>
      </UserProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
