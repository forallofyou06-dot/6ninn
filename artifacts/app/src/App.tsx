import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/onboarding";
import EventsList from "@/pages/events/list";
import EventDetail from "@/pages/events/detail";
import EventNew from "@/pages/events/new";
import EventEdit from "@/pages/events/edit";
import MyPage from "@/pages/my/index";
import MyApplications from "@/pages/my/applications";
import Notifications from "@/pages/notifications";
import Rules from "@/pages/rules";
import Feedback from "@/pages/feedback";
import OfficeDashboard from "@/pages/office/index";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1 },
    mutations: { retry: 0 },
  },
});

function SessionCacheInvalidator() {
  const { user } = useAuth();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
    previousUserId.current = userId;
  }, [client, user?.id]);
  return null;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Redirect to="/events" /> : <Landing />;
}

function ProfileGuard({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const { data: profile, isLoading, isError } = useGetMe();

  useEffect(() => {
    if (profile && !profile.profileComplete && location !== "/onboarding") setLocation("/onboarding");
  }, [location, profile, setLocation]);

  if (isLoading) return null;
  if (isError) return <div className="p-6 text-sm text-destructive">プロフィールを取得できませんでした。Supabaseの設定を確認してください。</div>;
  return <Component />;
}

function ProtectedRoute({ component: Component, ...routeProps }: { component: React.ComponentType; [key: string]: unknown }) {
  const { user, loading } = useAuth();
  return (
    <Route {...routeProps}>
      {() => {
        if (loading) return null;
        if (!user) return <Redirect to="/sign-in" />;
        return <ProfileGuard component={Component} />;
      }}
    </Route>
  );
}

function OnboardingRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Onboarding /> : <Redirect to="/sign-in" />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/sign-in">{() => <AuthPage mode="sign-in" />}</Route>
      <Route path="/sign-up">{() => <AuthPage mode="sign-up" />}</Route>
      <Route path="/onboarding" component={OnboardingRoute} />
      <ProtectedRoute path="/events" component={EventsList} />
      <ProtectedRoute path="/events/new" component={EventNew} />
      <ProtectedRoute path="/events/:id/edit" component={EventEdit} />
      <ProtectedRoute path="/events/:id" component={EventDetail} />
      <ProtectedRoute path="/my" component={MyPage} />
      <ProtectedRoute path="/my/applications" component={MyApplications} />
      <ProtectedRoute path="/my/hosted" component={MyApplications} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/rules" component={Rules} />
      <ProtectedRoute path="/feedback" component={Feedback} />
      <ProtectedRoute path="/office" component={OfficeDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <SessionCacheInvalidator />
          <TooltipProvider>
            <Routes />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </WouterRouter>
  );
}
