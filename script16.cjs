
const fs = require("fs");
let c = fs.readFileSync("src/components/ProfileDetailModal.tsx", "utf8");

const stateTarget = "const [showSlideIndicators, setShowSlideIndicators] = useState(true);";
const stateReplacement = "const [showSlideIndicators, setShowSlideIndicators] = useState(true);\n  const [showReactions, setShowReactions] = useState(false);\n  const [isBlinking, setIsBlinking] = useState(false);\n  const [reactedEmojis, setReactedEmojis] = useState<Record<string, boolean>>({});\n  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);";
c = c.replace(stateTarget, stateReplacement);

const effectTarget = "const resetCaptionTimer = () => {";
const effectReplacement = "const resetCaptionTimer = () => {";
c = c.replace(
  "useEffect(() => {\n    resetCaptionTimer();",
  "useEffect(() => {\n    if (reactionsEnabled && reactionsList.length > 0) {\n      setShowReactions(true);\n      setIsBlinking(false);\n      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);\n      reactionTimerRef.current = setTimeout(() => setShowReactions(false), 5000);\n    }\n    resetCaptionTimer();"
);

const clearEffectTarget = "if (captionTimerRef.current) clearTimeout(captionTimerRef.current);\n    };";
const clearEffectReplacement = "if (captionTimerRef.current) clearTimeout(captionTimerRef.current);\n      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);\n    };";
c = c.replace(clearEffectTarget, clearEffectReplacement);

const reactFunc = `
  const handleReact = async (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (reactedEmojis[emoji] || !profile) return;
    setReactedEmojis(prev => ({ ...prev, [emoji]: true }));
    try {
      await fetch(\u0027/api/react\u0027, {
        method: \u0027POST\u0027,
        headers: { \u0027Content-Type\u0027: \u0027application/json\u0027 },
        body: JSON.stringify({ profile_id: profile.id, emoji })
      });
    } catch {}
  };

  const handleCloseIntercept = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (reactionsEnabled && !showReactions && Object.keys(reactedEmojis).length === 0) {
      setShowReactions(true);
      setIsBlinking(true);
      setTimeout(() => onClose(), 1200);
    } else {
      onClose();
    }
  };
`;

c = c.replace("const getStarsForUrl = (url: string)", reactFunc + "\n  const getStarsForUrl = (url: string)");

// Replace onClose calls with handleCloseIntercept
c = c.replace(/onClick=\{\(e\) => \{\n\s*e\.stopPropagation\(\);\n\s*onClose\(\);\n\s*\}\}/g, "onClick={handleCloseIntercept}");
c = c.replace(/onClick=\{onClose\}/g, "onClick={handleCloseIntercept}");
// There might be onClick={(e) => { e.stopPropagation(); onClose(); if (onOpenPaymentMethods) ... }}
c = c.replace("onClose();\n                  if (onOpenPaymentMethods)", "handleCloseIntercept();\n                  if (onOpenPaymentMethods)");

fs.writeFileSync("src/components/ProfileDetailModal.tsx", c, "utf8");

