// content.js

console.log("Content script is running.");

// Add click event listener to detect clicks on 'autologin' buttons
document.addEventListener('click', function(event) {
  if (event.target.classList.contains('autologin')) {
    console.log("Autologin button clicked.");

    // Extract row ID (assuming it's in the button's text content)
    const rowId = event.target.textContent.trim();
    console.log('Button with class "autologin" clicked, row ID:', rowId);

    // Send message to background script to get the current tab URL
    chrome.runtime.sendMessage({ action: "getCurrentTabUrl" }, function(response) {
      if (response.url) {
        const url = response.url;
        console.log('Current tab URL:', url);

        // Extract Site URL and List Name from URL
        const siteUrlMatch = url.match(/sites\/([^\/]+)/);
        const listNameMatch = url.match(/Lists\/([^\/]+)/);

        const siteUrl = siteUrlMatch ? siteUrlMatch[0] : 'Not found';
        const listName = listNameMatch ? listNameMatch[1] : 'Not found';

        console.log('Extracted Site URL:', siteUrl);
        console.log('Extracted List Name:', listName);

        // Send message to background script with the row ID, Site URL, and List Name
        chrome.runtime.sendMessage({
          action: "rowClicked",
          rowId: rowId,
          siteUrl: siteUrl,
          listName: listName
        });
      } else {
        console.error('No URL found for the current tab.');
      }
    });
  }
});