# Get pronunciation dictionary by version

GET https://api.elevenlabs.io/v1/pronunciation-dictionaries/{dictionary_id}/{version_id}/download

Get a PLS file with a pronunciation dictionary version rules

Reference: https://elevenlabs.io/docs/api-reference/pronunciation-dictionaries/download

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get pronunciation dictionary by version
  version: endpoint_pronunciationDictionaries.download
paths:
  /v1/pronunciation-dictionaries/{dictionary_id}/{version_id}/download:
    get:
      operationId: download
      summary: Get pronunciation dictionary by version
      description: Get a PLS file with a pronunciation dictionary version rules
      tags:
        - - subpackage_pronunciationDictionaries
      parameters:
        - name: dictionary_id
          in: path
          description: The id of the pronunciation dictionary
          required: true
          schema:
            type: string
        - name: version_id
          in: path
          description: The id of the pronunciation dictionary version
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
          description: The PLS file containing pronunciation dictionary rules
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary
        '422':
          description: Validation Error
          content: {}

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.pronunciationDictionaries.download("dictionary_id", "version_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.pronunciation_dictionaries.download(
    dictionary_id="dictionary_id",
    version_id="version_id"
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

	url := "https://api.elevenlabs.io/v1/pronunciation-dictionaries/dictionary_id/version_id/download"

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

url = URI("https://api.elevenlabs.io/v1/pronunciation-dictionaries/dictionary_id/version_id/download")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/pronunciation-dictionaries/dictionary_id/version_id/download")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/pronunciation-dictionaries/dictionary_id/version_id/download', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/pronunciation-dictionaries/dictionary_id/version_id/download");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/pronunciation-dictionaries/dictionary_id/version_id/download")! as URL,
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