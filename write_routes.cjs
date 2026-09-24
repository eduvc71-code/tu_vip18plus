const fs = require('fs');
let c = fs.readFileSync('src/server/routes.ts', 'utf8');

const newEndpoint = 
// POST Add Reaction to Profile
router.post('/react', async (req, res) => {
  try {
    const { profile_id, emoji } = req.body;
    if (!profile_id || !emoji) return res.status(400).json({ error: 'Faltan datos' });

    const profile = await getProfileById(profile_id);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

    const reactions = profile.reactions || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    profile.reactions = reactions;

    await saveProfile(profile);

    if (profile.telegram_message_id) {
      setTimeout(() => {
        updateTelegramMessageReactions(profile_id).catch(console.warn);
      }, 500);
    }

    res.json({ success: true, reactions });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la reacción' });
  }
});
;

c = c.replace('// GET Public Info & Bot Status', newEndpoint + '\n// GET Public Info & Bot Status');
fs.writeFileSync('src/server/routes.ts', c, 'utf8');
