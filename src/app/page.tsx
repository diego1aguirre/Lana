import Link from "next/link";
import { formatMXN } from "@/lib/design-tokens";
import LandingPolish from "@/components/landing/LandingPolish";

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center">
      <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
        lana
      </span>
      <span className="w-2 h-2 rounded-full ml-0.5 mb-0.5 inline-block" style={{ background: "#00C896" }} />
    </div>
  );
}

function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
      style={{
        background: "rgba(10,15,30,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <Logo />
      <div className="hidden md:flex items-center gap-8">
        <a
          href="#caracteristicas"
          className="text-sm transition-colors duration-200 hover:text-white cursor-pointer"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          Características
        </a>
        <a
          href="#precios"
          className="text-sm transition-colors duration-200 hover:text-white cursor-pointer"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          Precios
        </a>
        <Link
          href="/blog"
          className="text-sm transition-colors duration-200 hover:text-white cursor-pointer"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          Blog
        </Link>
      </div>
      <Link
        href="/signup"
        className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 hover:opacity-90 hover:scale-105 cursor-pointer"
        style={{ background: "#1B4FD8", color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
      >
        Empieza gratis
      </Link>
    </nav>
  );
}

// ─── Dashboard Mock Card ──────────────────────────────────────────────────────

function DashboardMock() {
  const categories = [
    { label: "Comida", pct: 32, color: "#1B4FD8" },
    { label: "Transporte", pct: 18, color: "#00C896" },
    { label: "Entretenimiento", pct: 14, color: "#FF4D6D" },
  ];

  const transactions = [
    { name: "Uber Eats", amount: -349, emoji: "🍕" },
    { name: "Nómina ACME", amount: 18500, emoji: "💼" },
    { name: "Netflix", amount: -199, emoji: "🎬" },
  ];

  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0">
      {/* Glow behind card */}
      <div
        className="absolute inset-0 rounded-2xl blur-3xl opacity-30 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #1B4FD8, #00C896)" }}
      />

      <div
        className="relative rounded-2xl p-6 shadow-2xl"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs mb-1" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
              Balance total
            </p>
            <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
              {formatMXN(47382.5)}
            </p>
            <p className="text-xs mt-1" style={{ color: "#00C896", fontFamily: "var(--font-dm-sans)" }}>
              ↑ +8.2% este mes
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: "rgba(27,79,216,0.15)", border: "1px solid rgba(27,79,216,0.3)" }}
          >
            🏦
          </div>
        </div>

        {/* Category bars */}
        <div className="mb-5">
          <p
            className="text-xs font-semibold mb-3 uppercase tracking-widest"
            style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
          >
            Gastos por categoría
          </p>
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}>
                    {cat.label}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: cat.color, fontFamily: "var(--font-dm-sans)" }}>
                    {cat.pct}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: "#1F2937" }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${cat.pct}%`, background: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem" }}>
          <p
            className="text-xs font-semibold mb-3 uppercase tracking-widest"
            style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
          >
            Últimos movimientos
          </p>
          {transactions.map((tx) => (
            <div key={tx.name} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-base">{tx.emoji}</span>
                <span className="text-sm" style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}>
                  {tx.name}
                </span>
              </div>
              <span
                className="text-sm font-semibold"
                style={{
                  color: tx.amount > 0 ? "#00C896" : "#FF4D6D",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {tx.amount > 0 ? "+" : ""}
                {formatMXN(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating badge */}
      <div
        className="absolute -top-3 -right-3 rounded-xl px-3 py-1.5 shadow-lg"
        style={{ background: "#00C896", color: "#0A0F1E" }}
      >
        <span className="text-xs font-bold" style={{ fontFamily: "var(--font-dm-sans)" }}>
          ✓ Al día
        </span>
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center hero-grid overflow-hidden pt-20"
      style={{ background: "#0A0F1E" }}
    >
      {/* Ambient glows */}
      <div
        className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "#1B4FD8" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ background: "#00C896" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Copy */}
          <div className="flex-1 text-center lg:text-left">
            <div
              className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(27,79,216,0.12)",
                border: "1px solid rgba(27,79,216,0.25)",
                color: "#93BBFF",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              <span style={{ color: "#00C896" }}>●</span> Ahora en beta • Gratis para siempre
            </div>

            <h1
              className="text-5xl md:text-6xl xl:text-7xl font-bold leading-tight mb-6"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              <span style={{ color: "#F9FAFB" }}>Tu dinero,</span>
              <br />
              <span style={{ color: "#F9FAFB" }}>finalmente </span>
              <span className="gradient-text">claro.</span>
            </h1>

            <p
              className="text-lg md:text-xl leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0"
              style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
            >
              Conecta tus cuentas mexicanas, visualiza tus gastos y toma control de tus finanzas.
              Todo en un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-5">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 hover:opacity-90 hover:scale-105 cursor-pointer"
                style={{
                  background: "#1B4FD8",
                  color: "#F9FAFB",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 0 30px rgba(27,79,216,0.4)",
                }}
              >
                Comenzar gratis →
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 hover:bg-white/5 cursor-pointer"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#F9FAFB",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                ▶ Ver demo
              </Link>
            </div>

            <p className="text-sm" style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}>
              Sin tarjeta de crédito • Cancela cuando quieras
            </p>
          </div>

          {/* Mock card */}
          <div className="flex-1 w-full flex justify-center lg:justify-end">
            <DashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const features = [
  { icon: "🏦", title: "Conecta tus bancos", desc: "Compatible con BBVA, Santander, Citibanamex, Banorte y más." },
  { icon: "📊", title: "Gastos automáticos", desc: "Cada transacción categorizada automáticamente. Sin esfuerzo." },
  { icon: "🎯", title: "Presupuestos inteligentes", desc: "Define límites por categoría y recibe alertas antes de pasarte." },
  { icon: "💡", title: "Insights personalizados", desc: "Descubre patrones en tus gastos que no sabías que tenías." },
  { icon: "🔒", title: "Seguridad bancaria", desc: "Encriptación de nivel bancario. Tus datos nunca se venden." },
  { icon: "📱", title: "Siempre contigo", desc: "Disponible en web y próximamente en iOS y Android." },
];

function Features() {
  return (
    <section id="caracteristicas" className="py-24 px-6 md:px-12" style={{ background: "#0A0F1E" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
          >
            Todo lo que necesitas para{" "}
            <span className="gradient-text">entender tu dinero</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
            Herramientas poderosas, diseñadas para el contexto financiero mexicano.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="feature-card card-hover rounded-2xl p-6 reveal"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.05)",
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{
                  background: "rgba(27,79,216,0.1)",
                  border: "1px solid rgba(27,79,216,0.15)",
                  transition: "transform 0.2s ease",
                }}
              >
                {f.icon}
              </div>
              <h3 className="font-bold text-base mb-2" style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Social Proof ─────────────────────────────────────────────────────────────

const testimonials = [
  {
    initials: "MR",
    name: "María Rodríguez",
    role: "Diseñadora freelance, CDMX",
    text: "Lana me ayudó a darme cuenta que gastaba $4,000 al mes en comida a domicilio sin saberlo. Ahora ahorro el doble.",
    color: "#1B4FD8",
  },
  {
    initials: "CL",
    name: "Carlos López",
    role: "Ingeniero de software, MTY",
    text: "Por fin una app de finanzas que entiende el sistema bancario mexicano. Conecté BBVA y Banorte en minutos.",
    color: "#00C896",
  },
  {
    initials: "AP",
    name: "Ana Pérez",
    role: "Emprendedora, GDL",
    text: "Los presupuestos inteligentes cambiaron mi relación con el dinero. Es como tener un asesor financiero en el bolsillo.",
    color: "#FF4D6D",
  },
];

const stats = [
  { value: "12,000+", label: "usuarios activos" },
  { value: "MX$2.3B", label: "rastreados" },
  { value: "4.9★", label: "calificación" },
];

function SocialProof() {
  return (
    <section className="py-24 px-6 md:px-12" style={{ background: "#0A0F1E" }}>
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-20 max-w-2xl mx-auto reveal">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="text-3xl md:text-4xl font-bold gradient-text mb-1"
                style={{ fontFamily: "var(--font-sora)" }}
              >
                {s.value}
              </p>
              <p className="text-sm" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mb-12 reveal">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
          >
            Únete a miles de mexicanos que ya{" "}
            <span className="gradient-text">controlan su dinero</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="card-hover rounded-2xl p-6 reveal"
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.05)",
                transitionDelay: `${i * 80}ms`,
              }}
            >
              <p
                className="text-sm leading-relaxed mb-5"
                style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}
              >
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: t.color, color: "#fff", fontFamily: "var(--font-sora)" }}
                >
                  {t.initials}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
                  >
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                    {t.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
  const freeFeatures = ["2 cuentas conectadas", "3 meses de historial", "Categorías básicas"];
  const proFeatures = [
    "Cuentas ilimitadas",
    "Historial completo",
    "Presupuestos por categoría",
    "Insights con IA",
    "Soporte prioritario",
  ];

  return (
    <section id="precios" className="py-24 px-6 md:px-12" style={{ background: "#0A0F1E" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
          >
            Simple y <span className="gradient-text">transparente</span>
          </h2>
          <p className="text-lg" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
            Sin letras pequeñas. Sin sorpresas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div
            className="rounded-2xl p-8 reveal"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <h3
              className="text-lg font-bold mb-1"
              style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
            >
              Gratis
            </h3>
            <p className="text-sm mb-6" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
              Para empezar a tomar control
            </p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
                $0
              </span>
              <span className="text-sm" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                /mes
              </span>
            </div>
            <ul className="space-y-3 mb-8">
              {freeFeatures.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}
                >
                  <span style={{ color: "#00C896" }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-white/5 cursor-pointer"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#F9FAFB",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              Empezar gratis
            </Link>
          </div>

          {/* Pro — animated gradient border */}
          <div className="pro-card-border reveal" style={{ transitionDelay: "80ms" }}>
            <div
              className="relative rounded-[15px] p-8 h-full"
              style={{
                background: "linear-gradient(135deg, rgba(27,79,216,0.15), rgba(0,200,150,0.05))",
              }}
            >
              <div
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                style={{ background: "#1B4FD8", color: "#fff", fontFamily: "var(--font-dm-sans)" }}
              >
                ✦ Más popular
              </div>
              <h3
                className="text-lg font-bold mb-1"
                style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
              >
                Pro
              </h3>
              <p className="text-sm mb-6" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                Para los serios con su dinero
              </p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
                  $129
                </span>
                <span className="text-sm" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                  /mes MXN
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {proFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-sm"
                    style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}
                  >
                    <span style={{ color: "#00C896" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02] cursor-pointer"
                style={{
                  background: "#1B4FD8",
                  color: "#fff",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 0 20px rgba(27,79,216,0.4)",
                }}
              >
                Comenzar con Pro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const footerLinks: Record<string, string[]> = {
  Producto: ["Características", "Precios", "Changelog", "Roadmap"],
  Empresa: ["Nosotros", "Blog", "Carreras", "Prensa"],
  Legal: ["Privacidad", "Términos", "Cookies", "Seguridad"],
};

function Footer() {
  return (
    <footer
      className="py-16 px-6 md:px-12"
      style={{ background: "#080C18", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p
              className="mt-3 text-sm leading-relaxed max-w-xs"
              style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}
            >
              Tu dinero, finalmente claro. La app de finanzas personales hecha para México.
            </p>
          </div>
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <p
                className="text-xs font-semibold mb-4 tracking-widest uppercase"
                style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
              >
                {section}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors duration-150 hover:text-white"
                      style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-sm" style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}>
            © 2024 Lana Technologies S. de R.L. de C.V. Todos los derechos reservados.
          </p>
          <p className="text-sm" style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}>
            Hecho con ❤️ en México
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main style={{ background: "#0A0F1E" }}>
      <Navbar />
      <Hero />
      <Features />
      <SocialProof />
      <Pricing />
      <Footer />
      {/* Client-side: scroll reveal + back-to-top */}
      <LandingPolish />
    </main>
  );
}
