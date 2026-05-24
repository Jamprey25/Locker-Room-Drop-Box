import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up · Locker Room Dropbox",
  description: "Create an account for the shared videos and resources hub.",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
