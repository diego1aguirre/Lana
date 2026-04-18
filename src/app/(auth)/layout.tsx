export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0A0F1E" }}
    >
      {children}
    </div>
  );
}
