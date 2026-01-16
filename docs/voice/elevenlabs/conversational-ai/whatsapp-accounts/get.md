# Get Whatsapp Account

GET https://api.elevenlabs.io/v1/convai/whatsapp-accounts/{phone_number_id}

Get a WhatsApp account

Reference: https://elevenlabs.io/docs/api-reference/conversational-ai/whatsapp-accounts/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Whatsapp Account
  version: endpoint_conversationalAi/whatsappAccounts.get
paths:
  /v1/convai/whatsapp-accounts/{phone_number_id}:
    get:
      operationId: get
      summary: Get Whatsapp Account
      description: Get a WhatsApp account
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/whatsappAccounts
      parameters:
        - name: phone_number_id
          in: path
          required: true
          schema:
            type: string
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
                $ref: '#/components/schemas/GetWhatsAppAccountResponse'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    GetWhatsAppAccountResponse:
      type: object
      properties:
        business_account_id:
          type: string
        phone_number_id:
          type: string
        business_account_name:
          type: string
        phone_number_name:
          type: string
        phone_number:
          type: string
        assigned_agent_id:
          type:
            - string
            - 'null'
        assigned_agent_name:
          type:
            - string
            - 'null'
      required:
        - business_account_id
        - phone_number_id
        - business_account_name
        - phone_number_name
        - phone_number
        - assigned_agent_name

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.whatsappAccounts.get("phone_number_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.whatsapp_accounts.get(
    phone_number_id="phone_number_id"
)

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/convai/whatsapp-accounts/phone_number_id"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("xi-api-key", "xi-api-key")

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

url = URI("https://api.elevenlabs.io/v1/convai/whatsapp-accounts/phone_number_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/whatsapp-accounts/phone_number_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/whatsapp-accounts/phone_number_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/whatsapp-accounts/phone_number_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/whatsapp-accounts/phone_number_id")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

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