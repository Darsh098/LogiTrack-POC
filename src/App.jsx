import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Search, Truck, Plus, Package } from "lucide-react";
import SearchForm from "./components/SearchForm";
import ManageFleet from "./components/ManageFleet";
import AddTruckForm from "./components/AddTruckForm";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

const NAV_ITEMS = [
  { id: "search", label: "Find Trucks", icon: Search },
  { id: "fleet", label: "Manage Fleet", icon: Truck },
  { id: "add", label: "Add Truck", icon: Plus },
];

function App() {
  const [activeScreen, setActiveScreen] = useState("search");

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50">
        {/* Top Navigation */}
        <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-[500]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 gap-6">
              {/* Logo */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
                  <Package size={18} className="text-white" />
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  Logi<span className="text-indigo-600">Track</span>
                </span>
              </div>

              {/* Nav Links */}
              <div className="flex items-center gap-1 ml-4">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveScreen(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      activeScreen === id
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Screen Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeScreen === "search" && <SearchForm />}
          {activeScreen === "fleet" && (
            <ManageFleet onViewOnMap={() => setActiveScreen("search")} />
          )}
          {activeScreen === "add" && (
            <AddTruckForm onSuccess={() => setActiveScreen("fleet")} />
          )}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
