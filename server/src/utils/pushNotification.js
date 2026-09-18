// ======================================================
// pushNotification.js - ยูทิลิตี้ส่ง Push Notification ผ่าน Expo
// รับผิดชอบ: ส่งการแจ้งเตือนไปยังอุปกรณ์มือถือของผู้ใช้ผ่าน Expo Push Service
// ======================================================

const { Expo } = require('expo-server-sdk');

// สร้าง Expo SDK instance (รองรับ optional access token จาก .env)
const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

/**
 * ฟังก์ชัน: sendPushNotifications
 * หน้าที่: ส่ง Push Notification ไปยังผู้ใช้งานหลายคนพร้อมกัน
 * @param {string[]} tokens - Array ของ Expo Push Tokens ของผู้รับ
 * @param {object} notification - ข้อมูลการแจ้งเตือน { title, body, data }
 */
async function sendPushNotifications(tokens, { title, body, data = {} }) {
  // หากไม่มี tokens ส่งมา ให้สิ้นสุดการทำงานทันที
  if (!tokens || tokens.length === 0) return;

  // ตรวจสอบและคัดกรองเฉพาะ token ที่ถูกต้องตามรูปแบบของ Expo Push Token
  const validTokens = tokens.filter(token => token && Expo.isExpoPushToken(token));
  if (validTokens.length === 0) return;

  // จัดโครงสร้างข้อความการแจ้งเตือนสำหรับแต่ละ token
  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  // แบ่งข้อความเป็นกลุ่มย่อย (chunks) ตามขีดจำกัดที่ Expo API กำหนด (ไม่เกินกลุ่มละ 100 ข้อความ)
  const chunks = expo.chunkPushNotifications(messages);

  // วนลูปส่งการแจ้งเตือนทีละ chunk
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