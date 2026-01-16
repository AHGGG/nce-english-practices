# List Studio Project Snapshots

GET https://api.elevenlabs.io/v1/studio/projects/{project_id}/snapshots

Retrieves a list of snapshots for a Studio project.

Reference: https://elevenlabs.io/docs/api-reference/studio/get-snapshots

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Studio Project Snapshots
  version: endpoint_studio/projects/snapshots.list
paths:
  /v1/studio/projects/{project_id}/snapshots:
    get:
      operationId: list
      summary: List Studio Project Snapshots
      description: Retrieves a list of snapshots for a Studio project.
      tags:
        - - subpackage_studio
          - subpackage_studio/projects
          - subpackage_studio/projects/snapshots
      parameters:
        - name: project_id
          in: path
          description: The ID of the Studio project.
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
                $ref: '#/components/schemas/ProjectSnapshotsResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ProjectSnapshotResponseModelAudioUpload:
      type: object
      properties: {}
    ProjectSnapshotResponseModelZipUpload:
      type: object
      properties: {}
    ProjectSnapshotResponseModel:
      type: object
      properties:
        project_snapshot_id:
          type: string
          description: The ID of the project snapshot.
        project_id:
          type: string
          description: The ID of the project.
        created_at_unix:
          type: integer
          description: The creation date of the project snapshot.
        name:
          type: string
          description: The name of the project snapshot.
        audio_upload:
          oneOf:
            - $ref: '#/components/schemas/ProjectSnapshotResponseModelAudioUpload'
            - type: 'null'
          description: (Deprecated)
        zip_upload:
          oneOf:
            - $ref: '#/components/schemas/ProjectSnapshotResponseModelZipUpload'
            - type: 'null'
          description: (Deprecated)
      required:
        - project_snapshot_id
        - project_id
        - created_at_unix
        - name
    ProjectSnapshotsResponseModel:
      type: object
      properties:
        snapshots:
          type: array
          items:
            $ref: '#/components/schemas/ProjectSnapshotResponseModel'
          description: List of project snapshots.
      required:
        - snapshots

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.projects.snapshots.list("project_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.studio.projects.snapshots.list(
    project_id="project_id"
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

	url := "https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots"

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

url = URI("https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots")! as URL,
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