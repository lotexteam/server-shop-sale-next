"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { FileText, Send, CheckCircle2, ShoppingCart } from "lucide-react";
import { Section, SectionHeader } from "@/components/common/Section";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePageMeta } from "@/components/layout/DocumentHead";
import { useShop } from "@/store/shop";
import { submitContactRequest, StorefrontApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

/**
 * Запрос коммерческого предложения (аналог /commercial-proposal в sale):
 * состав из корзины + реквизиты компании → заявка менеджеру.
 */
export function ProposalPage() {
  usePageMeta(
    "Запрос коммерческого предложения",
    "Запросите коммерческое предложение на серверы и комплектующие — подготовим КП в течение рабочего дня.",
  );

  const { cart } = useShop();
  const [company, setCompany] = useState("");
  const [inn, setInn] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const itemsText = useMemo(
    () =>
      cart
        .map((line) => `• ${line.product.title}${line.product.sku ? ` (арт. ${line.product.sku})` : ""} × ${line.qty}`)
        .join("\n"),
    [cart],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;
    if (!name.trim() || !phone.trim()) {
      setError("Укажите имя и телефон для связи.");
      return;
    }
    if (!agree) {
      setError("Необходимо согласие на обработку персональных данных.");
      return;
    }
    setError(null);
    setState("loading");
    try {
      await submitContactRequest({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: [
          "Запрос коммерческого предложения.",
          company.trim() ? `Компания: ${company.trim()}${inn.trim() ? `, ИНН ${inn.trim()}` : ""}` : "",
          itemsText ? `Позиции:\n${itemsText}` : "",
          comment.trim(),
        ]
          .filter(Boolean)
          .join("\n"),
        source: "commercial_proposal",
      });
      setState("success");
    } catch (err) {
      setState("idle");
      setError(
        err instanceof StorefrontApiError
          ? err.message
          : "Не удалось отправить запрос. Попробуйте позже или позвоните: +7 (495) 260-88-68.",
      );
    }
  };

  return (
    <Section>
      <Breadcrumbs items={[{ label: "Коммерческое предложение" }]} className="mb-6" />
      <SectionHeader eyebrow="B2B" title="Запрос коммерческого предложения" as="h1" />

      {state === "success" ? (
        <div className="surface-card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
          <CheckCircle2 className="size-12 text-success" aria-hidden />
          <h2 className="text-h5 font-bold">Запрос отправлен</h2>
          <p className="max-w-md text-body-sm text-muted-foreground">
            Подготовим КП и отправим его в течение рабочего дня. Спасибо за интерес к нашей компании!
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
          {cart.length > 0 ? (
            <div className="surface-card p-4">
              <h2 className="flex items-center gap-2 text-h6 font-bold">
                <ShoppingCart className="size-5 text-primary" /> Состав из корзины
              </h2>
              <div className="mt-3 max-h-48 overflow-auto text-body-sm">
                {cart.map((line) => (
                  <div key={line.product.id} className="flex items-start justify-between gap-3 py-0.5">
                    <span className="min-w-0 truncate">{line.product.title} × {line.qty}</span>
                    <span className="shrink-0 font-semibold">
                      {line.product.onRequest
                        ? "Под заказ"
                        : formatPrice((line.product.price || 0) * line.qty)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              Корзина пуста — добавьте{" "}
              <Link  href="/catalog" className="text-primary underline-offset-2 hover:underline">товары из каталога</Link>{" "}
              или опишите нужное оборудование в комментарии.
            </p>
          )}

          <div className="surface-card space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cp-company">Компания</Label>
                <Input id="cp-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="ООО «…» (необязательно)" />
              </div>
              <div>
                <Label htmlFor="cp-inn">ИНН</Label>
                <Input id="cp-inn" value={inn} onChange={(e) => setInn(e.target.value)} inputMode="numeric" placeholder="Необязательно" />
              </div>
              <div>
                <Label htmlFor="cp-name">Контактное лицо</Label>
                <Input id="cp-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="cp-phone">Телефон</Label>
                <Input id="cp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cp-email">E-mail для получения КП</Label>
                <Input id="cp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="klient@company.ru" />
              </div>
            </div>
            <div>
              <Label htmlFor="cp-comment">Комментарий</Label>
              <textarea
                id="cp-comment"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Требования к конфигурации, сроки, бюджет…"
                className="mt-1.5 w-full rounded-md border border-input bg-card px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="cp-agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} />
              <Label htmlFor="cp-agree" className="text-caption font-normal leading-snug text-muted-foreground">
                Даю согласие на обработку персональных данных в соответствии с законом №152-ФЗ.
              </Label>
            </div>
            {error && <p className="text-body-sm text-destructive">{error}</p>}
            <Button type="submit" variant="gradient" size="lg" disabled={state === "loading"}>
              <FileText className="size-4" /> {state === "loading" ? "Отправляем…" : "Отправить запрос"}
            </Button>
            <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <Send className="size-3.5" /> Отвечаем в течение рабочего дня (Пн–Пт, 10:00–18:00).
            </p>
          </div>
        </form>
      )}
    </Section>
  );
}
