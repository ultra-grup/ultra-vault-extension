document.addEventListener("DOMContentLoaded", function () {
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const statusElement = document.getElementById("status");
  const urlStatusElement = document.getElementById("urlStatus");
  const itemTitleElement = document.getElementById("itemTitle");

  // Initialize the extension by checking the authentication status
  function initializeExtension() {
    chrome.runtime.sendMessage(
      { action: "checkAuthStatus" },
      function (response) {
        if (response.isAuthenticated) {
          console.log("User is authenticated");
          statusElement.textContent = "Hello, User"; // You might want to fetch user details separately
          loginButton.classList.add("hidden"); // Hide the login button
          logoutButton.classList.remove("hidden"); // Show the logout button

          // Fetch site and list IDs if on a SharePoint page
          extractAndFetchSiteAndListIds(response.accessToken);
        } else {
          console.log("User is not authenticated");
          statusElement.textContent = "Not Logged In";
          loginButton.classList.remove("hidden"); // Show the login button
          logoutButton.classList.add("hidden"); // Hide the logout button
        }
      }
    );
  }

  // Function to extract site and list IDs from URL and fetch actual IDs
  function extractAndFetchSiteAndListIds(accessToken) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const url = tabs[0].url;
      console.log("Current tab URL:", url);
      if (url.includes("sharepoint.com/sites/") && url.includes("/Lists/")) {
        const siteUrl = url.match(/sites\/([^\/]+)/)[0];
        const listName = url.match(/Lists\/([^\/]+)/)[1];

        chrome.runtime.sendMessage(
          {
            action: "getSiteAndListIds",
            siteUrl: siteUrl,
            listName: listName,
            accessToken: accessToken,
          },
          function (response) {
            if (response.error) {
              console.error("Error fetching site or list ID:", response.error);
              itemTitleElement.textContent = "Error fetching site or list ID";
            } else {
              // Fetch and display the item title
              fetchAndDisplayItemTitle(
                response.siteId,
                response.listId,
                accessToken
              );
            }
          }
        );
      } else {
        console.error("The current URL is not a valid SharePoint list URL.");
        urlStatusElement.textContent =
          "The current URL is not a SharePoint list URL.";
        urlStatusElement.classList.remove("hidden");
      }
    });
  }

  // Function to fetch and display SharePoint list item title
  function fetchAndDisplayItemTitle(SITE_ID, LIST_ID, accessToken) {
    const ITEM_ID = 1; // Example item ID
    const endpoint = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items/${ITEM_ID}?$select=fields`;

    fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error.message);
        }
        const title = data.fields.Title;
        itemTitleElement.textContent = `Item Title: ${title}`;
        itemTitleElement.classList.remove("hidden"); // Show the item title
      })
      .catch((error) => {
        console.error("Error fetching item title:", error);
        itemTitleElement.textContent = "Error fetching item title";
      });
  }

  // Add event listener for login button
  loginButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "login" }, function (response) {
      if (response.accessToken) {
        initializeExtension(); // Re-initialize after successful login
      } else {
        statusElement.textContent = "Login failed";
        console.error("Login failed:", response.error);
      }
    });
  });

  // Add event listener for logout button
  logoutButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "logout" }, function (response) {
      if (response.success) {
        console.log("Logged out successfully");
        statusElement.textContent = "Logged Out";
        loginButton.classList.remove("hidden"); // Show the login button
        logoutButton.classList.add("hidden"); // Hide the logout button
        itemTitleElement.classList.add("hidden"); // Hide the item title
      } else {
        console.error("Logout failed");
      }
    });
  });

  // Initialize the popup
  initializeExtension();
});
