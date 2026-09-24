
const fs = require("fs");
let c = fs.readFileSync("src/components/ProfileDetailModal.tsx", "utf8");

c = c.replace(
  "interface ProfileDetailModalProps {\n  profile: Profile | null;",
  "interface ProfileDetailModalProps {\n  reactionsEnabled?: boolean;\n  reactionsList?: string[];\n  profile: Profile | null;"
);

c = c.replace(
  "export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({ profile, initialMediaUrl, botUsername, modelName, modelVipLink, onClose, onOpenPaymentMethods, telegramUserContext }) => {",
  "export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({ profile, initialMediaUrl, botUsername, modelName, modelVipLink, onClose, onOpenPaymentMethods, telegramUserContext, reactionsEnabled = false, reactionsList = [] }) => {"
);

fs.writeFileSync("src/components/ProfileDetailModal.tsx", c, "utf8");

