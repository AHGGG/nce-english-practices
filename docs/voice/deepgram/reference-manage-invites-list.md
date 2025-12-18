# List Project Invites

GET https://api.deepgram.com/v1/projects/{project_id}/invites

Generates a list of invites for a specific project

Reference: https://developers.deepgram.com/reference/manage/invites/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Project Invites
  version: endpoint_manage/v1/projects/members/invites.list
paths:
  /v1/projects/{project_id}/invites:
    get:
      operationId: list
      summary: List Project Invites
      description: Generates a list of invites for a specific project
      tags:
        - - subpackage_manage
          - subpackage_manage/v1
          - subpackage_manage/v1/projects
          - subpackage_manage/v1/projects/members
          - subpackage_manage/v1/projects/members/invites
      parameters:
        - name: project_id
          in: path
          required: true
          schema:
            type: string
        - name: Authorization
          in: header
          description: Header authentication of the form `undefined <token>`
          required: true
          schema:
            type: string
      responses:
        '200':
          description: A list of invites for a specific project
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListProjectInvitesV1Response'
        '400':
          description: Invalid Request
          content: {}
components:
  schemas:
    ListProjectInvitesV1ResponseInvitesItems:
      type: object
      properties:
        email:
          type: string
          description: The email address of the invitee
        scope:
          type: string
          description: The scope of the invitee
    ListProjectInvitesV1Response:
      type: object
      properties:
        invites:
          type: array
          items:
            $ref: '#/components/schemas/ListProjectInvitesV1ResponseInvitesItems'

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/projects/project_id/invites"

headers = {"Authorization": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/projects/project_id/invites';
const options = {method: 'GET', headers: {Authorization: '<apiKey>'}};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.deepgram.com/v1/projects/project_id/invites"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("Authorization", "<apiKey>")

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

url = URI("https://api.deepgram.com/v1/projects/project_id/invites")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["Authorization"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.deepgram.com/v1/projects/project_id/invites")
  .header("Authorization", "<apiKey>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.deepgram.com/v1/projects/project_id/invites', [
  'headers' => [
    'Authorization' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/projects/project_id/invites");
var request = new RestRequest(Method.GET);
request.AddHeader("Authorization", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Authorization": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/projects/project_id/invites")! as URL,
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