const { Expo } = require('expo-server-sdk');

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

/**
 * ส่ง Push Notification ผ่าน Expo Push API
 * @param {string[]} tokens - Array ของ Expo Push Tokens
 * @param {object} notification - { title, body, data }
 */
async function sendPushNotifications(tokens, { title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return;

  // กรองเฉพาะ Expo Push Token ที่ถูกต้อง
  const validTokens = tokens.filter(token => token && Expo.isExpoPushToken(token));
  if (validTokens.length === 0) return;

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      ticketChunk.forEach(ticket => {
        if (ticket.status === 'error') {
          console.warn('[Push] Error sending notification:', ticket.message, ticket.details);
        }
      });
    } catch (err) {
      console.error('[Push] Failed to send chunk:', err);
    }
  }
}

module.exports = { sendPushNotifications };
