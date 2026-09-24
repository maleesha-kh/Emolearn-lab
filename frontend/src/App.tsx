import { useState, useEffect, useRef } from "react";
import type { Scr, Mood, Player, RoundCreate } from "./types";
import { ROUNDS } from "./data/rounds";
import { rollRoundImages } from "./lib/imageBank";
import type { PredictionResult } from "./lib/predictionClient";
import { getPlayer, startSession, saveRound, finishSession } from "./lib/api";
import { AVATARS } from "./data/avatars";
import { BADGES } from "./data/badges";
import { GLOBAL_STYLES } from "./styles/animations";

import { BadgeModal } from "./components/common/BadgeModal";
import { BottomNav, SCREENS_WITHOUT_NAV } from "./components/common/BottomNav";

import { WelcomeScreen } from "./screens/WelcomeScreen";
import { HowToPlayScreen } from "./screens/HowToPlayScreen";
import { MoodCheckInScreen } from "./screens/MoodCheckInScreen";
import { HappyResponseScreen } from "./screens/responses/HappyResponseScreen";
import { SadResponseScreen } from "./screens/responses/SadResponseScreen";
import { AngryResponseScreen } from "./screens/responses/AngryResponseScreen";
import { SurprisedResponseScreen } from "./screens/responses/SurprisedResponseScreen";
import { GameStartScreen } from "./screens/game/GameStartScreen";
import { GameRoundScreen } from "./screens/game/GameRoundScreen";
import { LoadingScreen } from "./screens/game/LoadingScreen";
import { ResultCorrectScreen } from "./screens/game/ResultCorrectScreen";
import { ResultWrongScreen } from "./screens/game/ResultWrongScreen";
import { TransCorrectScreen } from "./screens/game/TransCorrectScreen";
import { TransWrongScreen } from "./screens/game/TransWrongScreen";
import { SummaryScreen } from "./screens/SummaryScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AchievementsScreen } from "./screens/AchievementsScreen";
import { DictionaryScreen } from "./screens/DictionaryScreen";
import { PinScreen } from "./screens/PinScreen";
import { ParentScreen } from "./screens/ParentScreen";

const PLAYER_ID_KEY = "emolearn_player_id";

