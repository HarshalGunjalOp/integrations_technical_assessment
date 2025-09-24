import json
import secrets
import httpx
import asyncio
import base64
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse

from integrations.integration_item import IntegrationItem
from redis_client import add_key_value_redis, get_value_redis, delete_key_redis

# IMPORTANT: Replace with your HubSpot App credentials
# You can create a developer account and app here: https://developers.hubspot.com/
CLIENT_ID = 'YOUR_HUBSPOT_CLIENT_ID'
CLIENT_SECRET = 'YOUR_HUBSPOT_CLIENT_SECRET'
REDIRECT_URI = 'http://localhost:8000/integrations/hubspot/oauth2callback'

# HubSpot requires specific scopes for API access.
# This example requests read access to CRM objects like contacts.
SCOPES = 'crm.objects.contacts.read'

async def authorize_hubspot(user_id: str, org_id: str):
    """
    Generates the HubSpot authorization URL for the user to grant access.
    """
    state = secrets.token_urlsafe(32)
    await add_key_value_redis(f'hubspot_state:{org_id}:{user_id}', state, expire=600)

    # Construct the authorization URL according to HubSpot's documentation
    auth_url = (
        f'https://app.hubspot.com/oauth/authorize'
        f'?client_id={CLIENT_ID}'
        f'&redirect_uri={REDIRECT_URI}'
        f'&scope={SCOPES}'
        f'&state={state}'
    )
    return auth_url

async def oauth2callback_hubspot(request: Request):
    """
    Handles the OAuth2 callback from HubSpot after user authorization.
    Exchanges the authorization code for an access token.
    """
    code = request.query_params.get('code')
    state = request.query_params.get('state')

    # A simplified way to get user/org IDs would be needed in a real app,
    # but for this assessment, we'll retrieve the state key assuming one user.
    # In a real scenario, the state would be tied to the user's session.
    # For now, we find the key that matches the state.
    
    # This is a simplification for the assessment.
    # In a real app, you'd have the user/org context from the session.
    state_key_pattern = f'hubspot_state:*'
    keys = await get_value_redis(state_key_pattern, get_keys=True)
    
    user_id = None
    org_id = None
    saved_state_key = None
    
    for key in keys:
        key_str = key.decode('utf-8')
        val = await get_value_redis(key_str)
        if val and val.decode('utf-8') == state:
            saved_state_key = key_str
            parts = key_str.split(':')
            org_id = parts[1]
            user_id = parts[2]
            break

    if not saved_state_key:
        raise HTTPException(status_code=400, detail='State does not match or has expired.')

    # Exchange the authorization code for an access token
    async with httpx.AsyncClient() as client:
        token_url = 'https://api.hubapi.com/oauth/v1/token'
        response = await client.post(
            token_url,
            data={
                'grant_type': 'authorization_code',
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'redirect_uri': REDIRECT_URI,
                'code': code,
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
        )

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to retrieve access token: {response.text}")

    # Clean up the state key and store the new credentials
    await delete_key_redis(saved_state_key)
    await add_key_value_redis(f'hubspot_credentials:{org_id}:{user_id}', json.dumps(response.json()))

    # Return a script to close the popup window
    close_window_script = """
    <html><script>window.close();</script></html>
    """
    return HTMLResponse(content=close_window_script)

async def get_hubspot_credentials(user_id: str, org_id: str):
    """
    Retrieves stored HubSpot credentials from Redis for a given user and organization.
    """
    credentials = await get_value_redis(f'hubspot_credentials:{org_id}:{user_id}')
    if not credentials:
        raise HTTPException(status_code=404, detail='HubSpot credentials not found. Please connect first.')
    
    return json.loads(credentials)

def _create_integration_item(contact: dict) -> IntegrationItem:
    """Helper to convert a HubSpot contact into an IntegrationItem."""
    properties = contact.get('properties', {})
    
    # Construct a full name, handling cases where one might be missing
    first_name = properties.get('firstname', '')
    last_name = properties.get('lastname', '')
    full_name = f"{first_name} {last_name}".strip() or properties.get('email', 'Unnamed Contact')
    
    return IntegrationItem(
        id=contact.get('id'),
        name=full_name,
        type='Contact', # The type of HubSpot object
        creation_time=contact.get('createdAt'),
        last_modified_time=contact.get('updatedAt')
    )

async def get_items_hubspot(credentials_json: str) -> list[IntegrationItem]:
    """
    Fetches a list of contacts from HubSpot and maps them to IntegrationItem objects.
    """
    try:
        credentials = json.loads(credentials_json)
        access_token = credentials.get('access_token')
        if not access_token:
            raise HTTPException(status_code=400, detail="Invalid credentials provided.")
    except (json.JSONDecodeError, AttributeError):
        raise HTTPException(status_code=400, detail="Malformed credentials format.")

    headers = {'Authorization': f'Bearer {access_token}'}
    # Fetching contacts with basic properties
    properties = "firstname,lastname,email,createdate,lastmodifieddate"
    url = f"https://api.hubapi.com/crm/v3/objects/contacts?properties={properties}&limit=10"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status() # Raises an exception for 4XX/5XX responses
            
            data = response.json()
            integration_items = [_create_integration_item(contact) for contact in data.get('results', [])]
            return integration_items

        except httpx.HTTPStatusError as e:
            # Handle API errors, e.g., token expired
            if e.response.status_code == 401:
                raise HTTPException(status_code=401, detail="HubSpot token is invalid or has expired. Please reconnect.")
            else:
                raise HTTPException(status_code=e.response.status_code, detail=f"Error fetching HubSpot data: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")