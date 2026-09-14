"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Download, MapPin, MessageCircle, Phone, Send, FileText } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { submitContactRequest, StorefrontApiError, type ShopContacts } from "@/lib/api";
import { useContacts } from "@/hooks/useContacts";
import { SALE_CONTACTS } from "@/data/info";
import { REQUISITES, REQUISITES_PDF } from "@/data/requisites";
import { FAQ } from "@/data/faq";

/**
 * «Контакты» — концепция оригинала: карта 700px, поверх неё наложена белая
 * карточка .contacts-box (заголовок, ИНН/ОГРН, кнопка реквизитов, контакты).
 * В карточку также вписаны реквизиты. Ниже — FAQ (60%) и обратная связь (40%).
 */

const YANDEX_MAP_SRC =
  "https://api-maps.yandex.ru/services/constructor/1.0/js/?um=constructor%3A6f2cdef43de76ac71dbae0e258a646a4b515d98759630aa203f5122a5c689dd9&width=100%25&height=700&lang=ru_RU&scroll=true";

function YandexMap() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.childElementCount > 0) return;
    const s = document.createElement("script");
    s.src = YANDEX_MAP_SRC;
    s.async = true;
    s.charset = "utf-8";
    el.appendChild(s);
  }, []);
  return (
    <div className="relative h-[700px] w-full overflow-hidden">
      <div ref={ref} className="absolute inset-0" />
    </div>
  );
}

function ContactInfo({ contacts }: { contacts: ShopContacts | null }) {
  const phones = contacts?.phones?.length ? contacts.phones : [...SALE_CONTACTS.phones];
  const email = contacts?.email || SALE_CONTACTS.email;
  const address = contacts?.address || SALE_CONTACTS.address;
  return (
    <div className="space-y-1.5 text-body-sm">
      <p>
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Phone className="size-3.5" /> Телефон:
        </span>{" "}
        {phones.map((p, i) => (
          <span key={p}>
            {i > 0 && ", "}
            <a href={`tel:${p.replace(/\D+/g, "")}`} className="hover:text-accent">
              {p}
            </a>
          </span>
        ))}{" "}
        <a href={SALE_CONTACTS.viber} className="ml-1 inline-flex items-center gap-1 text-primary hover:text-accent" aria-label="Viber">
          <MessageCircle className="size-3.5" /> Viber
        </a>{" "}
        <a href={SALE_CONTACTS.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:text-accent" aria-label="WhatsApp">
          <MessageCircle className="size-3.5" /> WhatsApp
        </a>
      </p>
      <p>
        <span className="font-semibold text-foreground">Электронная почта:</span>{" "}
        <a href={`mailto:${email}`} className="hover:text-accent">{email}</a>
      </p>
      <p>
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <MapPin className="size-3.5" /> Адрес:
        </span>{" "}
        {address}
      </p>
      <p>
        <span className="font-semibold text-foreground">Рабочие дни:</span> {SALE_CONTACTS.workDays},{" "}
        <span className="font-semibold text-foreground">часы:</span> {SALE_CONTACTS.workHours}
      </p>
    </div>
  );
}

function FeedbackForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;
    if (!name.trim() || !message.trim()) {
      setError("Укажите имя и текст сообщения.");
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
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        message: message.trim(),
        source: "contacts_feedback",
      });
      setState("success");
    } catch (err) {
      setState("idle");
      setError(
        err instanceof StorefrontApiError
          ? err.message
          : "Не удалось отправить сообщение. Попробуйте позже или позвоните нам.",
      );
    }
  };

  if (state === "success") {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <h3 className="text-h5 font-bold">Сообщение отправлено</h3>
        <p className="max-w-sm text-body-sm text-muted-foreground">
          Спасибо! Ответим вам в рабочее время: Пн–Пт, 10:00–18:00.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card">
      <h2 className="text-h5 font-bold">Обратная связь</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="fb-name">Ваше имя</Label>
          <Input id="fb-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="fb-phone">Телефон</Label>
          <Input id="fb-phone" className="mt-1" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="fb-email">E-mail</Label>
        <Input id="fb-email" className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-1 flex-col">
        <Label htmlFor="fb-message">Сообщение</Label>
        <textarea
          id="fb-message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full flex-1 resize-y rounded-md border border-input bg-card px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="fb-agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} />
        <Label htmlFor="fb-agree" className="text-caption font-normal leading-snug text-muted-foreground">
          Даю согласие на обработку персональных данных (№152-ФЗ).
        </Label>
      </div>
      {error && <p className="text-body-sm text-destructive">{error}</p>}
      <Button type="submit" variant="gradient" className="w-full" disabled={state === "loading"}>
        <Send className="size-4" /> {state === "loading" ? "Отправляем…" : "Отправить сообщение"}
      </Button>
    </form>
  );
}

export function ContactsPage() {
  const { contacts } = useContacts();

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "Контакты" }]} className="mb-4" />

      {/* Карта с наложенной карточкой контактов + реквизитов (как в оригинале) */}
      <div className="relative">
        <YandexMap />
        <div className="relative z-10 mx-3 mt-3 w-auto rounded-[3px] bg-white p-5 shadow-[0_1px_4px_0_rgba(0,0,0,0.2)] md:absolute md:left-4 md:top-4 md:m-0 md:max-h-[calc(100%-2rem)] md:w-[400px] md:overflow-auto">
          <h1 className="text-[22px] font-bold uppercase leading-tight text-[#062531]">
            Контакты ООО «МВГ Групп»
          </h1>
          <p className="mt-1.5 text-body-sm text-muted-foreground">ИНН 7704390247 / ОГРН 1177746099255</p>
          <Button asChild size="sm" variant="gradient" className="mt-3">
            <a href={REQUISITES_PDF} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" /> Скачать полные реквизиты
            </a>
          </Button>

          <h2 className="mb-2 mt-4 text-h6 font-bold">Контактная информация</h2>
          <ContactInfo contacts={contacts} />

          <h2 className="mb-2 mt-5 flex items-center gap-1.5 text-h6 font-bold">
            <FileText className="size-4" /> Реквизиты
          </h2>
          <dl className="space-y-1.5 text-caption leading-snug">
            {REQUISITES.map(([k, v]) => (
              <div key={k}>
                <dt className="inline font-semibold text-foreground">{k}: </dt>
                <dd className="inline text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* FAQ 60% + обратная связь 40% */}
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-h4 font-bold">Частые вопросы</h2>
          <Accordion type="single" collapsible className="surface-card px-5">
            {FAQ.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left">{q}</AccordionTrigger>
                <AccordionContent>{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div className="lg:col-span-2">
          <FeedbackForm />
        </div>
      </div>
    </div>
  );
}
