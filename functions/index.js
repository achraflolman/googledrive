const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// These need to be set in your Firebase environment
// firebase functions:config:set google.client_id="YOUR_CLIENT_ID"
// firebase functions:config:set google.client_secret="YOUR_CLIENT_SECRET"
const CLIENT_ID = functions.config().google.client_id;
const CLIENT_SECRET = functions.config().google.client_secret;

// This must be one of the "Authorized redirect URIs" in your Google Cloud Console
const REDIRECT_URI = "https://schoolmaps-6a5f3.firebaseapp.com/redirect.html";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.profile",
];

const SCHOOLMAPS_FOLDER_NAME = "Schoolmaps Files";

// Helper function to get an authenticated drive client
async function getDriveClient(uid) {
    const userPrivateDoc = await db.collection(`artifacts/${admin.app().options.appId}/users/${uid}/private/google`).doc("tokens").get();
    if (!userPrivateDoc.exists) {
        throw new functions.https.HttpsError("unauthenticated", "User has not connected their Google Drive account.");
    }
    const tokens = userPrivateDoc.data();
    oauth2Client.setCredentials(tokens);
    return google.drive({ version: "v3", auth: oauth2Client });
}


exports.getGoogleAuthUrl = functions.https.onCall((data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
    });

    return { url: authUrl };
});

exports.storeGoogleTokens = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { code } = data;
    if (!code) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with an authorization code.");
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        const { refresh_token } = tokens;

        if (!refresh_token) {
            throw new functions.https.HttpsError("failed-precondition", "A refresh token was not provided by Google. Please re-authenticate and grant offline access.");
        }
        
        const uid = context.auth.uid;
        const privateDataRef = db.collection(`artifacts/${admin.app().options.appId}/users/${uid}/private/google`).doc("tokens");
        await privateDataRef.set({ refresh_token: refresh_token });

        const publicUserRef = db.collection(`artifacts/${admin.app().options.appId}/public/data/users`).doc(uid);
        await publicUserRef.update({ isDriveConnected: true });

        return { success: true, message: "Google Drive connected successfully." };
    } catch (error) {
        console.error("Error getting tokens:", error.message);
        throw new functions.https.HttpsError("internal", "Failed to retrieve Google tokens.", error.message);
    }
});


exports.disconnectGoogleDrive = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const uid = context.auth.uid;
    const privateDataRef = db.collection(`artifacts/${admin.app().options.appId}/users/${uid}/private/google`).doc("tokens");
    const publicUserRef = db.collection(`artifacts/${admin.app().options.appId}/public/data/users`).doc(uid);

    await privateDataRef.delete();
    await publicUserRef.update({ isDriveConnected: false });

    return { success: true, message: "Google Drive disconnected." };
});

async function findOrCreateFolder(drive) {
    let folderId = null;
    const query = `mimeType='application/vnd.google-apps.folder' and name='${SCHOOLMAPS_FOLDER_NAME}' and trashed=false`;
    const res = await drive.files.list({ q: query, fields: 'files(id, name)' });

    if (res.data.files.length > 0) {
        folderId = res.data.files[0].id;
    } else {
        const fileMetadata = {
            name: SCHOOLMAPS_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        };
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        folderId = folder.data.id;
    }
    return folderId;
}


exports.uploadFileToDrive = functions.runWith({ timeoutSeconds: 300, memory: '1GB' }).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { fileContent, fileName, fileType, title, description, subject } = data;
    const uid = context.auth.uid;

    try {
        const drive = await getDriveClient(uid);
        const folderId = await findOrCreateFolder(drive);

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: fileType,
            body: Buffer.from(fileContent, 'base64'),
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, webContentLink',
        });

        // Make the file publicly accessible
        await drive.permissions.create({
            fileId: file.data.id,
            resource: {
                role: 'reader',
                type: 'anyone',
            },
        });
        
        // Save metadata to Firestore
        await db.collection(`artifacts/${admin.app().options.appId}/public/data/files`).add({
            title: title,
            description: description,
            subject: subject,
            ownerId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            fileUrl: file.data.webContentLink,
            storagePath: `googledrive/${file.data.id}`, // Custom path format
            driveFileId: file.data.id
        });

        return { success: true, fileId: file.data.id };

    } catch (error) {
        console.error('File upload error:', error);
        throw new functions.https.HttpsError('internal', 'Unable to upload file.', error.message);
    }
});


exports.deleteFileFromDrive = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { fileId, driveFileId } = data;
    const uid = context.auth.uid;

    try {
        const drive = await getDriveClient(uid);
        if (driveFileId) {
            await drive.files.delete({ fileId: driveFileId });
        }
        
        // Delete Firestore document
        await db.collection(`artifacts/${admin.app().options.appId}/public/data/files`).doc(fileId).delete();

        return { success: true };
    } catch(error) {
        console.error('File deletion error:', error);
        // If file not found on Drive, still allow deletion from Firestore
        if (error.code === 404) {
             await db.collection(`artifacts/${admin.app().options.appId}/public/data/files`).doc(fileId).delete();
             return { success: true, message: "File not found on Drive, but removed from app." };
        }
        throw new functions.https.HttpsError('internal', 'Unable to delete file.', error.message);
    }
});
