# List Project Member Scopes

GET https://api.deepgram.com/v1/projects/{project_id}/members/{member_id}/scopes

Retrieves a list of scopes for a specific member

Reference: https://developers.deepgram.com/reference/manage/members/scopes/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Project Member Scopes
  version: endpoint_manage/v1/projects/members/scopes.list
paths:
  /v1/projects/{project_id}/members/{member_id}/scopes:
    get:
      operationId: list
      summary: List Project Member Scopes
      description: Retrieves a list of scopes for a specific member
      tags:
        - - subpackage_manage
          - subpackage_manage/v1
          - subpackage_manage/v1/projects
          - subpackage_manage/v1/projects/members
          - subpackage_manage/v1/projects/members/scopes
      parameters:
        - name: project_id
          in: path
          required: true
          schema:
            type: string
        - name: member_id
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
          description: A list of scopes for a specific member
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListProjectMemberScopesV1Response'
        '400':
          description: Invalid Request
          content: {}
components:
  schemas:
    ListProjectMemberScopesV1Response:
      type: object
      properties:
        scopes:
          type: array
          items:
            type: string
          description: The API scopes of the member

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/projects/project_id/members/member_id/scopes"

headers = {"Authorization": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/projects/project_id/members/member_id/scopes';
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

	url := "https://api.deepgram.com/v1/projects/project_id/members/member_id/scopes"

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

url = URI("https://api.deepgram.com/v1/projects/project_id/members/member_id/scopes")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["Authorization"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.deepgram.com/v1/projects/project_id/members/member_id/scopes")
  .header("Authorization", "<apiKey>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.deepgram.com/v1/projects/project_id/members/member_id/scopes', [
  'headers' => [
    'Authorization' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/projects/project_id/members/member_id/scopes");
var request = new RestRequest(Method.GET);
request.AddHeader("Authorization", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Authorization": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/projects/project_id/members/member_id/scopes")! as URL,
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