export default function App() {
  const [screen, setScreen] = useState<Scr>("welcome");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [savedPlayer, setSavedPlayer] = useState<Player | null>(null);
  const [checkingSavedPlayer, setCheckingSavedPlayer] = useState(
    () => !!localStorage.getItem(PLAYER_ID_KEY)
  );
  const [soundOn, setSoundOn] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [roundResults, setRoundResults] = useState<boolean[]>([]);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [badgeIndex, setBadgeIndex] = useState(0);
  const [badgePopupReady, setBadgePopupReady] = useState(false);

  // Ref (not state) because saveRound/finishSession must await the exact
  // in-flight start/save calls, not a possibly-stale state value, and the
  // synchronous assignment doubles as a double-tap/double-effect guard.
  const sessionPromiseRef = useRef<ReturnType<typeof startSession> | null>(null);
  const roundPromisesRef = useRef<Promise<unknown>[]>([]);

  // Images for the current round — rolled once per round (not on every
  // re-render), then reused unchanged across the round screen, the loading
  // screen, and whichever result screen follows, so the "AI vision" overlay
  // always matches the exact photo the child tapped.
  const [roundImages, setRoundImages] = useState<string[]>(() => rollRoundImages(ROUNDS[0].opts));
  useEffect(() => {
    setRoundImages(rollRoundImages(ROUNDS[currentRound].opts));
  }, [currentRound]);

  useEffect(() => {
    const storedId = localStorage.getItem(PLAYER_ID_KEY);
    if (!storedId) return;
    getPlayer(storedId).then((res) => {
      if (res.kind === "ok") {
        setSavedPlayer(res.data);
      } else if (res.status === 404) {
        localStorage.removeItem(PLAYER_ID_KEY);
      }
      setCheckingSavedPlayer(false);
    });
  }, []);

  const go = (s: Scr) => setScreen(s);
  const home = () => go("welcome");

  const loginPlayer = (player: Player) => {
    setCurrentPlayer(player);
    localStorage.setItem(PLAYER_ID_KEY, player.id);
    go("moodcheckin");
  };

  const forgetSavedPlayer = () => {
    setSavedPlayer(null);
    localStorage.removeItem(PLAYER_ID_KEY);
  };

  const switchPlayer = () => {
    setCurrentPlayer(null);
    setSavedPlayer(null);
    localStorage.removeItem(PLAYER_ID_KEY);
    go("welcome");
  };

  const handleMood = (m: Mood) => {
    setSelectedMood(m);
    go(`res-${m}` as Scr);
  };

  // The sole place a game's session is created — every response screen's
  // onReady routes here, and Play Again always leads back through mood
  // check-in to a response screen, so this is the one choke point a new
  // game passes through. The ref assignment happens synchronously before
  // any await, so a double-tap or a double-invoked dev-mode effect still
  // only starts one session.
  const handleReadyToPlay = () => {
    go("gamestart");
    if (!currentPlayer || sessionPromiseRef.current) return;
    roundPromisesRef.current = [];
    sessionPromiseRef.current = startSession({ player_id: currentPlayer.id, mood_checkin: selectedMood });
    sessionPromiseRef.current.then((res) => {
      if (res.kind !== "ok") console.warn("startSession failed", res.status);
    });
  };

  const handleCardSelect = (idx: number) => {
    setSelectedCard(idx);
    go("loading");
  };

  const saveRoundForCurrentSession = async (payload: RoundCreate) => {
    if (!sessionPromiseRef.current) {
      console.warn("saveRound skipped: no active session");
      return;
    }
    const sessionRes = await sessionPromiseRef.current;
    if (sessionRes.kind !== "ok") {
      console.warn("saveRound skipped: session failed to start");
      return;
    }
    const res = await saveRound(sessionRes.data.id, payload);
    if (res.kind !== "ok") console.warn("saveRound failed", res.status);
  };

  const handleLoadingDone = (result: PredictionResult) => {
    const r = ROUNDS[currentRound];
    // The child's pick decides the star (each image's emotion is known from
    // its dataset folder). The model's own prediction and explanation for
    // that image are what the result screens show, including when the AI
    // disagrees with the child.
    const correct = selectedCard === r.correct;
    setLastCorrect(correct);
    setPrediction(result);
    if (correct) setScore((s) => s + 1);
    setRoundResults((rs) => [...rs, correct]);
    go(correct ? "r-correct" : "r-wrong");

    roundPromisesRef.current.push(
      saveRoundForCurrentSession({
        round_no: currentRound + 1,
        target_emotion: r.find.toLowerCase() as Mood,
        chosen_image: roundImages[selectedCard ?? 0],
        child_correct: correct,
        predicted_emotion: result.emotion,
        confidence: result.confidence,
      })
    );
  };

  const handleLoadingBack = () => {
    setSelectedCard(null);
    go("gameround");
  };

  const handleNext = () => {
    go(lastCorrect ? "t-correct" : "t-wrong");
  };

  const handleContinue = async () => {
    const nextRound = currentRound + 1;
    if (nextRound >= ROUNDS.length) {
      setBadgePopupReady(false);

      await Promise.allSettled(roundPromisesRef.current);

      const sessionRes = sessionPromiseRef.current ? await sessionPromiseRef.current : null;
      if (sessionRes && sessionRes.kind === "ok") {
        const finishRes = await finishSession(sessionRes.data.id);
        if (finishRes.kind === "ok") {
          setNewBadges(finishRes.data.new_badges.filter((id) => BADGES.some((b) => b.id === id)));
        } else {
          console.warn("finishSession failed", finishRes.status);
          setNewBadges([]);
        }
      } else {
        setNewBadges([]);
      }
      setBadgeIndex(0);
      go("summary");
    } else {
      setCurrentRound(nextRound);
      setSelectedCard(null);
      go("gameround");
    }
  };

  const handlePlayAgain = () => {
    setCurrentRound(0);
    setScore(0);
    setRoundResults([]);
    setSelectedCard(null);
    setNewBadges([]);
    setBadgeIndex(0);
    setBadgePopupReady(false);
    sessionPromiseRef.current = null;
    roundPromisesRef.current = [];
    go("moodcheckin");
  };

  const toggleSound = () => setSoundOn((s) => !s);
  const round = ROUNDS[currentRound];
  const tappedEmotion: Mood | null = selectedCard !== null ? round.opts[selectedCard] : null;

  // Delay the first badge popup so the child sees their stars on the
  // Summary screen before anything else appears on top of them.
  useEffect(() => {
    if (screen !== "summary" || newBadges.length === 0) return;
    const timer = setTimeout(() => setBadgePopupReady(true), 1000);
    return () => clearTimeout(timer);
  }, [screen, newBadges]);

  const currentBadgeId = badgePopupReady ? newBadges[badgeIndex] : undefined;
  const currentBadge = currentBadgeId ? BADGES.find((b) => b.id === currentBadgeId) : undefined;

  const handleBadgeModalClose = () => {
    if (badgeIndex + 1 < newBadges.length) {
      setBadgeIndex((i) => i + 1);
    } else {
      setNewBadges([]);
      setBadgeIndex(0);
      setBadgePopupReady(false);
    }
  };

  const screens: Record<Scr, React.ReactNode> = {
    welcome: (
      <WelcomeScreen
        checking={checkingSavedPlayer}
        savedPlayer={savedPlayer}
        onLogin={loginPlayer}
        onForget={forgetSavedPlayer}
      />
    ),
    howtoplay: <HowToPlayScreen onStart={() => go("moodcheckin")} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    moodcheckin: <MoodCheckInScreen onSelect={handleMood} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-happy": <HappyResponseScreen playerName={currentPlayer?.nickname ?? ""} onReady={handleReadyToPlay} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-sad": <SadResponseScreen onReady={handleReadyToPlay} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-angry": <AngryResponseScreen onReady={handleReadyToPlay} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-surprised": <SurprisedResponseScreen onReady={handleReadyToPlay} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    gamestart: <GameStartScreen onStart={() => go("gameround")} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    gameround: <GameRoundScreen round={currentRound} score={score} images={roundImages} onSelect={handleCardSelect} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    loading: <LoadingScreen imageUrl={roundImages[selectedCard ?? 0]} trueEmotion={tappedEmotion ?? round.opts[0]} onDone={handleLoadingDone} onBack={handleLoadingBack} />,
    "r-correct": prediction && <ResultCorrectScreen round={currentRound} score={score} selectedIdx={selectedCard ?? 0} images={roundImages} prediction={prediction} onNext={handleNext} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "r-wrong": prediction && <ResultWrongScreen round={currentRound} score={score} selectedIdx={selectedCard ?? 0} images={roundImages} prediction={prediction} onNext={handleNext} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "t-correct": <TransCorrectScreen score={score} onContinue={handleContinue} />,
    "t-wrong": <TransWrongScreen score={score} onContinue={handleContinue} />,
    summary: (
      <SummaryScreen
        playerName={currentPlayer?.nickname ?? ""}
        score={score}
        roundResults={roundResults}
        onPlayAgain={handlePlayAgain}
        onBye={() => { handlePlayAgain(); go("welcome"); }}
        onHome={home}
        soundOn={soundOn}
        onSound={toggleSound}
      />
    ),
    profile: (
      <ProfileScreen
        playerId={currentPlayer?.id ?? ""}
        playerName={currentPlayer?.nickname ?? ""}
        avatarId={currentPlayer?.avatar_id ?? AVATARS[0].id}
        onNewGame={handlePlayAgain}
        onHome={home}
        soundOn={soundOn}
        onSound={toggleSound}
        onParent={() => go("pin")}
        onAchievements={() => go("achievements")}
        onSwitchPlayer={switchPlayer}
      />
    ),
    achievements: <AchievementsScreen playerId={currentPlayer?.id ?? ""} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    dictionary: <DictionaryScreen onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    pin: <PinScreen onSuccess={() => go("parent")} onBack={() => go("profile")} />,
    parent: <ParentScreen playerName={currentPlayer?.nickname ?? ""} onBack={() => go("profile")} />,
  };

  // Guard: without a logged-in player, only the welcome screen may show —
  // covers stale navigation state (e.g. BottomNav) after a switch-player.
  const effectiveScreen: Scr = !currentPlayer && screen !== "welcome" ? "welcome" : screen;
  const showNav = !SCREENS_WITHOUT_NAV.includes(effectiveScreen);

  return (
    <div className="min-h-screen w-full font-nunito" style={{ fontFamily: "'Nunito',sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      {showNav && <BottomNav screen={effectiveScreen} onNavigate={go} />}

      <div style={{ paddingBottom: showNav ? "72px" : "0" }}>{screens[effectiveScreen]}</div>

      {currentBadge && <BadgeModal badge={currentBadge} onClose={handleBadgeModalClose} />}
    </div>
  );
}