# Create Pronunciation Dictionaries

POST https://api.elevenlabs.io/v1/studio/projects/{project_id}/pronunciation-dictionaries
Content-Type: application/json

Create a set of pronunciation dictionaries acting on a project. This will automatically mark text within this project as requiring reconverting where the new dictionary would apply or the old one no longer does.

Reference: https://elevenlabs.io/docs/api-reference/studio/create-pronunciation-dictionaries

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create Pronunciation Dictionaries
  version: endpoint_studio/projects/pronunciationDictionaries.create
paths:
  /v1/studio/projects/{project_id}/pronunciation-dictionaries:
    post:
      operationId: create
      summary: Create Pronunciation Dictionaries
      description: >-
        Create a set of pronunciation dictionaries acting on a project. This
        will automatically mark text within this project as requiring
        reconverting where the new dictionary would apply or the old one no
        longer does.
      tags:
        - - subpackage_studio
          - subpackage_studio/projects
          - subpackage_studio/projects/pronunciationDictionaries
      parameters:
        - name: project_id
          in: path
          description: >-
            The ID of the project to be used. You can use the [List
            projects](/docs/api-reference/studio/get-projects) endpoint to list
            all the available projects.
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
                $ref: >-
                  #/components/schemas/CreatePronunciationDictionaryResponseModel
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/Body_Create_Pronunciation_Dictionaries_v1_studio_projects__project_id__pronunciation_dictionaries_post
components:
  schemas:
    PronunciationDictionaryVersionLocatorDBModel:
      type: object
      properties:
        pronunciation_dictionary_id:
          type: string
        version_id:
          type:
            - string
            - 'null'
      required:
        - pronunciation_dictionary_id
        - version_id
    Body_Create_Pronunciation_Dictionaries_v1_studio_projects__project_id__pronunciation_dictionaries_post:
      type: object
      properties:
        pronunciation_dictionary_locators:
          type: array
          items:
            $ref: '#/components/schemas/PronunciationDictionaryVersionLocatorDBModel'
          description: >-
            A list of pronunciation dictionary locators
            (pronunciation_dictionary_id, version_id) encoded as a list of JSON
            strings for pronunciation dictionaries to be applied to the text. A
            list of json encoded strings is required as adding projects may
            occur through formData as opposed to jsonBody. To specify multiple
            dictionaries use multiple --form lines in your curl, such as --form
            'pronunciation_dictionary_locators="{\"pronunciation_dictionary_id\":\"Vmd4Zor6fplcA7WrINey\",\"version_id\":\"hRPaxjlTdR7wFMhV4w0b\"}"'
            --form
            'pronunciation_dictionary_locators="{\"pronunciation_dictionary_id\":\"JzWtcGQMJ6bnlWwyMo7e\",\"version_id\":\"lbmwxiLu4q6txYxgdZqn\"}"'.
        invalidate_affected_text:
          type: boolean
          default: true
          description: >-
            This will automatically mark text in this project for reconversion
            when the new dictionary applies or the old one no longer does.
      required:
        - pronunciation_dictionary_locators
    CreatePronunciationDictionaryResponseModel:
      type: object
      properties:
        status:
          type: string
          description: >-
            The status of the create pronunciation dictionary request. If the
            request was successful, the status will be 'ok'. Otherwise an error
            message with status 500 will be returned.
      required:
        - status

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.projects.pronunciationDictionaries.create("project_id", {
        pronunciationDictionaryLocators: [
            {
                pronunciationDictionaryId: "string",
                versionId: "string",
            },
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

client.studio.projects.pronunciation_dictionaries.create(
    project_id="project_id",
    pronunciation_dictionary_locators=[
        {
            "pronunciation_dictionary_id": "string",
            "version_id": "string"
        }
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

	url := "https://api.elevenlabs.io/v1/studio/projects/project_id/pronunciation-dictionaries"

	payload := strings.NewReader("{\n  \"pronunciation_dictionary_locators\": [\n    {\n      \"pronunciation_dictionary_id\": \"string\",\n      \"version_id\": \"string\"\n    }\n  ]\n}")

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

url = URI("https://api.elevenlabs.io/v1/studio/projects/project_id/pronunciation-dictionaries")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"pronunciation_dictionary_locators\": [\n    {\n      \"pronunciation_dictionary_id\": \"string\",\n      \"version_id\": \"string\"\n    }\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/studio/projects/project_id/pronunciation-dictionaries")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "application/json")
  .body("{\n  \"pronunciation_dictionary_locators\": [\n    {\n      \"pronunciation_dictionary_id\": \"string\",\n      \"version_id\": \"string\"\n    }\n  ]\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/studio/projects/project_id/pronunciation-dictionaries', [
  'body' => '{
  "pronunciation_dictionary_locators": [
    {
      "pronunciation_dictionary_id": "string",
      "version_id": "string"
    }
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
var client = new RestClient("https://api.elevenlabs.io/v1/studio/projects/project_id/pronunciation-dictionaries");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"pronunciation_dictionary_locators\": [\n    {\n      \"pronunciation_dictionary_id\": \"string\",\n      \"version_id\": \"string\"\n    }\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "application/json"
]
let parameters = ["pronunciation_dictionary_locators": [
    [
      "pronunciation_dictionary_id": "string",
      "version_id": "string"
    ]
  ]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/projects/project_id/pronunciation-dictionaries")! as URL,
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