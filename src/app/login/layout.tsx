import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in · Locker Room Dropbox",
  description: "Sign in to the crew vault.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
