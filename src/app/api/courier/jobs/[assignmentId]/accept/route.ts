import { handleCourierAssignmentActionRoute } from "@/server/courier/action-route";

export const runtime = "nodejs";

export async function POST(
  request: Parameters<typeof handleCourierAssignmentActionRoute>[0],
  context: Parameters<typeof handleCourierAssignmentActionRoute>[1],
) {
  return handleCourierAssignmentActionRoute(request, context, "accept");
}
