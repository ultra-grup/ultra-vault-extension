// src/background.js

// Listen for the extension being installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension Installed');
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSiteAndListIds") {
    // Extract necessary data from the request
    const { siteUrl, listName, accessToken } = request;

    // Endpoint to get the site ID
    const siteEndpoint = `https://graph.microsoft.com/v1.0/sites/root:/${siteUrl}?$select=id`;

    // Fetch the site ID using the access token
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

      // Extract the SITE_ID from the full site ID
      const fullSiteId = siteData.id;
      const SITE_ID = fullSiteId.split(',')[1]; // Extract the part after the first comma
      console.log(`Fetched SITE_ID: ${SITE_ID}`);

      // Endpoint to get the list ID
      const listEndpoint = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${listName}?$select=id`;

      // Fetch the list ID using the site ID
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

        // Extract the LIST_ID from the response
        const LIST_ID = listData.id;
        console.log(`Fetched LIST_ID: ${LIST_ID}`);

        // Send the site and list IDs back to the content script
        sendResponse({ siteId: SITE_ID, listId: LIST_ID });
      });
    })
    .catch(error => {
      // Log any errors and send an error response
      console.error('Error fetching site or list ID:', error);
      sendResponse({ error: error.message });
    });

    // Return true to indicate that the response will be sent asynchronously
    return true;

  } else if (request.action === "rowClicked") {
    // Handle the row click event

    // Extract the row ID from the request
    const rowId = request.rowId;
    console.log('Row clicked with ID:', rowId);

    // Here you can add any additional logic based on the row ID
    // For example, you could fetch more data or trigger another action

    // Send a response acknowledging the click
    sendResponse({ status: "Row click acknowledged", rowId: rowId });
  }
});



