"use client";
import { API_URL, syncAvailable } from "../sync/api";
import type { ExtractionResult, ReceiptReader } from "./types";

/** Asks the API to read the receipt. The API decides which service, or says none is connected. */
class ServerReader implements ReceiptReader {
  readonly name = "server";
  readonly available = true;

  async read(image: { dataUrl: string; fileName: string }): Promise<ExtractionResult> {
    try {
      const res = await fetch(`${API_URL}/receipts/read`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image)
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 501) return { status: "unavailable", message: (body as { error?: string }).error ?? "Reading receipts is not connected yet." };
      if (res.status === 401) return { status: "unavailable", message: "Sign in to have receipts read for you. You can still attach the photo and type the details." };
      if (!res.ok) return { status: "failed", message: (body as { error?: string }).error ?? "That receipt could not be read." };
      return { status: "extracted", receipt: body as import("./types").ExtractedReceipt };
    } catch {
      return { status: "failed", message: "Could not reach the server. You can still attach the photo and type the details." };
    }
  }
}

/** Used when there is no API at all, which is the case for anyone not signed in. */
class NotConnected implements ReceiptReader {
  readonly name = "none";
  readonly available = false;
  async read(): Promise<ExtractionResult> {
    return { status: "unavailable", message: "Reading receipts automatically is not switched on in this build. Attach the photo and type the details, which still keeps the paperwork with the money." };
  }
}

export const receiptReader = (): ReceiptReader => (syncAvailable() ? new ServerReader() : new NotConnected());
