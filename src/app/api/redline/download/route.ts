import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const filename = url.searchParams.get("filename") || "redlined-document.docx";
    
    if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      return new NextResponse("Invalid download ID", { status: 400 });
    }
    
    const tmpPath = path.join(os.tmpdir(), `redline-${id}.docx`);
    
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(tmpPath);
    } catch {
      return new NextResponse("File not found or expired", { status: 404 });
    }
    
    // Optional: cleanup tmp file after reading
    fs.unlink(tmpPath).catch(() => {});
    
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });

  } catch (err: any) {
     return new NextResponse("Server error: " + err.message, { status: 500 });
  }
}
