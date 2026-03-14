import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { AdminPanelPage } from "@/pages/AdminPanelPage";
import { BusDetailPage } from "@/pages/BusDetailPage";
import { LandingPage } from "@/pages/LandingPage";
import { OperatorDashboardPage } from "@/pages/OperatorDashboardPage";
import { RouteSearchPage } from "@/pages/RouteSearchPage";

function App() {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("busconnect-lang");
    if (saved) {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("busconnect-lang", language);
  }, [language]);

  return (
    <LanguageProvider language={language} setLanguage={setLanguage}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/search" element={<RouteSearchPage />} />
          <Route path="/bus/:busNumber" element={<BusDetailPage />} />
          <Route path="/operator" element={<OperatorDashboardPage />} />
          <Route path="/admin" element={<AdminPanelPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </LanguageProvider>
  );
}

export default App;