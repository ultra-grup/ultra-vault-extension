// content.js

// Log that the script is running
console.log("Content script is running.");

// Listen for clicks on the document
document.addEventListener('click', function(event) {
  console.log("Click event detected."); // Log every click

  // Check if the clicked element has the class 'autologin'
  if (event.target.classList.contains('autologin')) {
    const rowId = event.target.textContent.trim(); // Assuming the button text contains the row ID
    console.log('Button with class "autologin" clicked, row ID:', rowId);

    // Send a message to the background script with the row ID
    chrome.runtime.sendMessage({
      action: "rowClicked",
      rowId: rowId
    }, function(response) {
      console.log("Response from background script:", response);
    });
  } else {
    console.log("Clicked element does not have 'autologin' class.");
  }
});
