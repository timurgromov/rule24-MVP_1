import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, TrendingDown, Clock } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">R</div>
          <span className="text-lg font-semibold">Rule24</span>
        </div>
        <Button variant="ghost" onClick={() => navigate('/login')}>Войти</Button>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-safe px-4 py-1.5 text-sm text-safe-foreground mb-8">
          <ShieldCheck className="h-4 w-4" />
          Для частных психологов и консультантов
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 text-balance leading-tight">
          Вы теряете деньги на поздних отменах и неявках
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto text-balance">
          Rule24 автоматизирует правило 24 часов и делает финансовую дисциплину прозрачной — без неловких разговоров о деньгах.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="hero" size="lg" onClick={() => navigate('/login')}>
            Получить ранний доступ
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/demo')}>
            Посмотреть демо
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: TrendingDown, title: "Видимость потерь", desc: "Сразу видно, сколько денег потеряно за месяц из-за отмен и неявок." },
            { icon: Clock, title: "Правило 24 часов", desc: "Автоматическое отслеживание поздних отмен. Без ручного контроля." },
            { icon: ShieldCheck, title: "Без неловкости", desc: "Система напоминает об оплате вместо вас. Вы остаётесь в роли специалиста." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 space-y-3">
              <div className="rounded-lg bg-accent p-2 w-fit">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-6 space-y-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">Ранний доступ</p>
            <p className="text-3xl font-bold text-foreground">Бесплатно</p>
            <p className="text-sm text-muted-foreground">1 месяц</p>
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">После запуска</p>
            <p className="text-3xl font-bold text-foreground">1 490 ₽</p>
            <p className="text-sm text-muted-foreground">в месяц</p>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Одна поздняя отмена обычно стоит дороже, чем месяц сервиса.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 Rule24. Сфокусированный инструмент финансовой дисциплины.
      </footer>
    </div>
  );
}
