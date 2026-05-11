import OrderStatus from "@/components/OrderStatus";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  return <OrderStatus sessionId={sessionId} clearCart />;
}
