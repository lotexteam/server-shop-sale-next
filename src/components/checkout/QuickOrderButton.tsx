"use client";

import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShop } from "@/store/shop";
import type { Product } from "@/data/types";

/**
 * Заказ в 1 клик: добавляет позиции в корзину и сразу перенаправляет
 * на оформление заказа.
 */

export type QuickOrderItem = { product: Product; qty: number };

export function QuickOrderButton({
  items,
  label = "Заказать в 1 клик",
  variant = "outline",
  className,
}: {
  items: QuickOrderItem[];
  label?: string;
  variant?: "outline" | "secondary" | "gradient";
  className?: string;
}) {
  const router = useRouter();
  const { addToCart } = useShop();

  const go = () => {
    items.forEach((i) => addToCart(i.product, i.qty));
    router.push("/checkout");
  };

  return (
    <Button variant={variant} className={className} onClick={go}>
      <Zap className="size-4" /> {label}
    </Button>
  );
}
