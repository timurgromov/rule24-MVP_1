import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = (location.state as { from?: string } | null)?.from ?? "/app";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "register") {
        await api.register({ email, password, name });
      } else {
        await api.login({ email, password });
      }
      navigate(nextPath, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Rule24</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Вход в аккаунт" : "Регистрация аккаунта"}
          </p>
        </div>

        <div className="flex rounded-lg border p-1">
          <Button
            type="button"
            variant={mode === "login" ? "default" : "ghost"}
            className="flex-1"
            onClick={() => setMode("login")}
          >
            Вход
          </Button>
          <Button
            type="button"
            variant={mode === "register" ? "default" : "ghost"}
            className="flex-1"
            onClick={() => setMode("register")}
          >
            Регистрация
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <Input
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Пароль (мин. 8 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Загрузка..."
              : mode === "login"
                ? "Войти"
                : "Создать аккаунт"}
          </Button>
        </form>
      </div>
    </div>
  );
}
