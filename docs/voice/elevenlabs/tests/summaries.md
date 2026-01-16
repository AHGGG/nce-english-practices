# Get test summaries

POST https://api.elevenlabs.io/v1/convai/agent-testing/summaries
Content-Type: application/json

Gets multiple agent response tests by their IDs. Returns a dictionary mapping test IDs to test summaries.

Reference: https://elevenlabs.io/docs/api-reference/tests/summaries

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Agent Response Test Summaries By Ids
  version: endpoint_conversationalAi/tests.summaries
paths:
  /v1/convai/agent-testing/summaries:
    post:
      operationId: summaries
      summary: Get Agent Response Test Summaries By Ids
      description: >-
        Gets multiple agent response tests by their IDs. Returns a dictionary
        mapping test IDs to test summaries.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/tests
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
                $ref: '#/components/schemas/GetTestsSummariesByIdsResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ListTestsByIdsRequestModel'
components:
  schemas:
    ListTestsByIdsRequestModel:
      type: object
      properties:
        test_ids:
          type: array
          items:
            type: string
          description: List of test IDs to fetch. No duplicates allowed.
      required:
        - test_ids
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
    UnitTestCommonModelType:
      type: string
      enum:
        - value: llm
        - value: tool
    UnitTestSummaryResponseModel:
      type: object
      properties:
        id:
          type: string
          description: The ID of the test
        name:
          type: string
          description: Name of the test
        access_info:
          oneOf:
            - $ref: '#/components/schemas/ResourceAccessInfo'
            - type: 'null'
          description: The access information of the test
        created_at_unix_secs:
          type: integer
          description: Creation time of the test in unix seconds
        last_updated_at_unix_secs:
          type: integer
          description: Last update time of the test in unix seconds
        type:
          $ref: '#/components/schemas/UnitTestCommonModelType'
          description: Type of the test
      required:
        - id
        - name
        - created_at_unix_secs
        - last_updated_at_unix_secs
        - type
    GetTestsSummariesByIdsResponseModel:
      type: object
      properties:
        tests:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/UnitTestSummaryResponseModel'
          description: Dictionary mapping test IDs to their summary information
      required:
        - tests

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.tests.summaries({
        testIds: [
            "test_id_1",
            "test_id_2",
        ],
    });
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.tests.summaries(
    test_ids=[
        "test_id_1",
        "test_id_2"
    ]
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

	url := "https://api.elevenlabs.io/v1/convai/agent-testing/summaries"

	payload := strings.NewReader("{\n  \"test_ids\": [\n    \"test_id_1\",\n    \"test_id_2\"\n  ]\n}")

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

url = URI("https://api.elevenlabs.io/v1/convai/agent-testing/summaries")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"test_ids\": [\n    \"test_id_1\",\n    \"test_id_2\"\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/convai/agent-testing/summaries")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"test_ids\": [\n    \"test_id_1\",\n    \"test_id_2\"\n  ]\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/convai/agent-testing/summaries', [
  'body' => '{
  "test_ids": [
    "test_id_1",
    "test_id_2"
  ]
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/agent-testing/summaries");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"test_ids\": [\n    \"test_id_1\",\n    \"test_id_2\"\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = ["test_ids": ["test_id_1", "test_id_2"]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/agent-testing/summaries")! as URL,
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