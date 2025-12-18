# List Project Self-Hosted Distribution Credentials

GET https://api.deepgram.com/v1/projects/{project_id}/self-hosted/distribution/credentials

Lists sets of distribution credentials for the specified project

Reference: https://developers.deepgram.com/reference/self-hosted/distribution-credentials/list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List Project Self-Hosted Distribution Credentials
  version: endpoint_selfHosted/v1/distributionCredentials.list
paths:
  /v1/projects/{project_id}/self-hosted/distribution/credentials:
    get:
      operationId: list
      summary: List Project Self-Hosted Distribution Credentials
      description: Lists sets of distribution credentials for the specified project
      tags:
        - - subpackage_selfHosted
          - subpackage_selfHosted/v1
          - subpackage_selfHosted/v1/distributionCredentials
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
          description: A list of distribution credentials for a specific project
          content:
            application/json:
              schema:
                $ref: >-
                  #/components/schemas/ListProjectDistributionCredentialsV1Response
        '400':
          description: Invalid Request
          content: {}
components:
  schemas:
    ListProjectDistributionCredentialsV1ResponseDistributionCredentialsItemsMember:
      type: object
      properties:
        member_id:
          type: string
          format: uuid
          description: Unique identifier for the member
        email:
          type: string
          format: email
          description: Email address of the member
      required:
        - member_id
        - email
    ListProjectDistributionCredentialsV1ResponseDistributionCredentialsItemsDistributionCredentials:
      type: object
      properties:
        distribution_credentials_id:
          type: string
          format: uuid
          description: Unique identifier for the distribution credentials
        provider:
          type: string
          description: The provider of the distribution service
        comment:
          type: string
          description: Optional comment about the credentials
        scopes:
          type: array
          items:
            type: string
          description: List of permission scopes for the credentials
        created:
          type: string
          format: date-time
          description: Timestamp when the credentials were created
      required:
        - distribution_credentials_id
        - provider
        - scopes
        - created
    ListProjectDistributionCredentialsV1ResponseDistributionCredentialsItems:
      type: object
      properties:
        member:
          $ref: >-
            #/components/schemas/ListProjectDistributionCredentialsV1ResponseDistributionCredentialsItemsMember
        distribution_credentials:
          $ref: >-
            #/components/schemas/ListProjectDistributionCredentialsV1ResponseDistributionCredentialsItemsDistributionCredentials
      required:
        - member
        - distribution_credentials
    ListProjectDistributionCredentialsV1Response:
      type: object
      properties:
        distribution_credentials:
          type: array
          items:
            $ref: >-
              #/components/schemas/ListProjectDistributionCredentialsV1ResponseDistributionCredentialsItems
          description: Array of distribution credentials with associated member information

```

## SDK Code Examples

```python
import requests

url = "https://api.deepgram.com/v1/projects/project_id/self-hosted/distribution/credentials"

headers = {"Authorization": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.deepgram.com/v1/projects/project_id/self-hosted/distribution/credentials';
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

	url := "https://api.deepgram.com/v1/projects/project_id/self-hosted/distribution/credentials"

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

url = URI("https://api.deepgram.com/v1/projects/project_id/self-hosted/distribution/credentials")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["Authorization"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.deepgram.com/v1/projects/project_id/self-hosted/distribution/credentials")
  .header("Authorization", "<apiKey>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.deepgram.com/v1/projects/project_id/self-hosted/distribution/credentials', [
  'headers' => [
    'Authorization' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.deepgram.com/v1/projects/project_id/self-hosted/distribution/credentials");
var request = new RestRequest(Method.GET);
request.AddHeader("Authorization", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Authorization": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.deepgram.com/v1/projects/project_id/self-hosted/distribution/credentials")! as URL,
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