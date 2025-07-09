
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ChatBot from "./pages/ChatBot";
import AdminPanel from "./pages/AdminPanel";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/chat" element={<ChatBot />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPanel />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;
