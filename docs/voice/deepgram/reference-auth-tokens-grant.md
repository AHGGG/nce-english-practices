# Token-Based Authentication

POST https://api.deepgram.com/v1/auth/grant
Content-Type: application/json

Generates a temporary JSON Web Token (JWT) with a 30-second (by default) TTL and usage::write permission for core voice APIs, requiring an API key with Member or higher authorization. Tokens created with this endpoint will not work with the Manage APIs.

Reference: https://developers.deepgram.com/reference/auth/tokens/grant

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Token-based Authentication
  version: endpoint_auth/v1/tokens.grant
paths:
  /v1/auth/grant:
    post:
      operationId: grant
      summary: Token-based Authentication
      description: >-
        Generates a temporary JSON Web Token (JWT) with a 30-second (by default)
        TTL and usage::write permission for core voice APIs, requiring an API
        key with Member or higher authorization. Tokens created with this
        endpoint will not work with the Manage APIs.
      tags:
        - - subpackage_auth
          - subpackage_auth/v1
          - subpackage_auth/v1/tokens
      parameters:
        - name: Authorization
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Grant response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GrantV1Response'
        '400':
          description: Invalid Request
          content: {}
      requestBody:
        description: Time to live settings
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GrantV1Request'
components:
  schemas:
    GrantV1Request:
      type: object
      properties:
        ttl_seconds:
          type: number
          format: double
          description: Time to live in seconds for the token. Defaults to 30 seconds.
    GrantV1Response:
      type: object
      properties:
        access_token:
          type: string
          description: JSON Web Token (JWT)
        expires_in:
          type: number
          format: double
          description: Time in seconds until the JWT expires
      required:
        - access_token

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/auth/grant"

payload = {}
headers = {
    "Authorization": "<apiKey>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/auth/grant';
const options = {
  method: 'POST',
  headers: {Authorization: '<apiKey>', 'Content-Type': 'application/json'},
  body: '{}'
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.deepgram.com/v1/auth/grant"

	payload := strings.NewReader("{}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Authorization", "<apiKey>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.deepgram.com/v1/auth/grant")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.deepgram.com/v1/auth/grant")
  .header("Authorization", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.deepgram.com/v1/auth/grant', [
  'body' => '{}',
  'headers' => [
    'Authorization' => '<apiKey>',
    'Content-Type' => 'application/json',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/auth/grant");
var request = new RestRequest(Method.POST);
request.AddHeader("Authorization", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "Authorization": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/auth/grant")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```