// src/background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension Installed');
});


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSiteAndListIds") {
    const { siteUrl, listName, accessToken } = request;

    const siteEndpoint = `https://graph.microsoft.com/v1.0/sites/root:/${siteUrl}?$select=id`;
    fetch(siteEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(response => response.json())
    .then(siteData => {
      if (siteData.error) {
        throw new Error(siteData.error.message);
      }
      const fullSiteId = siteData.id;
      const SITE_ID = fullSiteId.split(',')[1]; // Extract the part after the first comma
      console.log(`Fetched SITE_ID: ${SITE_ID}`);

      const listEndpoint = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${listName}?$select=id`;
      return fetch(listEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      .then(response => response.json())
      .then(listData => {
        if (listData.error) {
          throw new Error(listData.error.message);
        }
        const LIST_ID = listData.id;
        console.log(`Fetched LIST_ID: ${LIST_ID}`);

        sendResponse({ siteId: SITE_ID, listId: LIST_ID });
      });
    })
    .catch(error => {
      console.error('Error fetching site or list ID:', error);
      sendResponse({ error: error.message });
    });

    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});
