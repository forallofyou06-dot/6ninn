import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { MobileLayout } from "@/components/layout/MobileLayout";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

import EventsList from "@/pages/events/list";
import EventDetail from "@/pages/events/detail";
import EventNew from "@/pages/events/new";
import EventEdit from "@/pages/events/edit";
import EventReport from "@/pages/events/report";
import MyPage from "@/pages/my/index";
import MyApplications from "@/pages/my/applications";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(20 50% 60%)",
    colorForeground: "hsl(30 15% 20%)",
    colorMutedForeground: "hsl(30 10% 45%)",
    colorDanger: "hsl(0 50% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(30 15% 20%)",
    colorNeutral: "hsl(30 15% 90%)",
    fontFamily: "'Zen Kaku Gothic New', sans-serif",
    borderRadius: "12px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-md",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-2xl text-foreground font-semibold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium text-sm",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-xs",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-destructive",
    logoBox: "mx-auto mb-4",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "bg-white border-border hover:bg-secondary",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm",
    formFieldInput: "bg-white border-border text-foreground rounded-lg focus:ring-primary focus:border-primary",
    footerAction: "bg-secondary p-4 mt-6",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20 text-destructive",
    otpCodeFieldInput: "border-border",
    formFieldRow: "mb-4",
    main: "px-6 pb-6 pt-4",
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/events" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <MobileLayout>
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-background">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </MobileLayout>
  );
}

function SignUpPage() {
  return (
    <MobileLayout>
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-background">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </MobileLayout>
  );
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      {() => (
        <>
          <Show when="signed-in">
            <Component />
          </Show>
          <Show when="signed-out">
            <Redirect to="/sign-in" />
          </Show>
        </>
      )}
    </Route>
  );
}


const queryClient = new QueryClient();

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "おかえりなさい",
            subtitle: "サインインして続ける",
          },
        },
        signUp: {
          start: {
            title: "はじめまして",
            subtitle: "アカウントを作成する",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <ProtectedRoute path="/events" component={EventsList} />
            <ProtectedRoute path="/events/new" component={EventNew} />
            <ProtectedRoute path="/events/:id/edit" component={EventEdit} />
            <ProtectedRoute path="/events/:id/report" component={EventReport} />
            <ProtectedRoute path="/events/:id" component={EventDetail} />
            
            <ProtectedRoute path="/my" component={MyPage} />
            <ProtectedRoute path="/my/applications" component={MyApplications} />
            
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
