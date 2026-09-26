# Source audit (2026-09-26T23:37:28+05:30, commit 7410ed724cfbf85a452dc75e384c374ba8c12985)

Searches run by backend/scripts/nfr2_evidence.py (Python regular expressions, line by line).

## Capture and file APIs in frontend/src and index.html
pattern: `getUserMedia|mediaDevices|MediaRecorder|type=[\"']file[\"']|capture=|toDataURL|toBlob|createImageBitmap|<canvas|getContext\(|SpeechRecognition|webkitSpeech|navigator\.geolocation|FileReader|showOpenFilePicker|clipboard\.read`
(no matches)

## Network calls
pattern: `fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource`
frontend/src/lib/api.ts:35: response = await fetch(`${API_URL}${path}`, {
frontend/src/lib/api.ts:93: response = await fetch(`${API_URL}/players/${playerId}/report.csv`, { headers: { "X-Parent-Pin": pin } });
frontend/src/lib/predictionClient.ts:77: imageBlob = await (await fetch(imageUrl)).blob();
frontend/src/lib/predictionClient.ts:87: response = await fetch(`${API_URL}/predict`, { method: "POST", body: form });

## External URLs in frontend/src and index.html (the SVG namespace is not a network call)
pattern: `https?://(?!localhost|127\.0\.0\.1)`
frontend/src/components/common/EmoRobot.tsx:93: <svg viewBox="0 0 260 225" width={width} height={width*225/260} className={className} xmlns="http://www.w3.org/2000/svg">

## Where /predict images come from
pattern: `imageUrl|images: rollRoundImages|/images/characters/\$\{emotion\}`
frontend/src/App.tsx:364: loading: <LoadingScreen imageUrl={round.images[selectedCard ?? 0]} trueEmotion={tappedEmotion ?? round.opts[0]} onDone={handleLoadingDone} onBack={handleLoadingBack} />,
frontend/src/lib/game.ts:18: return { ...round, opts, images: rollRoundImages(opts) };
frontend/src/lib/imageBank.ts:25: return `/images/characters/${emotion}/${fileName(emotion, variant)}`;
frontend/src/lib/predictionClient.ts:49: imageUrl: string; // used by the real API
frontend/src/lib/predictionClient.ts:74: async function fetchPrediction(imageUrl: string): Promise<PredictionApiResponse> {
frontend/src/lib/predictionClient.ts:77: imageBlob = await (await fetch(imageUrl)).blob();
frontend/src/lib/predictionClient.ts:117: const api = await fetchPrediction(request.imageUrl);
frontend/src/screens/game/LoadingScreen.tsx:13: export function LoadingScreen({imageUrl,trueEmotion,onDone,onBack}:{imageUrl:string;trueEmotion:Mood;onDone:(result:PredictionResult)=>void;onBack:()=>void}){
frontend/src/screens/game/LoadingScreen.tsx:23: Promise.all([getPrediction({imageUrl,trueEmotion}),minDelay])
frontend/src/screens/game/LoadingScreen.tsx:32: },[imageUrl,trueEmotion,attempt]);

## Speech (reads fixed text only)
pattern: `\bspeak\(`
frontend/src/components/dictionary/MeetTheFeeling.tsx:24: else speak(`${info.label}. ${entry.meaning}`);

## Backend: debug images setting
pattern: `DEBUG_SAVE_IMAGES`
backend/app/api/routes/predict.py:65: return run_prediction(pil_image, save_debug=config.DEBUG_SAVE_IMAGES, started=total_start)
backend/app/core/config.py:29: DEBUG_SAVE_IMAGES = False

## Backend: file writes on the /predict path
pattern: `\.save\(|\bopen\(`
backend/app/api/routes/predict.py:58: pil_image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
backend/app/api/routes/predict.py:213: prepared.rgba.save(os.path.join(DEBUG_DIR, f"{prefix}_rgba.png"))
backend/app/api/routes/predict.py:214: face_crop.save(os.path.join(DEBUG_DIR, f"{prefix}_face_crop.png"))
backend/app/api/routes/predict.py:218: with open(os.path.join(DEBUG_DIR, f"{prefix}_heatmap.png"), "wb") as f:
backend/app/ml/face_branch/gradcam.py:113: overlay.save(buffer, format="PNG")
