# Create a pronunciation dictionary from a file

POST https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file
Content-Type: multipart/form-data

Creates a new pronunciation dictionary from a lexicon .PLS file

Reference: https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/create-from-file

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create a pronunciation dictionary from a file
  version: endpoint_pronunciationDictionaries.create_from_file
paths:
  /v1/pronunciation-dictionaries/add-from-file:
    post:
      operationId: create-from-file
      summary: Create a pronunciation dictionary from a file
      description: Creates a new pronunciation dictionary from a lexicon .PLS file
      tags:
        - - subpackage_pronunciationDictionaries
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
                $ref: '#/components/schemas/AddPronunciationDictionaryResponseModel'
        '422':
          description: Validation Error
          content: {}
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: >-
                    The name of the pronunciation dictionary, used for
                    identification only.
                file:
                  type: string
                  format: binary
                  description: >-
                    A lexicon .pls file which we will use to initialize the
                    project with.
                description:
                  type:
                    - string
                    - 'null'
                  description: >-
                    A description of the pronunciation dictionary, used for
                    identification only.
                workspace_access:
                  oneOf:
                    - $ref: >-
                        #/components/schemas/V1PronunciationDictionariesAddFromFilePostRequestBodyContentMultipartFormDataSchemaWorkspaceAccess
                    - type: 'null'
                  description: >-
                    Should be one of 'admin', 'editor' or 'viewer'. If not
                    provided, defaults to no access.
              required:
                - name
components:
  schemas:
    V1PronunciationDictionariesAddFromFilePostRequestBodyContentMultipartFormDataSchemaWorkspaceAccess:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    AddPronunciationDictionaryResponseModelPermissionOnResource:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    AddPronunciationDictionaryResponseModel:
      type: object
      properties:
        id:
          type: string
          description: The ID of the created pronunciation dictionary.
        name:
          type: string
          description: The name of the created pronunciation dictionary.
        created_by:
          type: string
          description: The user ID of the creator of the pronunciation dictionary.
        creation_time_unix:
          type: integer
          description: The creation time of the pronunciation dictionary in Unix timestamp.
        version_id:
          type: string
          description: The ID of the created pronunciation dictionary version.
        version_rules_num:
          type: integer
          description: The number of rules in the version of the pronunciation dictionary.
        description:
          type:
            - string
            - 'null'
          description: The description of the pronunciation dictionary.
        permission_on_resource:
          oneOf:
            - $ref: >-
                #/components/schemas/AddPronunciationDictionaryResponseModelPermissionOnResource
            - type: 'null'
          description: The permission on the resource of the pronunciation dictionary.
      required:
        - id
        - name
        - created_by
        - creation_time_unix
        - version_id
        - version_rules_num
        - permission_on_resource

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.pronunciationDictionaries.createFromFile({});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.pronunciation_dictionaries.create_from_file()

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

	url := "https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\nMy Dictionary\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"description\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"workspace_access\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("xi-api-key", "xi-api-key")
	req.Header.Add("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")

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

url = URI("https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["xi-api-key"] = 'xi-api-key'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\nMy Dictionary\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"description\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"workspace_access\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file")
  .header("xi-api-key", "xi-api-key")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\nMy Dictionary\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"description\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"workspace_access\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file', [
  'multipart' => [
    [
        'name' => 'name',
        'contents' => 'My Dictionary'
    ],
    [
        'name' => 'file',
        'filename' => '<file1>',
        'contents' => null
    ]
  ]
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file");
var request = new RestRequest(Method.POST);
request.AddHeader("xi-api-key", "xi-api-key");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\nMy Dictionary\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"<file1>\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"description\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"workspace_access\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "xi-api-key": "xi-api-key",
  "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
]
let parameters = [
  [
    "name": "name",
    "value": "My Dictionary"
  ],
  [
    "name": "file",
    "fileName": "<file1>"
  ],
  [
    "name": "description",
    "value": 
  ],
  [
    "name": "workspace_access",
    "value": 
  ]
]

let boundary = "---011000010111000001101001"

var body = ""
var error: NSError? = nil
for param in parameters {
  let paramName = param["name"]!
  body += "--\(boundary)\r\n"
  body += "Content-Disposition:form-data; name=\"\(paramName)\""
  if let filename = param["fileName"] {
    let contentType = param["content-type"]!
    let fileContent = String(contentsOfFile: filename, encoding: String.Encoding.utf8)
    if (error != nil) {
      print(error as Any)
    }
    body += "; filename=\"\(filename)\"\r\n"
    body += "Content-Type: \(contentType)\r\n\r\n"
    body += fileContent
  } else if let paramValue = param["value"] {
    body += "\r\n\r\n\(paramValue)"
  }
}

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-file")! as URL,
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