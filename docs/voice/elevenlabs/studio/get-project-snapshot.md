# Get Project Snapshot

GET https://api.elevenlabs.io/v1/studio/projects/{project_id}/snapshots/{project_snapshot_id}

Returns the project snapshot.

Reference: https://elevenlabs.io/docs/api-reference/studio/get-project-snapshot

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Project Snapshot
  version: endpoint_studio/projects/snapshots.get
paths:
  /v1/studio/projects/{project_id}/snapshots/{project_snapshot_id}:
    get:
      operationId: get
      summary: Get Project Snapshot
      description: Returns the project snapshot.
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
        - name: project_snapshot_id
          in: path
          description: The ID of the Studio project snapshot.
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
                $ref: '#/components/schemas/ProjectSnapshotExtendedResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ProjectSnapshotExtendedResponseModelAudioUpload:
      type: object
      properties: {}
    ProjectSnapshotExtendedResponseModelZipUpload:
      type: object
      properties: {}
    CharacterAlignmentModel:
      type: object
      properties:
        characters:
          type: array
          items:
            type: string
        character_start_times_seconds:
          type: array
          items:
            type: number
            format: double
        character_end_times_seconds:
          type: array
          items:
            type: number
            format: double
      required:
        - characters
        - character_start_times_seconds
        - character_end_times_seconds
    ProjectSnapshotExtendedResponseModel:
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
            - $ref: >-
                #/components/schemas/ProjectSnapshotExtendedResponseModelAudioUpload
            - type: 'null'
          description: (Deprecated)
        zip_upload:
          oneOf:
            - $ref: >-
                #/components/schemas/ProjectSnapshotExtendedResponseModelZipUpload
            - type: 'null'
          description: (Deprecated)
        character_alignments:
          type: array
          items:
            $ref: '#/components/schemas/CharacterAlignmentModel'
        audio_duration_secs:
          type: number
          format: double
          description: The total duration of the audio in seconds.
      required:
        - project_snapshot_id
        - project_id
        - created_at_unix
        - name
        - character_alignments
        - audio_duration_secs

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.projects.snapshots.get("project_id", "project_snapshot_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.studio.projects.snapshots.get(
    project_id="project_id",
    project_snapshot_id="project_snapshot_id"
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

	url := "https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots/project_snapshot_id"

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

url = URI("https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots/project_snapshot_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots/project_snapshot_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots/project_snapshot_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots/project_snapshot_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/projects/project_id/snapshots/project_snapshot_id")! as URL,
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