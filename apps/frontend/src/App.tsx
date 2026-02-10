import { BrowserRouter } from "react-router-dom";
import Router from "@/app/Router";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { BillingProvider } from "@/features/billing/components/BillingProvider";

function App() {
  // AuthProvider wraps everything so any component can access auth state
  // BillingProvider sits inside AuthProvider since it depends on user session
  // Both must be inside BrowserRouter if their functions need navigation
  return (
    <BrowserRouter>
      <AuthProvider>
        <BillingProvider>
          <Router />
        </BillingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
