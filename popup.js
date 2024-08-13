document.addEventListener('DOMContentLoaded', function() {
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  const statusElement = document.getElementById('status');
  const urlStatusElement = document.getElementById('urlStatus');
  const itemTitleElement = document.getElementById('itemTitle');

  const CLIENT_ID = "eeda8f82-e655-4380-8098-73dd5f7b5d92";
  const REDIRECT_URI = "https://hjnbmpndlilnmhhjkjcnaobpohfalekl.chromiumapp.org";
  const TENANT_ID = "725cf83f-e41a-4f1e-bcff-ae262aa928d2";
  let SITE_ID = "";
  let LIST_ID = "";
  const ITEM_ID = 1;

  // Function to decode JWT token
  function decodeJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  // Function to check if the token is expired
  function isTokenExpired(token) {
    const decoded = decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  }

  // Function to fetch and display SharePoint list item title
  function fetchAndDisplayItemTitle(accessToken) {
    const endpoint = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items/${ITEM_ID}?$select=fields`;

    fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        throw new Error(data.error.message);
      }
      const title = data.fields.Title;
      itemTitleElement.textContent = `Item Title: ${title}`;
      itemTitleElement.classList.remove('hidden'); // Show the item title
    })
    .catch(error => {
      console.error('Error fetching item title:', error);
      itemTitleElement.textContent = 'Error fetching item title';
    });
  }

  // Function to fetch and display user info
  function fetchAndDisplayUserInfo(accessToken) {
    fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(response => response.json())
    .then(user => {
      if (user.error) {
        throw new Error(user.error.message);
      }
      statusElement.textContent = `Hello, ${user.displayName}`;
      loginButton.classList.add('hidden'); // Hide the login button
      logoutButton.classList.remove('hidden'); // Show the logout button

      // Extract site and list IDs from URL and fetch actual IDs
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const url = tabs[0].url;
        console.log('Current tab URL:', url);
        if (url.includes('sharepoint.com/sites/') && url.includes('/Lists/')) {
          const siteUrl = url.match(/sites\/([^\/]+)/)[0];
          const listName = url.match(/Lists\/([^\/]+)/)[1];

          chrome.runtime.sendMessage({
            action: "getSiteAndListIds",
            siteUrl: siteUrl,
            listName: listName,
            accessToken: accessToken
          }, function(response) {
            if (response.error) {
              console.error('Error fetching site or list ID:', response.error);
              itemTitleElement.textContent = 'Error fetching site or list ID';
            } else {
              SITE_ID = response.siteId;
              LIST_ID = response.listId;
              fetchAndDisplayItemTitle(accessToken);
            }
          });
        } else {
          console.error('The current URL is not a valid SharePoint list URL.');
          urlStatusElement.textContent = 'The current URL is not a SharePoint list URL.';
          urlStatusElement.classList.remove('hidden');
        }
      });
    })
    .catch(error => {
      console.error('Error fetching user info:', error);
      statusElement.textContent = 'Error fetching user info';
    });
  }

  // Function to initiate the authentication flow
  function initiateAuthFlow() {
    const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid profile User.Read Sites.Read.All`;
    console.log('Starting auth flow:', authUrl);
    
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      function (redirect_url) {
        if (chrome.runtime.lastError) {
          console.error('Auth flow error:', chrome.runtime.lastError);
          statusElement.textContent = 'Login failed';
          return;
        }

        console.log('Auth flow completed. Redirect URL:', redirect_url);

        // Extract access token from the URL
        const urlParams = new URLSearchParams(new URL(redirect_url).hash.substring(1));
        const accessToken = urlParams.get('access_token');
        console.log('Extracted access token:', accessToken);

        if (!accessToken) {
          console.error('Access token extraction failed.');
          statusElement.textContent = 'Login failed: no access token';
          return;
        }

        // Store the access token in local storage
        chrome.storage.local.set({ accessToken: accessToken }, function() {
          console.log('Access token saved in storage:', accessToken);
          statusElement.textContent = 'Logged In';
          loginButton.classList.add('hidden'); // Hide the login button
          logoutButton.classList.remove('hidden'); // Show the logout button

          // Fetch user info using the access token
          fetchAndDisplayUserInfo(accessToken);
        });
      }
    );
  }

  // Check if the user is already logged in
  chrome.storage.local.get('accessToken', function(data) {
    if (data.accessToken) {
      console.log('Access token found in storage:', data.accessToken);
      if (isTokenExpired(data.accessToken)) {
        console.log('Access token is expired.');
        initiateAuthFlow(); // Re-initiate auth flow to get a new token
      } else {
        // User is logged in, fetch and display user info
        fetchAndDisplayUserInfo(data.accessToken);
      }
    } else {
      console.log('No access token found in storage.');
      // User is not logged in, show the login button
      statusElement.textContent = 'Not Logged In';
      loginButton.classList.remove('hidden'); // Show the login button
    }
  });

  // Add event listener for login button
  loginButton.addEventListener('click', function() {
    initiateAuthFlow();
  });

  // Add event listener for logout button
  logoutButton.addEventListener('click', function() {
    chrome.storage.local.remove('accessToken', function() {
      console.log('Access token removed from storage.');
      statusElement.textContent = 'Logged Out';
      loginButton.classList.remove('hidden'); // Show the login button
      logoutButton.classList.add('hidden'); // Hide the logout button
      itemTitleElement.classList.add('hidden'); // Hide the item title
    });
  });
});
