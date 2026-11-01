import { getDatabase } from "@/db";
import { files, milestones, submissions } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** File download for milestone members. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fileId = Number(id);
  if (!Number.isInteger(fileId)) return new NextResponse("bad id", { status: 400 });

  const user = await getSessionUser();
  if (!user) return new NextResponse("unauthenticated", { status: 401 });

  const db = getDatabase();
  const row = db.select().from(files).where(eq(files.id, fileId)).get();
  if (!row) return new NextResponse("not found", { status: 404 });

  const memberRow = db
    .select({ clientId: milestones.clientId, freelancerId: milestones.freelancerId })
    .from(files)
    .innerJoin(submissions, eq(files.submissionId, submissions.id))
    .innerJoin(milestones, eq(submissions.milestoneId, milestones.id))
    .where(eq(files.id, fileId))
    .get();
  if (!memberRow) return new NextResponse("not found", { status: 404 });
  if (memberRow.clientId !== user.id && memberRow.freelancerId !== user.id) {
    return new NextResponse("forbidden", { status: 403 });
  }

  return new NextResponse(row.data as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(row.sizeBytes),
      "Content-Disposition": `inline; filename="${row.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
