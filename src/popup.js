// src/popup.js

document.addEventListener('DOMContentLoaded', function() {
  const loginButton = document.getElementById('loginButton');
  const statusElement = document.getElementById('status');

  loginButton.addEventListener('click', function() {
    const clientId = process.env.CLIENT_ID;
    const redirectUri = process.env.REDIRECT_URI;

    chrome.identity.launchWebAuthFlow(
      {
        url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=openid profile User.Read`,
        interactive: true,
      },
      function (redirect_url) {
        if (chrome.runtime.lastError) {
          console.log(chrome.runtime.lastError);
          statusElement.textContent = 'Login failed';
          return;
        }

        // Extract access token from the URL
        const accessToken = new URL(redirect_url).hash.split('&')[0].split('=')[1];

        // Store the access token in local storage
        chrome.storage.local.set({ accessToken: accessToken }, function() {
          console.log('Access token saved.');
          statusElement.textContent = 'Logged In';

          // Fetch user info using the access token
          fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
          .then(response => response.json())
          .then(user => {
            statusElement.textContent = `Hello, ${user.displayName}`;
          })
          .catch(error => {
            console.error('Error fetching user info:', error);
            statusElement.textContent = 'Error fetching user info';
          });
        });
      }
    );
  });
});
