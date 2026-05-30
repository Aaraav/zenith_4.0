async function verifyToken(token) {
  if (!token || token === 'invalid') throw new Error('invalid');
  return { sub: token };
}

function createClerkClient() {
  return {};
}

module.exports = { verifyToken, createClerkClient };
