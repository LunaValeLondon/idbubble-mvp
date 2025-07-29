const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function: saveToFireMasterdata
 * This function saves alias signup data to the Firestore collection 'fire-masterdata'
 * Expects a POST request with JSON body containing:
 * {
 *   alias: string,
 *   email: string,
 *   deviceId: string,
 *   timestamp: string (ISO format),
 *   approved: boolean
 * }
 */
exports.saveToFireMasterdata = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { alias, email, deviceId, timestamp, approved } = req.body;

    if (!alias || !email || !deviceId || !timestamp) {
      return res.status(400).send("Missing required fields");
    }

    const docRef = db.collection("fire-masterdata").doc(alias);
    await docRef.set({
      alias,
      email,
      deviceId,
      timestamp,
      approved: approved === true
    });

    console.log(`Alias ${alias} saved to fire-masterdata`);
    return res.status(200).send({ status: "success", alias });
  } catch (error) {
    console.error("Error saving to fire-masterdata:", error);
    return res.status(500).send("Internal Server Error");
  }
});
