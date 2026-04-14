import { CourierJobDetailPage } from "@/components/courier";

export default async function CourierJobDetailRoute({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <CourierJobDetailPage assignmentId={assignmentId} />;
}
