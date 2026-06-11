import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home/HomePage";
import RoomsPage from "@/pages/rooms/RoomsPage";
import RoomDetailPage from "@/pages/rooms/RoomDetailPage";
import BookingConfirmPage from "@/pages/booking/BookingConfirmPage";
import BookingSuccessPage from "@/pages/booking/BookingSuccessPage";
import AdminPage from "@/pages/admin/AdminPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/rooms" component={RoomsPage} />
      <Route path="/rooms/:id" component={RoomDetailPage} />
      <Route path="/booking/confirm" component={BookingConfirmPage} />
      <Route path="/booking/success" component={BookingSuccessPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
