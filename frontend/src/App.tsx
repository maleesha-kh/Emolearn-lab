import { useState, useEffect } from "react";
import type { Scr, Mood, Player } from "./types";
import { ROUNDS } from "./data/rounds";
import { rollRoundImages } from "./lib/imageBank";
import type { PredictionResult } from "./lib/predictionClient";
import { getPlayer } from "./lib/api";
import { AVATARS } from "./data/avatars";
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
  const [showBadge, setShowBadge] = useState(false);
  const [totalStars, setTotalStars] = useState(8);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

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
    go(`res-${m}` as Scr);
  };

  const handleCardSelect = (idx: number) => {
    setSelectedCard(idx);
    go("loading");
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
  };

  const handleLoadingBack = () => {
    setSelectedCard(null);
    go("gameround");
  };

  const handleNext = () => {
    go(lastCorrect ? "t-correct" : "t-wrong");
  };

  const handleContinue = () => {
    const nextRound = currentRound + 1;
    if (nextRound >= ROUNDS.length) {
      setTotalStars((s) => s + score);
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
    go("moodcheckin");
  };

  const toggleSound = () => setSoundOn((s) => !s);
  const round = ROUNDS[currentRound];
  const tappedEmotion: Mood | null = selectedCard !== null ? round.opts[selectedCard] : null;

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
    "res-happy": <HappyResponseScreen playerName={currentPlayer?.nickname ?? ""} onReady={() => go("gamestart")} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-sad": <SadResponseScreen onReady={() => go("gamestart")} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-angry": <AngryResponseScreen onReady={() => go("gamestart")} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
    "res-surprised": <SurprisedResponseScreen onReady={() => go("gamestart")} onHome={home} soundOn={soundOn} onSound={toggleSound} />,
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
        onBadge={() => setShowBadge(true)}
      />
    ),
    profile: (
      <ProfileScreen
        playerName={currentPlayer?.nickname ?? ""}
        avatarId={currentPlayer?.avatar_id ?? AVATARS[0].id}
        totalStars={totalStars}
        onNewGame={handlePlayAgain}
        onHome={home}
        soundOn={soundOn}
        onSound={toggleSound}
        onParent={() => go("pin")}
        onAchievements={() => go("achievements")}
        onSwitchPlayer={switchPlayer}
      />
    ),
    achievements: <AchievementsScreen onHome={home} soundOn={soundOn} onSound={toggleSound} />,
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

      {showBadge && <BadgeModal onClose={() => setShowBadge(false)} />}
    </div>
  );
}