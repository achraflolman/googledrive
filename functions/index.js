// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

// Initialiseer Firebase Admin SDK
admin.initializeApp();
// Krijg toegang tot Firestore
const db = admin.firestore();

// --- Configuratie voor Google OAuth (opgehaald uit Firebase Functions Environment Variables) ---
// Deze variabelen worden automatisch geladen vanuit de omgevingsvariabelen die je hebt ingesteld
// via 'firebase functions:config:set googleapi.client_id="..."'.
const CLIENT_ID = functions.config().googleapi.client_id;
const CLIENT_SECRET = functions.config().googleapi.client_secret;
const REDIRECT_URI = functions.config().googleapi.redirect_uri;

// Initialiseer OAuth2Client met de credentials van jouw app
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// --- Cloud Function 1: getGoogleAuthUrl ---
// Genereert de Google OAuth autorisatie URL die de frontend opent.
// Deze functie wordt aangeroepen vanuit de frontend wanneer de gebruiker Google Drive wil koppelen.
exports.getGoogleAuthUrl = functions.https.onCall(async (data, context) => {
  // Controleer of de gebruiker is geauthenticeerd in Firebase.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist om Google Drive te koppelen.');
  }

  // Definieer de scopes (toestemmingen) die je app nodig heeft.
  // 'drive.file' geeft toegang tot bestanden die de app maakt en opent.
  // 'userinfo.email' om het e-mailadres van de gebruiker te krijgen.
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  // Genereer de autorisatie-URL.
  // 'access_type: offline' is cruciaal om een refresh_token te krijgen voor langdurige toegang.
  // 'prompt: consent' zorgt ervoor dat de gebruiker altijd toestemming geeft (nodig voor refresh_token bij de eerste keer).
  // 'state' wordt gebruikt voor beveiliging en validatie, hier sturen we de Firebase user ID mee.
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: context.auth.uid,
  });

  // Stuur de gegenereerde URL terug naar de frontend.
  return { authUrl: authUrl };
});

// --- Cloud Function 2: saveGoogleDriveTokens ---
// Wisselt de autorisatiecode in voor access_token en refresh_token en slaat de refresh_token op in Firestore.
// Deze functie wordt aangeroepen nadat de gebruiker toestemming heeft gegeven op Google's pagina en de code is ontvangen.
exports.saveGoogleDriveTokens = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist.');
  }
  const userId = context.auth.uid;
  const code = data.code; // De autorisatiecode die Google terugstuurt via de redirect

  try {
    // Wissel de autorisatiecode in voor access_token en refresh_token.
    const { tokens } = await oauth2Client.getToken(code);

    // Sla de refresh_token veilig op in Firestore voor deze gebruiker.
    // De access_token is tijdelijk, de refresh_token is voor langdurige toegang zonder opnieuw in te loggen.
    await db.collection('users').doc(userId).set({
      googleDriveRefreshToken: tokens.refresh_token,
      googleDriveLinked: true, // Markeer dat Google Drive is gekoppeld
      googleDriveLastLinked: admin.firestore.FieldValue.serverTimestamp(), // Tijdstempel van koppeling
    }, { merge: true }); // Gebruik merge om bestaande gebruikersdata niet te overschrijven

    return { success: true };
  } catch (error) {
    console.error("Fout bij opslaan Google Drive tokens:", error);
    // Gooi een HttpsError om de fout correct door te geven aan de frontend.
    throw new functions.https.HttpsError('internal', 'Fout bij koppelen Google Drive.', error.message);
  }
});

// --- Cloud Function 3: uploadFileToGoogleDrive ---
// Ontvangt een bestand (als Base64) van de frontend en uploadt het naar de Google Drive van de gebruiker.
exports.uploadFileToGoogleDrive = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist om bestanden te uploaden.');
  }
  const userId = context.auth.uid;
  // Destructureer de data die van de frontend komt: bestandsnaam, inhoud (Base64), MIME-type en mapnaam.
  const { fileName, fileContentBase64, mimeType, folderName = 'Schoolmaps Uploads' } = data;

  // Haal de refresh_token van de gebruiker op uit Firestore.
  const userDoc = await db.collection('users').doc(userId).get();
  const refreshToken = userDoc.data()?.googleDriveRefreshToken;

  // Als er geen refresh_token is, betekent dit dat Google Drive niet is gekoppeld of de token is verlopen.
  if (!refreshToken) {
    throw new functions.https.HttpsError('failed-precondition', 'Google Drive is niet gekoppeld voor deze gebruiker. Koppel je account opnieuw.');
  }

  // Stel de credentials in voor de OAuth2Client met de refresh_token.
  // De client zal automatisch de access_token vernieuwen indien nodig.
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    // Initialiseer de Google Drive service.
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Zoek of maak de 'Schoolmaps Uploads' map aan in de Google Drive van de gebruiker.
    let folderId = null;
    const searchFolderRes = await drive.files.list({
      q: `'root' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id)', // Vraag alleen het ID-veld op
    });

    if (searchFolderRes.data.files.length > 0) {
      folderId = searchFolderRes.data.files[0].id; // Map gevonden
    } else {
      // Map niet gevonden, maak deze aan.
      const createFolderRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = createFolderRes.data.id;
    }

    // Upload het bestand naar de Google Drive van de gebruiker, in de specifieke map.
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
        parents: [folderId], // Upload naar de zojuist gevonden/gemaakte map
      },
      media: {
        mimeType: mimeType,
        body: Buffer.from(fileContentBase64, 'base64'), // Converteer Base64 naar Buffer
      },
      fields: 'id,webViewLink,webContentLink', // Vraag de benodigde links op
    });

    // Stel machtigingen in om het bestand openbaar te maken (alleen lezen voor iedereen met de link).
    // Dit is nodig zodat leerlingen het bestand kunnen downloaden zonder zelf in te loggen op Drive.
    await drive.permissions.create({
      fileId: uploadResponse.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      fields: 'id', // Vraag alleen het ID-veld op
    });

    // Genereer de directe downloadlink. Dit dwingt een download af in plaats van een preview.
    const directDownloadLink = `https://drive.google.com/uc?export=download&id=${uploadResponse.data.id}`;

    // Retourneer de bestandsdetails en links naar de frontend.
    return {
      fileId: uploadResponse.data.id,
      webViewLink: uploadResponse.data.webViewLink,
      directDownloadLink: directDownloadLink,
    };

  } catch (error) {
    console.error("Fout bij uploaden naar Google Drive:", error);
    // Vang specifieke fouten op, bijv. "invalid_grant" voor een verlopen refresh token.
    if (error.code === 401 || (error.message && error.message.includes('invalid_grant'))) {
      // Markeer Google Drive als ontkoppeld in Firestore zodat de gebruiker opnieuw moet koppelen.
      await db.collection('users').doc(userId).update({
        googleDriveRefreshToken: admin.firestore.FieldValue.delete(), // Verwijder de token
        googleDriveLinked: false, // Markeer als ontkoppeld
      });
      throw new functions.https.HttpsError('unauthenticated', 'Google Drive-verbinding verlopen. Koppel je account opnieuw.');
    }
    // Gooi een algemene interne fout als het een ander type fout is.
    throw new functions.https.HttpsError('internal', 'Fout bij uploaden naar Google Drive.', error.message);
  }
});
