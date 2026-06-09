// GET /.netlify/functions/whoami
// Retorna {loggedIn, admin, artistSlug} com base no token do usuário.
const gh = require("./utils/github");

exports.handler = async (event, context) => {
  const user = gh.getUser(context);
  if (!user) return gh.json(200, { loggedIn: false, admin: false, artistSlug: null });
  const admin = gh.isAdmin(user);
  if (!gh.configured()) return gh.json(200, { loggedIn: true, admin, artistSlug: null });
  const artistSlug = await gh.artistSlugForUser(user);
  return gh.json(200, { loggedIn: true, admin, artistSlug });
};
