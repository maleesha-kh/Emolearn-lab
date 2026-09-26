import { useState, useEffect, useRef, useCallback } from "react";
import type { Scr, Mood, Player, RoundCreate, GameRound } from "./types";
import { buildGameRounds } from "./lib/game";
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
import { DiaryScreen } from "./screens/DiaryScreen";
import { AskEmoScreen } from "./screens/AskEmoScreen";
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
  // Kept only in memory while the parent area is open; the diary API needs it
  const [parentPin, setParentPin] = useState<string | null>(null);

  // Ref (not state) because saveRound/finishSession must await the exact
  // in-flight start/save calls, not a possibly-stale state value, and the
  // synchronous assignment doubles as a double-tap/double-effect guard.
  const sessionPromiseRef = useRef<ReturnType<typeof startSession> | null>(null);
  const roundPromisesRef = useRef<Promise<unknown>[]>([]);
  // Where to continue the game in progress, or null when there is none. A
  // ref so it's up to date even for a double-tap before state re-renders.
  const resumeScreenRef = useRef<Scr | null>(null);

  // Built once per game (round order, card order and images), so nothing
  // reshuffles on re-renders or when the child leaves and comes back.
  const [gameRounds, setGameRounds] = useState<GameRound[]>(() => buildGameRounds());

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

  const abandonGame = () => {
    resumeScreenRef.current = null;
    sessionPromiseRef.current = null;
    roundPromisesRef.current = [];
    setSelectedMood(null);
  };

  const loginPlayer = (player: Player) => {
    if (currentPlayer?.id !== player.id) abandonGame();
    setCurrentPlayer(player);
    localStorage.setItem(PLAYER_ID_KEY, player.id);
    go("moodcheckin");
  };

  const forgetSavedPlayer = () => {
    setSavedPlayer(null);
    localStorage.removeItem(PLAYER_ID_KEY);
  };

  const switchPlayer = () => {
    abandonGame();
    setCurrentPlayer(null);
    setSavedPlayer(null);
    localStorage.removeItem(PLAYER_ID_KEY);
    go("welcome");
  };

  const handleCurrentPlayerUpdated = (player: Player) => {
    setCurrentPlayer((prev) => (prev && prev.id === player.id ? player : prev));
    setSavedPlayer((prev) => (prev && prev.id === player.id ? player : prev));
  };

  const handleCurrentPlayerDeleted = (playerId: string) => {
    if (currentPlayer?.id === playerId) abandonGame();
    setCurrentPlayer((prev) => (prev && prev.id === playerId ? null : prev));
    setSavedPlayer((prev) => (prev && prev.id === playerId ? null : prev));
    if (localStorage.getItem(PLAYER_ID_KEY) === playerId) {
      localStorage.removeItem(PLAYER_ID_KEY);
    }
  };

  const handleMood = (m: Mood) => {
    setSelectedMood(m);
    go("diary");
  };

  // Saving, skipping or finishing the diary all continue where Mood used to
  const leaveDiary = () => go(selectedMood ? (`res-${selectedMood}` as Scr) : "moodcheckin");

  const clearBadges = () => {
    setNewBadges([]);
    setBadgeIndex(0);
    setBadgePopupReady(false);
  };

  // The only place a game and its session are created.
  const startNewGame = (mood: Mood | null) => {
    if (!currentPlayer) return;
    resumeScreenRef.current = "gamestart";
    setGameRounds(buildGameRounds());
    setCurrentRound(0);
    setScore(0);
    setRoundResults([]);
    setSelectedCard(null);
    setPrediction(null);
    setLastCorrect(false);
    clearBadges();
    roundPromisesRef.current = [];
    sessionPromiseRef.current = startSession({ player_id: currentPlayer.id, mood_checkin: mood });
    sessionPromiseRef.current.then((res) => {
      if (res.kind !== "ok") console.warn("startSession failed", res.status);
    });
    go("gamestart");
  };

  // Every way into a game goes through here: continue the one in progress,
  // otherwise start fresh. mood is null unless the child just checked in.
  const enterGame = (mood: Mood | null) => {
    if (resumeScreenRef.current) go(resumeScreenRef.current);
    else startNewGame(mood);
  };

  const handleNavigate = (s: Scr) => {
    if (s === "gamestart") enterGame(null);
    else go(s);
  };

  const handleCardSelect = (idx: number) => {
    resumeScreenRef.current = "gameround";
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
    const r = gameRounds[currentRound];
    // The child's pick decides the star (each image's emotion is known from
    // its dataset folder). The model's own prediction and explanation for
    // that image are what the result screens show, including when the AI
    // disagrees with the child.
    const correct = selectedCard !== null && r.opts[selectedCard] === r.emotion;
    setLastCorrect(correct);
    setPrediction(result);
    if (correct) setScore((s) => s + 1);
    setRoundResults((rs) => [...rs, correct]);
    // The answer is saved now, so coming back shows this result instead of
    // letting the round be played again.
    resumeScreenRef.current = correct ? "r-correct" : "r-wrong";
    go(resumeScreenRef.current);

    roundPromisesRef.current.push(
      saveRoundForCurrentSession({
        round_no: currentRound + 1,
        target_emotion: r.emotion,
        chosen_image: r.images[selectedCard ?? 0],
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
    if (nextRound >= gameRounds.length) {
      if (!resumeScreenRef.current) return;
      resumeScreenRef.current = null;
      setSelectedMood(null);
      setBadgePopupReady(false);

      await Promise.allSettled(roundPromisesRef.current);

      const sessionRes = sessionPromiseRef.current ? await sessionPromiseRef.current : null;
      if (roundResults.length !== gameRounds.length) {
        console.warn("finishSession skipped: only", roundResults.length, "rounds played");
        setNewBadges([]);
      } else if (sessionRes && sessionRes.kind === "ok") {
        const finishRes = await finishSession(sessionRes.data.id);
        if (finishRes.kind === "ok") {
          setNewBadges(finishRes.data.new_badges.filter((id) => BADGES.some((b) => b.id === id)));
        } else {
          console.warn("finishSession failed", finishRes.status);
          setNewBadges([]);
        }
      } else {
        console.warn(
          sessionPromiseRef.current
            ? "finishSession skipped: session failed to start"
            : "finishSession skipped: no active session"
        );
        setNewBadges([]);
      }
      setBadgeIndex(0);
      go("summary");
    } else {
      setCurrentRound(nextRound);
      setSelectedCard(null);
      resumeScreenRef.current = "gameround";
      go("gameround");
    }
  };

  const handlePlayAgain = () => {
    clearBadges();
    if (resumeScreenRef.current) go(resumeScreenRef.current);
    else go("moodcheckin");
  };

  const toggleSound = () => setSoundOn((s) => !s);
  const round = gameRounds[currentRound];
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

  // Badges earned outside a game (e.g. in Learn) join the same one-at-a-time
  // queue and show straight away, since there is no Summary screen to wait for.
  const showNewBadges = useCallback((ids: string[]) => {
    const known = ids.filter((id) => BADGES.some((b) => b.id === id));
    if (known.length === 0) return;
    setNewBadges((queue) => [...queue, ...known]);
    setBadgePopupReady(true);
  }, []);

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
    moodcheckin: <MoodCheckInScreen onSelect={handleMood} initialMood={selectedMood} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    diary: selectedMood && currentPlayer ? (
      <DiaryScreen
        playerId={currentPlayer.id}
        mood={selectedMood}
        onDone={leaveDiary}
        onBack={() => go("moodcheckin")}
        onHome={home}
        soundOn={soundOn}
        onSound={toggleSound}
      />
    ) : (
      <MoodCheckInScreen onSelect={handleMood} onHome={home} soundOn={soundOn} onSound={toggleSound} />
    ),
    "res-happy": <HappyResponseScreen playerName={currentPlayer?.nickname ?? ""} onReady={() => enterGame(selectedMood)} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-sad": <SadResponseScreen onReady={() => enterGame(selectedMood)} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-angry": <AngryResponseScreen onReady={() => enterGame(selectedMood)} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-surprised": <SurprisedResponseScreen onReady={() => enterGame(selectedMood)} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    gamestart: <GameStartScreen onStart={() => go("gameround")} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    gameround: <GameRoundScreen round={round} roundIndex={currentRound} totalRounds={gameRounds.length} score={score} onSelect={handleCardSelect} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    loading: <LoadingScreen imageUrl={round.images[selectedCard ?? 0]} trueEmotion={tappedEmotion ?? round.opts[0]} onDone={handleLoadingDone} onBack={handleLoadingBack} />,
    "r-correct": prediction && <ResultCorrectScreen round={round} roundIndex={currentRound} totalRounds={gameRounds.length} score={score} selectedIdx={selectedCard ?? 0} prediction={prediction} onNext={handleNext} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "r-wrong": prediction && <ResultWrongScreen round={round} roundIndex={currentRound} totalRounds={gameRounds.length} score={score} selectedIdx={selectedCard ?? 0} prediction={prediction} onNext={handleNext} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "t-correct": <TransCorrectScreen score={score} onContinue={handleContinue} />,
    "t-wrong": <TransWrongScreen score={score} onContinue={handleContinue} />,
    summary: (
      <SummaryScreen
        playerName={currentPlayer?.nickname ?? ""}
        score={score}
        rounds={gameRounds}
        roundResults={roundResults}
        onPlayAgain={handlePlayAgain}
        onBye={() => { clearBadges(); go("welcome"); }}
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
    dictionary: <DictionaryScreen playerId={currentPlayer?.id ?? ""} onHome={home} soundOn={soundOn} onSound={toggleSound} onPractice={() => enterGame(null)} onNewBadges={showNewBadges} onAskEmo={() => go("askemo")} />,
    askemo: <AskEmoScreen playerId={currentPlayer?.id ?? ""} onBack={() => go("dictionary")} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    pin: <PinScreen onSuccess={(pin) => { setParentPin(pin); go("parent"); }} onBack={() => go("profile")} />,
    parent: (
      <ParentScreen
        currentPlayerId={currentPlayer?.id ?? ""}
        parentPin={parentPin ?? ""}
        onPinChanged={setParentPin}
        onPinRejected={() => go("pin")}
        onBack={() => go(currentPlayer ? "profile" : "welcome")}
        onPlayerUpdated={handleCurrentPlayerUpdated}
        onPlayerDeleted={handleCurrentPlayerDeleted}
      />
    ),
  };

  // Guard: without a logged-in player, only the welcome screen may show —
  // covers stale navigation state (e.g. BottomNav) after a switch-player.
  const effectiveScreen: Scr = !currentPlayer && screen !== "welcome" ? "welcome" : screen;
  const showNav = !SCREENS_WITHOUT_NAV.includes(effectiveScreen);

  // Leaving the parent area by any route forgets the PIN
  useEffect(() => {
    if (effectiveScreen !== "parent") setParentPin(null);
  }, [effectiveScreen]);

  return (
    <div className="min-h-screen w-full font-nunito" style={{ fontFamily: "'Nunito',sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      {showNav && <BottomNav screen={effectiveScreen === "askemo" ? "dictionary" : effectiveScreen} onNavigate={handleNavigate} />}

      <div style={{ paddingBottom: showNav ? "72px" : "0" }}>{screens[effectiveScreen]}</div>

      {currentBadge && <BadgeModal badge={currentBadge} onClose={handleBadgeModalClose} />}
    </div>
  );
}