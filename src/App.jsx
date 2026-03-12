import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SearchForm from "./components/SearchForm";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      // cacheTime: 1000 * 60 * 10, // cacheTime is renamed to gcTime in React Query v5
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <SearchForm />
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
