import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ForecastTab from "./components/Forecast/ForecastTab";
import InfrastructureTab from "./components/Infrastructure/InfrastructureTab";
import ScenariosTab from "./components/Scenarios/ScenariosTab";
import AITab from "./components/AI/AITab";

import Sidebar from "./layout/Sidebar";
import Header from "./layout/Header";

import { ForecastProvider } from "./context/ForecastContext";

function App() {
  return (
    <ForecastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">

          {/* LEFT SIDEBAR */}
          <Sidebar />

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col">
            <Header />

            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/forecast" replace />} />
                <Route path="/forecast" element={<ForecastTab />} />
                <Route path="/infrastructure" element={<InfrastructureTab />} />
                <Route path="/scenarios" element={<ScenariosTab />} />
                <Route path="/ai" element={<AITab />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ForecastProvider>
  );
}

export default App;