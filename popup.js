document.addEventListener("DOMContentLoaded", function () {
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const statusElement = document.getElementById("status");
  const urlStatusElement = document.getElementById("urlStatus");
  const itemTitleElement = document.getElementById("itemTitle");

  // Initialize the extension by checking the authentication status
  function initializeExtension() {
    checkAuthStatus()
      .then((response) => {
        if (response.isAuthenticated) {
          handleUserAuthenticated(response.accessToken);
        } else {
          handleUserNotAuthenticated();
        }
      })
      .catch((error) => {
        console.error("Error initializing extension:", error);
        statusElement.textContent = "Error checking authentication status";
      });
  }

  // Check authentication status by sending a message to the background script
  function checkAuthStatus() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "checkAuthStatus" },
        function (response) {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve(response);
        }
      );
    });
  }

  // Handle user authentication logic
  function handleUserAuthenticated(accessToken) {
    console.log("User is authenticated");
    statusElement.textContent = "Hello, User"; // Optionally fetch user details here
    toggleLoginState(true);

    // Fetch site and list IDs if on a SharePoint page
    extractAndFetchSiteAndListIds(accessToken);
  }

  // Handle the logic when the user is not authenticated
  function handleUserNotAuthenticated() {
    console.log("User is not authenticated");
    statusElement.textContent = "Not Logged In";
    toggleLoginState(false);
  }

  // Toggle login/logout button visibility based on login state
  function toggleLoginState(isLoggedIn) {
    if (isLoggedIn) {
      loginButton.classList.add("hidden");
      logoutButton.classList.remove("hidden");
    } else {
      loginButton.classList.remove("hidden");
      logoutButton.classList.add("hidden");
    }
  }

  // Function to extract site and list IDs from URL and fetch actual IDs
  function extractAndFetchSiteAndListIds(accessToken) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const url = tabs[0].url;
      console.log("Current tab URL:", url);
      if (isValidSharePointListUrl(url)) {
        const { siteUrl, listName } = parseSharePointUrl(url);

        fetchSiteAndListIds(siteUrl, listName, accessToken)
          .then((response) => {
            if (response.error) {
              throw new Error(response.error);
            }
            fetchAndDisplayItemTitle(
              response.siteId,
              response.listId,
              accessToken
            );
          })
          .catch((error) => {
            console.error("Error fetching site or list ID:", error);
            itemTitleElement.textContent = "Error fetching site or list ID";
          });
      } else {
        handleInvalidSharePointUrl();
      }
    });
  }

  // Validate if the URL is a valid SharePoint list URL
  function isValidSharePointListUrl(url) {
    return url.includes("sharepoint.com/sites/") && url.includes("/Lists/");
  }

  // Parse the SharePoint URL to extract siteUrl and listName
  function parseSharePointUrl(url) {
    const siteUrl = url.match(/sites\/([^\/]+)/)[0];
    const listName = url.match(/Lists\/([^\/]+)/)[1];
    return { siteUrl, listName };
  }

  // Fetch site and list IDs by sending a message to the background script
  function fetchSiteAndListIds(siteUrl, listName, accessToken) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "getSiteAndListIds",
          siteUrl,
          listName,
          accessToken,
        },
        function (response) {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve(response);
        }
      );
    });
  }

  // Handle invalid SharePoint list URLs
  function handleInvalidSharePointUrl() {
    console.error("The current URL is not a valid SharePoint list URL.");
    urlStatusElement.textContent =
      "The current URL is not a SharePoint list URL.";
    urlStatusElement.classList.remove("hidden");
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
        displayItemTitle(data.fields.Title);
      })
      .catch((error) => {
        console.error("Error fetching item title:", error);
        itemTitleElement.textContent = "Error fetching item title";
      });
  }

  // Display the item title in the UI
  function displayItemTitle(title) {
    itemTitleElement.textContent = `Item Title: ${title}`;
    itemTitleElement.classList.remove("hidden"); // Show the item title
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
        handleUserNotAuthenticated();
        itemTitleElement.classList.add("hidden"); // Hide the item title
      } else {
        console.error("Logout failed");
      }
    });
  });

  // Initialize the popup
  initializeExtension();
});
