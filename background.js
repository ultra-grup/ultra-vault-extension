// src/background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed");
});

const CLIENT_ID = "eeda8f82-e655-4380-8098-73dd5f7b5d92";
const REDIRECT_URI =
  "https://hhdfonbcmjjnbiihcinmhlomemnikoaa.chromiumapp.org/";
const TENANT_ID = "725cf83f-e41a-4f1e-bcff-ae262aa928d2";

// Function to decode JWT token
function decodeJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
  return JSON.parse(jsonPayload);
}

// Function to check if the token is expired
function isTokenExpired(token) {
  const decoded = decodeJwt(token);
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

// Function to initiate authentication flow
function initiateAuthFlow(sendResponse) {
  const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=openid profile User.Read Sites.Read.All`;
  console.log("Starting auth flow:", authUrl);

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true,
    },
    function (redirect_url) {
      if (chrome.runtime.lastError) {
        console.error("Auth flow error:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }

      console.log("Auth flow completed. Redirect URL:", redirect_url);

      // Extract access token from the URL
      const urlParams = new URLSearchParams(
        new URL(redirect_url).hash.substring(1)
      );
      const accessToken = urlParams.get("access_token");
      console.log("Extracted access token:", accessToken);

      if (!accessToken) {
        console.error("Access token extraction failed.");
        sendResponse({ error: "Access token extraction failed." });
        return;
      }

      // Store the access token in local storage
      chrome.storage.local.set({ accessToken: accessToken }, function () {
        console.log("Access token saved in storage:", accessToken);
        sendResponse({ accessToken: accessToken });
      });
    }
  );
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "checkAuthStatus") {
    chrome.storage.local.get(["accessToken"], function (result) {
      const accessToken = result.accessToken;
      if (accessToken && !isTokenExpired(accessToken)) {
        sendResponse({ isAuthenticated: true, accessToken: accessToken });
      } else {
        sendResponse({ isAuthenticated: false });
      }
    });
    return true; // Keep the message channel open for sendResponse
  }

  if (request.action === "login") {
    initiateAuthFlow(sendResponse);
    return true; // Keep the message channel open for sendResponse
  }

  if (request.action === "logout") {
    chrome.storage.local.remove("accessToken", function () {
      console.log("Access token removed from storage.");
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for sendResponse
  }

  if (request.action === "getSiteAndListIds") {
    const { siteUrl, listName, accessToken } = request;

    const siteEndpoint = `https://graph.microsoft.com/v1.0/sites/root:/${siteUrl}?$select=id`;
    fetch(siteEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((siteData) => {
        if (siteData.error) {
          throw new Error(siteData.error.message);
        }
        const fullSiteId = siteData.id;
        const SITE_ID = fullSiteId.split(",")[1]; // Extract the part after the first comma
        console.log(`Fetched SITE_ID: ${SITE_ID}`);

        const listEndpoint = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${listName}?$select=id`;
        return fetch(listEndpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((response) => response.json());
      })
      .then((listData) => {
        if (listData.error) {
          throw new Error(listData.error.message);
        }
        const LIST_ID = listData.id;
        console.log(`Fetched LIST_ID: ${LIST_ID}`);

        sendResponse({ siteId: SITE_ID, listId: LIST_ID });
      })
      .catch((error) => {
        console.error("Error fetching site or list ID:", error);
        sendResponse({ error: error.message });
      });

    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});
