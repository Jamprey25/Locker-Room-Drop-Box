import { AuthPageHeader } from "@/components/auth/auth-page-header";

export function AuthShell({
  subtitle,
  children,
}: {
  subtitle: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16">
      <AuthPageHeader subtitle={subtitle} />
      {children}
    </main>
  );
}
