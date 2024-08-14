// src/background.js

const CLIENT_ID = "eeda8f82-e655-4380-8098-73dd5f7b5d92";
const REDIRECT_URI =
  "https://hmcpfdmeiliamdnijkcmojbpkhnmckol.chromiumapp.org/";
const TENANT_ID = "725cf83f-e41a-4f1e-bcff-ae262aa928d2";

// Utility function to decode JWT token
function decodeJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

// Utility function to check if the token is expired
function isTokenExpired(token) {
  const decoded = decodeJwt(token);
  return decoded.exp < Math.floor(Date.now() / 1000);
}

// Function to initiate the authentication flow
function initiateAuthFlow(sendResponse) {
  const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=openid profile User.Read Sites.Read.All`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true,
    },
    (redirect_url) => {
      if (chrome.runtime.lastError) {
        return sendResponse({ error: chrome.runtime.lastError.message });
      }

      const urlParams = new URLSearchParams(
        new URL(redirect_url).hash.substring(1)
      );
      const accessToken = urlParams.get("access_token");

      if (!accessToken) {
        return sendResponse({ error: "Access token extraction failed." });
      }

      chrome.storage.local.set({ accessToken }, () => {
        sendResponse({ accessToken });
      });
    }
  );
}

// Function to fetch the site ID from the site URL
function fetchSiteId(siteUrl, accessToken) {
  const siteEndpoint = `https://graph.microsoft.com/v1.0/sites/root:/${siteUrl}?$select=id`;
  return fetch(siteEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then((response) => response.json())
    .then((siteData) => {
      if (siteData.error) throw new Error(siteData.error.message);
      return siteData.id.split(",")[1]; // Extract the part after the first comma
    });
}

function convertToInternalName(displayName) {
    // Convert the display name to lower case
    let internalName = displayName.toLowerCase();

    // Replace spaces with '_x0020_' (this is the encoding for spaces)
    internalName = internalName.replace(/\s/g, '_x0020_');

    // Replace special characters with their respective codes
    // Here are a few examples, you may need to add more depending on your use case
    internalName = internalName.replace(/&/g, '_x0026_');  // & becomes _x0026_
    internalName = internalName.replace(/\//g, '_x002f_'); // / becomes _x002f_
    internalName = internalName.replace(/:/g, '_x003a_');  // : becomes _x003a_'
    internalName = internalName.replace(/-/g, '_x002d_');  // - becomes _x002d_'

    // Any other transformations required can be added here.

    return internalName;
}


// Function to fetch all lists from the site and match by display name
function fetchListId(siteId, listName, accessToken) {
  let internalListNAme = convertToInternalName(listName);
  const listsEndpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listName}`;
  return fetch(listsEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.error.message);
        });
      }
      return response.json();
    })
    .then((listsData) => {

      console.log('Lit Data', listsData)
      if (!listsData) throw new Error("The specified list was not found");
      return listsData.id;
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "checkAuthStatus":
      chrome.storage.local.get("accessToken", ({ accessToken }) => {
        const isAuthenticated = accessToken && !isTokenExpired(accessToken);
        sendResponse({ isAuthenticated, accessToken });
      });
      break;

    case "login":
      initiateAuthFlow(sendResponse);
      break;

    case "logout":
      chrome.storage.local.remove("accessToken", () => {
        console.log("Access token removed from storage.");
        sendResponse({ success: true });
      });
      break;

    case "getSiteAndListIds":
      const { siteUrl, listName, accessToken } = request;
      let siteId;

      fetchSiteId(siteUrl, accessToken)
        .then((fetchedSiteId) => {
          siteId = fetchedSiteId;
          console.log(siteId)
          return fetchListId(siteId, listName, accessToken);
        })
        .then((listId) => {
          console.log(`Fetched LIST_ID: ${listId}`);
          sendResponse({ siteId, listId });
        })
        .catch((error) => {
          console.error("Error fetching site or list ID:", error.message);
          sendResponse({ error: error.message });
        });

      break;

    default:
      sendResponse({ error: "Unknown action" });
  }
  return true; // Indicate that the response will be sent asynchronously
});
