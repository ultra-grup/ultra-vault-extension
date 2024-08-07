# U1 Chrome Extension

This Chrome extension interacts with Microsoft SharePoint to fetch and display SharePoint list items using Microsoft Graph API.

## Setup and Configuration

### Prerequisites

1. **Azure AD Application Registration**:
   - Register an application in Azure Active Directory.
   - Note the "Application (client) ID".
   - Configure the redirect URI as `https://<extension-id>.chromiumapp.org/`.

2. **Chrome Extension ID**:
   - Load the extension as an unpacked extension in Chrome to get the extension ID if not already published.

### Step-by-Step Instructions

Update manifest.json with YOUR_CLIENT_ID with your Azure AD application client ID.
Replace <extension-id> with your Chrome extension ID.

Update popup.js
Update the constants CLIENT_ID, REDIRECT_URI, and TENANT_ID with your actual values