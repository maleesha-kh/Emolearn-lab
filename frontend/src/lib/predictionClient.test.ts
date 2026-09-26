import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeApiResponse } from "../test/fixtures";

let client: typeof import("./predictionClient");
const fetchMock = vi.fn();
const imageBlob = new Blob(["png-bytes"], { type: "image/png" });

beforeEach(async () => {
  vi.stubEnv("VITE_USE_MOCK", "false");
  vi.stubEnv("VITE_API_URL", "http://api.test");
  vi.resetModules();
  client = await import("./predictionClient");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

// The image response hands back jsdom's own Blob; Node's Response.blob() would
// give a Blob that jsdom's FormData doesn't recognise
function respondWith(predict: () => Response | Promise<Response>) {
  fetchMock.mockImplementation((url: string) =>
    url.endsWith("/predict") ? Promise.resolve(predict()) : Promise.resolve({ blob: async () => imageBlob })
  );
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const request = { imageUrl: "/images/characters/sad/sad_v1_5.png", trueEmotion: "sad" as const };

async function kindOf(promise: Promise<unknown>) {
  const err = await promise.catch((e) => e);
  expect(err).toBeInstanceOf(client.PredictionError);
  return (err as InstanceType<typeof client.PredictionError>).kind;
}

describe("getPrediction", () => {
  it("fetches the image and posts it as a multipart file", async () => {
    respondWith(() => jsonResponse(makeApiResponse()));
    await client.getPrediction(request);

    expect(fetchMock).toHaveBeenNthCalledWith(1, request.imageUrl);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("http://api.test/predict");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    const file = form.get("file") as File;
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("character.png");
    expect(await file.text()).toBe("png-bytes");
  });

  it("does not force a Content-Type, so the browser can set the multipart boundary", async () => {
    respondWith(() => jsonResponse(makeApiResponse()));
    await client.getPrediction(request);
    const init = fetchMock.mock.calls[1][1];
    expect(init.headers).toBeUndefined();
  });

  it("maps the API response to what the screens use", async () => {
    const api = makeApiResponse();
    respondWith(() => jsonResponse(api));
    expect(await client.getPrediction(request)).toEqual({
      emotion: "sad",
      confidence: 0.64,
      mode: "fused",
      faceEmotion: "sad",
      poseEmotion: "angry",
      heatmapBase64: api.heatmap_base64,
      explanation: api.explanation,
    });
  });

  it("handles a face-only result without pose or explanation", async () => {
    const api = makeApiResponse({ mode: "face_only", pose: null, heatmap_base64: null });
    delete (api as Partial<typeof api>).explanation;
    respondWith(() => jsonResponse(api));
    const result = await client.getPrediction(request);
    expect(result.mode).toBe("face_only");
    expect(result.poseEmotion).toBeNull();
    expect(result.explanation).toBeNull();
    expect(result.heatmapBase64).toBeNull();
  });

  it.each([
    [400, "invalid_image"],
    [413, "too_large"],
    [422, "no_character"],
    [500, "server"],
    [503, "server"],
  ])("turns HTTP %i into a %s error", async (status, kind) => {
    respondWith(() => jsonResponse({ detail: "nope" }, status));
    expect(await kindOf(client.getPrediction(request))).toBe(kind);
  });

  it("reports a network error when the API can't be reached", async () => {
    respondWith(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await kindOf(client.getPrediction(request))).toBe("network");
  });

  it("reports a network error when the image itself can't be loaded", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await kindOf(client.getPrediction(request))).toBe("network");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives each error kind a child-friendly message", () => {
    expect(new client.PredictionError("too_large").message).toMatch(/too big/);
    expect(new client.PredictionError("network").message).toMatch(/internet/);
  });

  // Current behaviour: the JSON parse error escapes as a plain SyntaxError,
  // not a PredictionError. LoadingScreen shows it as a "server" error.
  it("rejects with the raw parse error when the response is malformed JSON", async () => {
    respondWith(() => new Response("<html>oops</html>", { status: 200 }));
    const err = await client.getPrediction(request).catch((e) => e);
    expect(err).toBeInstanceOf(SyntaxError);
    expect(err).not.toBeInstanceOf(client.PredictionError);
  });
});

describe("mock mode", () => {
  it("does not call fetch when VITE_USE_MOCK is true", async () => {
    vi.stubEnv("VITE_USE_MOCK", "true");
    vi.resetModules();
    const mocked = await import("./predictionClient");
    vi.useFakeTimers();
    const pending = mocked.getPrediction(request);
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(fetchMock).not.toHaveBeenCalled();
    expect(["happy", "sad", "angry", "surprised"]).toContain(result.emotion);
  });
});
