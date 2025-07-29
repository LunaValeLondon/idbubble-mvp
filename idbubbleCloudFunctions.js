const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Save new alias info into Firestore 'fire-masterdata' collection
exports.saveToFireMasterdata = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const data = req.body;

    const { alias, deviceName, deviceType, lastSeen, aliasCreatedAt, fieldsFilled } = data;

    if (!alias) {
      return res.status(400).json({ error: "Alias is required" });
    }

    // Prepare data to save
    const record = {
      alias,
      deviceName: deviceName || null,
      deviceType: deviceType || null,
      lastSeen: lastSeen ? new Date(lastSeen) : null,
      aliasCreatedAt: aliasCreatedAt ? new Date(aliasCreatedAt) : new Date(),
      fieldsFilled: fieldsFilled || []
    };

    // Use alias as document ID to ensure uniqueness
    const docRef = db.collection("fire-masterdata").doc(alias);

    await docRef.set(record, { merge: true });

    return res.status(200).json({ message: "Alias saved/updated successfully in Firestore" });

  } catch (error) {
    console.error("Error saving alias to Firestore:", error);
    return res.status(500).json({ error: error.message });
  }
});

// (Optional) Add more Cloud Functions here as needed

