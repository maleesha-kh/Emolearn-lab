import { beforeEach, describe, expect, it, vi } from "vitest";

let api: typeof import("./api");
const fetchMock = vi.fn();

beforeEach(async () => {
  vi.stubEnv("VITE_API_URL", "http://api.test");
  vi.resetModules();
  api = await import("./api");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: url as string, init: init as RequestInit, headers: new Headers((init as RequestInit).headers) };
};

describe("request handling", () => {
  it("returns ok with the parsed body", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "p1", nickname: "Mia", avatar_id: "cat" }]));
    const res = await api.getPlayers();
    expect(res).toEqual({ kind: "ok", data: [{ id: "p1", nickname: "Mia", avatar_id: "cat" }] });
    expect(lastCall().url).toBe("http://api.test/players");
  });

  it("sends JSON bodies with a JSON content type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "p1", nickname: "Mia", avatar_id: "cat" }, 201));
    await api.createPlayer({ nickname: "Mia", avatar_id: "cat" });
    const { init, headers } = lastCall();
    expect(init.method).toBe("POST");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ nickname: "Mia", avatar_id: "cat" });
  });

  it.each([400, 404, 422, 500])("returns an error with status %i and the error body", async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "bad" }, status));
    expect(await api.getPlayer("p1")).toEqual({ kind: "error", status, body: { detail: "bad" } });
  });

  it("keeps the status when an error body isn't JSON", async () => {
    fetchMock.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));
    expect(await api.getPlayer("p1")).toEqual({ kind: "error", status: 500, body: undefined });
  });

  it("returns status null on a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await api.getPlayers()).toEqual({ kind: "error", status: null });
  });

  it("treats 204 No Content as success without reading a body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await api.deletePlayer("p1", "1234")).toEqual({ kind: "ok", data: undefined });
  });

  it("returns an error when a success body is malformed JSON", async () => {
    fetchMock.mockResolvedValue(new Response("{broken", { status: 200 }));
    expect(await api.getProfile("p1")).toEqual({ kind: "error", status: 200 });
  });
});

describe("parent PIN header", () => {
  it.each([
    ["getDashboard", () => api.getDashboard("p1", "4321"), "/players/p1/dashboard", "GET"],
    ["updatePlayer", () => api.updatePlayer("p1", { nickname: "Kai" }, "4321"), "/players/p1", "PATCH"],
    ["deletePlayer", () => api.deletePlayer("p1", "4321"), "/players/p1", "DELETE"],
    ["getDiary", () => api.getDiary("p1", "4321"), "/players/p1/diary?limit=50", "GET"],
    ["deleteDiaryEntry", () => api.deleteDiaryEntry("p1", 7, "4321"), "/players/p1/diary/7", "DELETE"],
    ["getDiaryTips", () => api.getDiaryTips("p1", 7, "4321"), "/players/p1/diary/7/tips", "POST"],
    ["getBuddyMessages", () => api.getBuddyMessages("p1", "4321"), "/players/p1/buddy/messages?limit=30", "GET"],
    ["deleteBuddyMessage", () => api.deleteBuddyMessage("p1", 3, "4321"), "/players/p1/buddy/messages/3", "DELETE"],
    ["clearBuddyMessages", () => api.clearBuddyMessages("p1", "4321"), "/players/p1/buddy/messages", "DELETE"],
  ])("%s sends X-Parent-Pin", async (_name, call, path, method) => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await call();
    const { url, init, headers } = lastCall();
    expect(url).toBe(`http://api.test${path}`);
    expect(init.method ?? "GET").toBe(method);
    expect(headers.get("X-Parent-Pin")).toBe("4321");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not send the PIN header on child requests", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.getProfile("p1");
    await api.askEmo("p1", "Why do I cry?");
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers((init as RequestInit).headers).has("X-Parent-Pin")).toBe(false);
    }
  });

  it("sends the PIN in the body, not a header, for PIN verification", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ valid: true }));
    await api.verifyPin("1234");
    const { init, headers } = lastCall();
    expect(JSON.parse(init.body as string)).toEqual({ pin: "1234" });
    expect(headers.has("X-Parent-Pin")).toBe(false);
  });
});

describe("downloadReportCsv", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
  });

  it("fetches with the PIN header and saves the file under the server's filename", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      new Response("a,b\n", { status: 200, headers: { "Content-Disposition": 'attachment; filename="mia_report.csv"' } })
    );
    expect(await api.downloadReportCsv("p1", "4321")).toEqual({ kind: "ok", data: undefined });
    expect(new Headers(lastCall().init.headers).get("X-Parent-Pin")).toBe("4321");
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("mia_report.csv");
    expect(link.href).toBe("blob:report");
  });

  it("returns the status on a rejected PIN without downloading", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    expect(await api.downloadReportCsv("p1", "0000")).toEqual({ kind: "error", status: 403 });
    expect(click).not.toHaveBeenCalled();
  });

  it("returns status null on a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await api.downloadReportCsv("p1", "4321")).toEqual({ kind: "error", status: null });
  });
});
