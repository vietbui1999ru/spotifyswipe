---
title: "Deezer for developers"
source: "https://developers.deezer.com/api/oauth"
author:
published:
created: 2026-02-13
description:
tags:
  - "clippings"
---
## OAuth

Deezer API uses the OAuth 2.0 protocol for authentication and authorization. We support two different OAuth flows that you can use within your Website.

  
This document explains how to authenticate users using a server-side Flow. Our example is using PHP.  

## User Login

Deezer Api support two different oAuth 2.0 flows for user login: server-side and client-side. The server-side flow is used whenever you need to call our API from your web server.  
The client-side flow has to be used by client applications, such as browser-based applications using Javascript, or mobile applications using webviews.  
These flows involve three different steps:

### User Authentication

Verify the user's identity.

  

### App Authorization:

Ensure that the user knows exactly which permissions will be granted to your application (see [permissions](https://developers.deezer.com/api/permissions) for more information).

  

### App Authentication

Ensure that the user gives the rights to your application and not someone else

  

## Server-side Flow

The first two steps of the flow are supported by redirecting the user to a login window on deezer.com domain. This allows us to verify user's identity (User Authentication), to ensure that he knows exacty what permissions he is giving to the application, and which application he's giving these permissions to (App Authorization).  
  

#### Parameters

When you call this dialog, you must pass the following parameters:

| Parameter | Description | Status | Default |
| --- | --- | --- | --- |
| app\_id | The id of your application, generated when you created your application on developer page. | Mandatory |  |
| redirect\_uri | The URL the user will be redirected after authentication. redirect\_uri must be in the same domain as the domain you defined when you created the application. | Mandatory |  |
| perms | The permissions your application will ask to the user. | Optional | basic\_access |

`  https://connect.deezer.com/oauth/auth.php?app_id=YOUR_APP_ID&redirect_uri=YOUR_REDIRECT_URI&perms=basic_access,email  `  
  

Once connected, the user will have to authorize the permissions the application is requesting

![](https://cdn-files.dzcdn.net/img/developers/oauth_permission-v00402855.png)  
If the user clicks on "don't allow" your application is not authorized. The browser then redirects the user to the 'redirect\_uri' (via HTTP 302) with the parameter 'error\_reason' = 'user\_denied'  
  
`http://redirect_uri?error_reason=user_denied`  
  
If the user clicks on "allow" your application authorized. The browser then redirects the user to the 'redirect\_uri' (via HTTP 302) with the parameter 'code' = an authorization code.  
  
`http://redirect_uri?code=A_CODE_GENERATED_BY_DEEZER`  
  
With this code, you will be able to request an access token which is necessary to make action requiring the permissions you asked. This step is needed to authenticate the application. To do so, you need to pass the code you just receive and your application secret code to the Deezer access\_token url:  
  
`https://connect.deezer.com/oauth/access_token.php`  
This will authenticate your application and deliver the access token.  
  
`https://connect.deezer.com/oauth/access_token.php?app_id=YOU_APP_ID&secret=YOU_APP_SECRET&code=THE_CODE_FROM_ABOVE`  

#### Parameters

| Parameter | Description | Status | Values |
| --- | --- | --- | --- |
| app\_id | The id of your application, generated when you created your application on developer page. | Mandatory |  |
| secret | The app secret is available from the Application setting page and should not be shared with anyone or embedded in any code that you will distribute (you should use the client-side flow for these scenarios) | Mandatory |  |
| code | The code you received at the previous step. | Mandatory |  |
| output | The way you want to output the access\_token. If not specifed, this will output the access\_token as a string to parse (like in the example below) | Optional | json   xml |

If your application is successfully authenticated and the authorization code is valid, the authorization server will return the access token

![](https://cdn-files.dzcdn.net/img/developers/oauth_token-v00402855.png)

  
  
In addition to the access token, the response will return the number of seconds remaining before expiration of the token. When the token has expired, you must re-run the process to generate a new code and retrieve a new token.  
  
If the user has already authorized your application, he will not be asked to do it again. If you need an access token that does not expire, in order to perform actions even if the user is not connected, you will have to ask 'offline\_access' permission. In this case, the response will return an expiration equal to 0.  
  
```
<?php $app_id     = "YOUR_APP_ID";$app_secret = "YOUR_APP_SECRET";$my_url     = "YOUR_CALLBACK_URL"; session_start();$code = $_REQUEST["code"]; if(empty($code)){    $_SESSION['state'] = md5(uniqid(rand(), TRUE)); //CSRF protection     $dialog_url = "https://connect.deezer.com/oauth/auth.php?app_id=".$app_id        ."&redirect_uri=".urlencode($my_url)."&perms=email,offline_access"        ."&state=". $_SESSION['state'];     header("Location: ".$dialog_url);    exit;     } if($_REQUEST['state'] == $_SESSION['state']) {    $token_url = "https://connect.deezer.com/oauth/access_token.php?app_id="    .$app_id."&secret="    .$app_secret."&code=".$code;     $response  = file_get_contents($token_url);    $params    = null;    parse_str($response, $params);    $api_url   = "https://api.deezer.com/user/me?access_token="            .$params['access_token'];     $user = json_decode(file_get_contents($api_url));    echo("Hello " . $user->name);}else{    echo("The state does not match. You may be a victim of CSRF.");}?>
```
  
  

## Client-side Flow

The client-side flow also uses OAuth popup for application authentication and authorization, with one exception: `You must pass the parameter "response_type=token" to the request.`  
In the same way as for the "server-side flow", you can request additional permissions using the parameter 'perms'. Then, when the user is authenticated and has authorized your application, the browser will be redirected to the "redirect\_uri". Rather than return the code as a parameter, the access\_token is directly generated and returned in the URI fragment (#access\_token).
