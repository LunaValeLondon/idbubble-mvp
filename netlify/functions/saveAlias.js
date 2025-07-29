const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { alias, email, timestamp, deviceName } = data;

    if (!alias || !timestamp) {
      return {
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { alias, email, timestamp, deviceName, deviceType } = data;

    if (!alias || !timestamp) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: alias and timestamp' }),
      };
    }

    await Promise.all([
      db.ref(`wix-masterdata/aliases/${alias}`).set({
        email: email || '',
        timestamp,
        deviceName: deviceName || '',
        deviceType: deviceType || '',
      }),
      db.ref(`fire-masterdata/aliases/${alias}`).set({
        email: email || '',
        timestamp,
        deviceName: deviceName || '',
        deviceType: deviceType || '',
      }),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Alias saved in both databases' }),
    };
  } catch (error) {
    console.error('Error saving alias:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

