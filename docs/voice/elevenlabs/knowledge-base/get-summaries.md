# Get knowledge base summaries

GET https://api.elevenlabs.io/v1/convai/knowledge-base/summaries

Gets multiple knowledge base document summaries by their IDs.

Reference: https://elevenlabs.io/docs/api-reference/knowledge-base/get-summaries

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Knowledge Base Summaries By Ids
  version: endpoint_conversationalAi/knowledgeBase/documents/summaries.get
paths:
  /v1/convai/knowledge-base/summaries:
    get:
      operationId: get
      summary: Get Knowledge Base Summaries By Ids
      description: Gets multiple knowledge base document summaries by their IDs.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/knowledgeBase
          - subpackage_conversationalAi/knowledgeBase/documents
          - subpackage_conversationalAi/knowledgeBase/documents/summaries
      parameters:
        - name: document_ids
          in: query
          description: The ids of knowledge base documents.
          required: true
          schema:
            type: array
            items:
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
                type: object
                additionalProperties:
                  $ref: >-
                    #/components/schemas/V1ConvaiKnowledgeBaseSummariesGetResponsesContentApplicationJsonSchema
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    KnowledgeBaseDocumentMetadataResponseModel:
      type: object
      properties:
        created_at_unix_secs:
          type: integer
        last_updated_at_unix_secs:
          type: integer
        size_bytes:
          type: integer
      required:
        - created_at_unix_secs
        - last_updated_at_unix_secs
        - size_bytes
    DocumentUsageModeEnum:
      type: string
      enum:
        - value: prompt
        - value: auto
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
    DependentAvailableAgentIdentifierAccessLevel:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    DependentAvailableAgentIdentifier:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: available
        created_at_unix_secs:
          type: integer
        access_level:
          $ref: '#/components/schemas/DependentAvailableAgentIdentifierAccessLevel'
      required:
        - id
        - name
        - created_at_unix_secs
        - access_level
    DependentUnknownAgentIdentifier:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: unknown
    GetKnowledgeBaseSummaryUrlResponseModelDependentAgentsItems:
      oneOf:
        - $ref: '#/components/schemas/DependentAvailableAgentIdentifier'
        - $ref: '#/components/schemas/DependentUnknownAgentIdentifier'
    GetKnowledgeBaseSummaryURLResponseModel:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        metadata:
          $ref: '#/components/schemas/KnowledgeBaseDocumentMetadataResponseModel'
        supported_usages:
          type: array
          items:
            $ref: '#/components/schemas/DocumentUsageModeEnum'
        access_info:
          $ref: '#/components/schemas/ResourceAccessInfo'
        folder_parent_id:
          type:
            - string
            - 'null'
          description: >-
            The ID of the parent folder, or null if the document is at the root
            level.
        dependent_agents:
          type: array
          items:
            $ref: >-
              #/components/schemas/GetKnowledgeBaseSummaryUrlResponseModelDependentAgentsItems
        type:
          type: string
          enum:
            - type: stringLiteral
              value: url
        url:
          type: string
      required:
        - id
        - name
        - metadata
        - supported_usages
        - access_info
        - dependent_agents
        - type
        - url
    GetKnowledgeBaseSummaryFileResponseModelDependentAgentsItems:
      oneOf:
        - $ref: '#/components/schemas/DependentAvailableAgentIdentifier'
        - $ref: '#/components/schemas/DependentUnknownAgentIdentifier'
    GetKnowledgeBaseSummaryFileResponseModel:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        metadata:
          $ref: '#/components/schemas/KnowledgeBaseDocumentMetadataResponseModel'
        supported_usages:
          type: array
          items:
            $ref: '#/components/schemas/DocumentUsageModeEnum'
        access_info:
          $ref: '#/components/schemas/ResourceAccessInfo'
        folder_parent_id:
          type:
            - string
            - 'null'
          description: >-
            The ID of the parent folder, or null if the document is at the root
            level.
        dependent_agents:
          type: array
          items:
            $ref: >-
              #/components/schemas/GetKnowledgeBaseSummaryFileResponseModelDependentAgentsItems
        type:
          type: string
          enum:
            - type: stringLiteral
              value: file
      required:
        - id
        - name
        - metadata
        - supported_usages
        - access_info
        - dependent_agents
        - type
    GetKnowledgeBaseSummaryTextResponseModelDependentAgentsItems:
      oneOf:
        - $ref: '#/components/schemas/DependentAvailableAgentIdentifier'
        - $ref: '#/components/schemas/DependentUnknownAgentIdentifier'
    GetKnowledgeBaseSummaryTextResponseModel:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        metadata:
          $ref: '#/components/schemas/KnowledgeBaseDocumentMetadataResponseModel'
        supported_usages:
          type: array
          items:
            $ref: '#/components/schemas/DocumentUsageModeEnum'
        access_info:
          $ref: '#/components/schemas/ResourceAccessInfo'
        folder_parent_id:
          type:
            - string
            - 'null'
          description: >-
            The ID of the parent folder, or null if the document is at the root
            level.
        dependent_agents:
          type: array
          items:
            $ref: >-
              #/components/schemas/GetKnowledgeBaseSummaryTextResponseModelDependentAgentsItems
        type:
          type: string
          enum:
            - type: stringLiteral
              value: text
      required:
        - id
        - name
        - metadata
        - supported_usages
        - access_info
        - dependent_agents
        - type
    GetKnowledgeBaseSummaryFolderResponseModelDependentAgentsItems:
      oneOf:
        - $ref: '#/components/schemas/DependentAvailableAgentIdentifier'
        - $ref: '#/components/schemas/DependentUnknownAgentIdentifier'
    GetKnowledgeBaseSummaryFolderResponseModel:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        metadata:
          $ref: '#/components/schemas/KnowledgeBaseDocumentMetadataResponseModel'
        supported_usages:
          type: array
          items:
            $ref: '#/components/schemas/DocumentUsageModeEnum'
        access_info:
          $ref: '#/components/schemas/ResourceAccessInfo'
        folder_parent_id:
          type:
            - string
            - 'null'
          description: >-
            The ID of the parent folder, or null if the document is at the root
            level.
        dependent_agents:
          type: array
          items:
            $ref: >-
              #/components/schemas/GetKnowledgeBaseSummaryFolderResponseModelDependentAgentsItems
        type:
          type: string
          enum:
            - type: stringLiteral
              value: folder
        children_count:
          type: integer
      required:
        - id
        - name
        - metadata
        - supported_usages
        - access_info
        - dependent_agents
        - type
        - children_count
    KnowledgeBaseSummaryBatchSuccessfulResponseModelData:
      oneOf:
        - $ref: '#/components/schemas/GetKnowledgeBaseSummaryURLResponseModel'
        - $ref: '#/components/schemas/GetKnowledgeBaseSummaryFileResponseModel'
        - $ref: '#/components/schemas/GetKnowledgeBaseSummaryTextResponseModel'
        - $ref: '#/components/schemas/GetKnowledgeBaseSummaryFolderResponseModel'
    KnowledgeBaseSummaryBatchSuccessfulResponseModel:
      type: object
      properties:
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        data:
          $ref: >-
            #/components/schemas/KnowledgeBaseSummaryBatchSuccessfulResponseModelData
      required:
        - status
        - data
    BatchFailureResponseModel:
      type: object
      properties:
        status:
          type: string
          enum:
            - type: stringLiteral
              value: failure
        error_code:
          type: integer
        error_status:
          type: string
        error_message:
          type: string
      required:
        - status
        - error_code
        - error_status
        - error_message
    V1ConvaiKnowledgeBaseSummariesGetResponsesContentApplicationJsonSchema:
      oneOf:
        - $ref: >-
            #/components/schemas/KnowledgeBaseSummaryBatchSuccessfulResponseModel
        - $ref: '#/components/schemas/BatchFailureResponseModel'

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.knowledgeBase.documents.summaries.get({
        documentIds: [
            "string",
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

client.conversational_ai.knowledge_base.documents.summaries.get(
    document_ids=[
        "string"
    ]
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

	url := "https://api.elevenlabs.io/v1/convai/knowledge-base/summaries?document_ids=%5B%22string%22%5D"

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

url = URI("https://api.elevenlabs.io/v1/convai/knowledge-base/summaries?document_ids=%5B%22string%22%5D")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/knowledge-base/summaries?document_ids=%5B%22string%22%5D")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/knowledge-base/summaries?document_ids=%5B%22string%22%5D', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/knowledge-base/summaries?document_ids=%5B%22string%22%5D");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/knowledge-base/summaries?document_ids=%5B%22string%22%5D")! as URL,
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