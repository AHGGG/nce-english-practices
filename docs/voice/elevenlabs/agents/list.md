# List agents

GET https://api.elevenlabs.io/v1/convai/agents

Returns a list of your agents and their metadata.

Reference: https://elevenlabs.io/docs/api-reference/agents/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Agents
  version: endpoint_conversationalAi/agents.list
paths:
  /v1/convai/agents:
    get:
      operationId: list
      summary: List Agents
      description: Returns a list of your agents and their metadata.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/agents
      parameters:
        - name: page_size
          in: query
          description: >-
            How many Agents to return at maximum. Can not exceed 100, defaults
            to 30.
          required: false
          schema:
            type: integer
            default: 30
        - name: search
          in: query
          description: Search by agents name.
          required: false
          schema:
            type:
              - string
              - 'null'
        - name: archived
          in: query
          description: Filter agents by archived status
          required: false
          schema:
            type:
              - boolean
              - 'null'
            default: false
        - name: show_only_owned_agents
          in: query
          description: >-
            If set to true, the endpoint will omit any agents that were shared
            with you by someone else and include only the ones you own
          required: false
          schema:
            type: boolean
            default: false
        - name: sort_direction
          in: query
          description: The direction to sort the results
          required: false
          schema:
            $ref: '#/components/schemas/SortDirection'
        - name: sort_by
          in: query
          description: The field to sort the results by
          required: false
          schema:
            oneOf:
              - $ref: '#/components/schemas/AgentSortBy'
              - type: 'null'
        - name: cursor
          in: query
          description: Used for fetching next page. Cursor is returned in the response.
          required: false
          schema:
            type:
              - string
              - 'null'
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
                $ref: '#/components/schemas/GetAgentsPageResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    SortDirection:
      type: string
      enum:
        - value: asc
        - value: desc
    AgentSortBy:
      type: string
      enum:
        - value: name
        - value: created_at
    ResourceAccessInfoRole:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    ResourceAccessInfo:
      type: object
      properties:
        is_creator:
          type: boolean
          description: Whether the user making the request is the creator of the agent
        creator_name:
          type: string
          description: Name of the agent's creator
        creator_email:
          type: string
          description: Email of the agent's creator
        role:
          $ref: '#/components/schemas/ResourceAccessInfoRole'
          description: The role of the user making the request
      required:
        - is_creator
        - creator_name
        - creator_email
        - role
    AgentSummaryResponseModel:
      type: object
      properties:
        agent_id:
          type: string
          description: The ID of the agent
        name:
          type: string
          description: The name of the agent
        tags:
          type: array
          items:
            type: string
          description: Agent tags used to categorize the agent
        created_at_unix_secs:
          type: integer
          description: The creation time of the agent in unix seconds
        access_info:
          $ref: '#/components/schemas/ResourceAccessInfo'
          description: The access information of the agent
        last_call_time_unix_secs:
          type:
            - integer
            - 'null'
          description: >-
            The time of the most recent call in unix seconds, null if no calls
            have been made
        archived:
          type: boolean
          default: false
          description: Whether the agent is archived
      required:
        - agent_id
        - name
        - tags
        - created_at_unix_secs
        - access_info
    GetAgentsPageResponseModel:
      type: object
      properties:
        agents:
          type: array
          items:
            $ref: '#/components/schemas/AgentSummaryResponseModel'
          description: A list of agents and their metadata
        next_cursor:
          type:
            - string
            - 'null'
          description: The next cursor to paginate through the agents
        has_more:
          type: boolean
          description: Whether there are more agents to paginate through
      required:
        - agents
        - has_more

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.agents.list({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.agents.list()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/convai/agents"

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

url = URI("https://api.elevenlabs.io/v1/convai/agents")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/agents")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/agents', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/agents");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/agents")! as URL,
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