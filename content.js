// content.js

console.log("Content script is running.");

function handleAutologinClick(event) {
  if (event.target.classList.contains('autologin')) {
    console.log("Autologin button clicked.");

    const rowId = event.target.textContent.trim();
    console.log('Button with class "autologin" clicked, row ID:', rowId);

    chrome.runtime.sendMessage({ action: "getCurrentTabUrl" }, function(response) {
      if (response.url) {
        const url = response.url;
        console.log('Current tab URL:', url);

        const siteUrlMatch = url.match(/sites\/([^\/]+)/);
        const listNameMatch = url.match(/Lists\/([^\/]+)/);

        const siteUrl = siteUrlMatch ? siteUrlMatch[0] : 'Not found';
        const listName = listNameMatch ? listNameMatch[1] : 'Not found';

        console.log('Extracted Site URL:', siteUrl);
        console.log('Extracted List Name:', listName);

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
}

function checkForAutologinButtons() {
  const autologinButtons = document.querySelectorAll('.autologin');
  if (autologinButtons.length > 0) {
    document.addEventListener('click', handleAutologinClick);
  }
}

const observer = new MutationObserver(function(mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      checkForAutologinButtons();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

checkForAutologinButtons();