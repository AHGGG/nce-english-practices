# Import Whatsapp Account

POST https://api.elevenlabs.io/v1/convai/whatsapp-accounts
Content-Type: application/json

Import a WhatsApp account

Reference: https://elevenlabs.io/docs/api-reference/conversational-ai/whatsapp-accounts/import

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Import Whatsapp Account
  version: endpoint_conversationalAi/whatsappAccounts.import
paths:
  /v1/convai/whatsapp-accounts:
    post:
      operationId: import
      summary: Import Whatsapp Account
      description: Import a WhatsApp account
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/whatsappAccounts
      parameters:
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ImportWhatsAppAccountResponse'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ImportWhatsAppAccountRequest'
components:
  schemas:
    ImportWhatsAppAccountRequest:
      type: object
      properties:
        business_account_id:
          type: string
        phone_number_id:
          type: string
        token_code:
          type: string
      required:
        - business_account_id
        - phone_number_id
        - token_code
    ImportWhatsAppAccountResponse:
      type: object
      properties:
        phone_number_id:
          type: string
      required:
        - phone_number_id

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.whatsappAccounts.import({
        businessAccountId: "string",
        phoneNumberId: "string",
        tokenCode: "string",
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.whatsapp_accounts.import_(
    business_account_id="string",
    phone_number_id="string",
    token_code="string"
)

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

	url := "https://api.elevenlabs.io/v1/convai/whatsapp-accounts"

	payload := strings.NewReader("{\n  \"business_account_id\": \"string\",\n  \"phone_number_id\": \"string\",\n  \"token_code\": \"string\"\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("xi-api-key", "xi-api-key")
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

url = URI("https://api.elevenlabs.io/v1/convai/whatsapp-accounts")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"business_account_id\": \"string\",\n  \"phone_number_id\": \"string\",\n  \"token_code\": \"string\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/convai/whatsapp-accounts")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"business_account_id\": \"string\",\n  \"phone_number_id\": \"string\",\n  \"token_code\": \"string\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/convai/whatsapp-accounts', [
  'body' => '{
  "business_account_id": "string",
  "phone_number_id": "string",
  "token_code": "string"
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/whatsapp-accounts");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"business_account_id\": \"string\",\n  \"phone_number_id\": \"string\",\n  \"token_code\": \"string\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = [
  "business_account_id": "string",
  "phone_number_id": "string",
  "token_code": "string"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/whatsapp-accounts")! as URL,
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