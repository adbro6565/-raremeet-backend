const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
  });
}

// Send push notification to a device
async function sendPushNotification(token, title, body, data = {}) {
  try {
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      token
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    throw error;
  }
}

// Send push notification to multiple devices
async function sendPushNotificationToMultiple(tokens, title, body, data = {}) {
  try {
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      tokens: tokens.filter(Boolean) // Remove null/undefined tokens
    };

    if (message.tokens.length === 0) {
      throw new Error('No valid tokens provided');
    }

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log('✅ Push notifications sent:', response.successCount, 'successful,', response.failureCount, 'failed');
    return response;
  } catch (error) {
    console.error('❌ Error sending push notifications:', error);
    throw error;
  }
}

module.exports = {
  admin,
  sendPushNotification,
  sendPushNotificationToMultiple
};


