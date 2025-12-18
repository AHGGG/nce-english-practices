# Get link

GET https://api.elevenlabs.io/v1/convai/agents/{agent_id}/link

Get the current link used to share the agent with others

Reference: https://elevenlabs.io/docs/api-reference/agents/get-link

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Shareable Agent Link
  version: endpoint_conversationalAi/agents/link.get
paths:
  /v1/convai/agents/{agent_id}/link:
    get:
      operationId: get
      summary: Get Shareable Agent Link
      description: Get the current link used to share the agent with others
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/agents
          - subpackage_conversationalAi/agents/link
      parameters:
        - name: agent_id
          in: path
          description: The id of an agent. This is returned on agent creation.
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
                $ref: '#/components/schemas/GetAgentLinkResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ConversationTokenPurpose:
      type: string
      enum:
        - value: signed_url
        - value: shareable_link
    ConversationTokenDBModel:
      type: object
      properties:
        agent_id:
          type: string
          description: The ID of the agent
        conversation_token:
          type: string
          description: The token for the agent
        expiration_time_unix_secs:
          type:
            - integer
            - 'null'
          description: The expiration time of the token in unix seconds
        conversation_id:
          type:
            - string
            - 'null'
          description: The ID of the conversation
        purpose:
          $ref: '#/components/schemas/ConversationTokenPurpose'
          description: The purpose of the token
        token_requester_user_id:
          type:
            - string
            - 'null'
          description: The user ID of the entity who requested the token
      required:
        - agent_id
        - conversation_token
    GetAgentLinkResponseModel:
      type: object
      properties:
        agent_id:
          type: string
          description: The ID of the agent
        token:
          oneOf:
            - $ref: '#/components/schemas/ConversationTokenDBModel'
            - type: 'null'
          description: The token data for the agent
      required:
        - agent_id

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.agents.link.get("agent_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.agents.link.get(
    agent_id="agent_id"
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

	url := "https://api.elevenlabs.io/v1/convai/agents/agent_id/link"

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

url = URI("https://api.elevenlabs.io/v1/convai/agents/agent_id/link")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/agents/agent_id/link")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/agents/agent_id/link', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/agents/agent_id/link");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/agents/agent_id/link")! as URL,
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