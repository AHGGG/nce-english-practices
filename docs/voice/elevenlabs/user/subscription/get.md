# Get user subscription

GET https://api.elevenlabs.io/v1/user/subscription

Gets extended information about the users subscription

Reference: https://elevenlabs.io/docs/api-reference/user/subscription/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get user subscription
  version: endpoint_user/subscription.get
paths:
  /v1/user/subscription:
    get:
      operationId: get
      summary: Get user subscription
      description: Gets extended information about the users subscription
      tags:
        - - subpackage_user
          - subpackage_user/subscription
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
                $ref: '#/components/schemas/ExtendedSubscriptionResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ExtendedSubscriptionResponseModelCurrency:
      type: string
      enum:
        - value: usd
        - value: eur
        - value: inr
    SubscriptionStatusType:
      type: string
      enum:
        - value: trialing
        - value: active
        - value: incomplete
        - value: past_due
        - value: free
        - value: free_disabled
    BillingPeriod:
      type: string
      enum:
        - value: monthly_period
        - value: 3_month_period
        - value: 6_month_period
        - value: annual_period
    CharacterRefreshPeriod:
      type: string
      enum:
        - value: monthly_period
        - value: 3_month_period
        - value: 6_month_period
        - value: annual_period
    DiscountResponseModel:
      type: object
      properties:
        discount_percent_off:
          type:
            - number
            - 'null'
          format: double
          description: The discount applied to the invoice. E.g. [20.0f] for 20% off.
        discount_amount_off:
          type:
            - number
            - 'null'
          format: double
          description: The discount applied to the invoice. E.g. [20.0f] for 20 cents off.
    InvoiceResponseModelPaymentIntentStatus:
      type: string
      enum:
        - value: canceled
        - value: processing
        - value: requires_action
        - value: requires_capture
        - value: requires_confirmation
        - value: requires_payment_method
        - value: succeeded
    InvoiceResponseModel:
      type: object
      properties:
        amount_due_cents:
          type: integer
          description: The amount due in cents.
        subtotal_cents:
          type:
            - integer
            - 'null'
          description: >-
            The subtotal amount in cents before tax (exclusive of tax and
            discounts).
        tax_cents:
          type:
            - integer
            - 'null'
          description: The tax amount in cents.
        discount_percent_off:
          type:
            - number
            - 'null'
          format: double
          description: >-
            Deprecated. Use [discounts] instead. The discount applied to the
            invoice. E.g. [20.0f] for 20% off.
        discount_amount_off:
          type:
            - number
            - 'null'
          format: double
          description: >-
            Deprecated. Use [discounts] instead. The discount applied to the
            invoice. E.g. [20.0f] for 20 cents off.
        discounts:
          type: array
          items:
            $ref: '#/components/schemas/DiscountResponseModel'
          description: The discounts applied to the invoice.
        next_payment_attempt_unix:
          type: integer
          description: The Unix timestamp of the next payment attempt.
        payment_intent_status:
          oneOf:
            - $ref: '#/components/schemas/InvoiceResponseModelPaymentIntentStatus'
            - type: 'null'
          description: >-
            The status of this invoice's payment intent. None when there is no
            payment intent.
      required:
        - amount_due_cents
        - discounts
        - next_payment_attempt_unix
        - payment_intent_status
    PendingSubscriptionSwitchResponseModelNextTier:
      type: string
      enum:
        - value: free
        - value: starter
        - value: creator
        - value: pro
        - value: growing_business
        - value: scale_2024_08_10
        - value: grant_tier_1_2025_07_23
        - value: grant_tier_2_2025_07_23
        - value: trial
        - value: enterprise
    PendingSubscriptionSwitchResponseModel:
      type: object
      properties:
        kind:
          type: string
          enum:
            - type: stringLiteral
              value: change
        next_tier:
          $ref: '#/components/schemas/PendingSubscriptionSwitchResponseModelNextTier'
          description: The tier to change to.
        next_billing_period:
          $ref: '#/components/schemas/BillingPeriod'
          description: The billing period to change to.
        timestamp_seconds:
          type: integer
          description: The timestamp of the change.
      required:
        - next_tier
        - next_billing_period
        - timestamp_seconds
    PendingCancellationResponseModel:
      type: object
      properties:
        kind:
          type: string
          enum:
            - type: stringLiteral
              value: cancellation
        timestamp_seconds:
          type: integer
          description: The timestamp of the cancellation.
      required:
        - timestamp_seconds
    ExtendedSubscriptionResponseModelPendingChange:
      oneOf:
        - $ref: '#/components/schemas/PendingSubscriptionSwitchResponseModel'
        - $ref: '#/components/schemas/PendingCancellationResponseModel'
    ExtendedSubscriptionResponseModel:
      type: object
      properties:
        tier:
          type: string
          description: The tier of the user's subscription.
        character_count:
          type: integer
          description: The number of characters used by the user.
        character_limit:
          type: integer
          description: >-
            The maximum number of characters allowed in the current billing
            period.
        max_character_limit_extension:
          type:
            - integer
            - 'null'
          description: >-
            Maximum number of characters that the character limit can be
            exceeded by. Managed by the workspace admin.
        can_extend_character_limit:
          type: boolean
          description: Whether the user can extend their character limit.
        allowed_to_extend_character_limit:
          type: boolean
          description: Whether the user is allowed to extend their character limit.
        next_character_count_reset_unix:
          type:
            - integer
            - 'null'
          description: The Unix timestamp of the next character count reset.
        voice_slots_used:
          type: integer
          description: The number of voice slots used by the user.
        professional_voice_slots_used:
          type: integer
          description: >-
            The number of professional voice slots used by the workspace/user if
            single seat.
        voice_limit:
          type: integer
          description: The maximum number of voice slots allowed for the user.
        max_voice_add_edits:
          type:
            - integer
            - 'null'
          description: The maximum number of voice add/edits allowed for the user.
        voice_add_edit_counter:
          type: integer
          description: The number of voice add/edits used by the user.
        professional_voice_limit:
          type: integer
          description: The maximum number of professional voices allowed for the user.
        can_extend_voice_limit:
          type: boolean
          description: Whether the user can extend their voice limit.
        can_use_instant_voice_cloning:
          type: boolean
          description: Whether the user can use instant voice cloning.
        can_use_professional_voice_cloning:
          type: boolean
          description: Whether the user can use professional voice cloning.
        currency:
          oneOf:
            - $ref: '#/components/schemas/ExtendedSubscriptionResponseModelCurrency'
            - type: 'null'
          description: The currency of the user's subscription.
        status:
          $ref: '#/components/schemas/SubscriptionStatusType'
          description: The status of the user's subscription.
        billing_period:
          oneOf:
            - $ref: '#/components/schemas/BillingPeriod'
            - type: 'null'
          description: The billing period of the user's subscription.
        character_refresh_period:
          oneOf:
            - $ref: '#/components/schemas/CharacterRefreshPeriod'
            - type: 'null'
          description: The character refresh period of the user's subscription.
        next_invoice:
          oneOf:
            - $ref: '#/components/schemas/InvoiceResponseModel'
            - type: 'null'
          description: The next invoice for the user.
        open_invoices:
          type: array
          items:
            $ref: '#/components/schemas/InvoiceResponseModel'
          description: The open invoices for the user.
        has_open_invoices:
          type: boolean
          description: Whether the user has open invoices.
        pending_change:
          oneOf:
            - $ref: >-
                #/components/schemas/ExtendedSubscriptionResponseModelPendingChange
            - type: 'null'
          description: The pending change for the user.
      required:
        - tier
        - character_count
        - character_limit
        - max_character_limit_extension
        - can_extend_character_limit
        - allowed_to_extend_character_limit
        - voice_slots_used
        - professional_voice_slots_used
        - voice_limit
        - voice_add_edit_counter
        - professional_voice_limit
        - can_extend_voice_limit
        - can_use_instant_voice_cloning
        - can_use_professional_voice_cloning
        - status
        - open_invoices
        - has_open_invoices

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.user.subscription.get();
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.user.subscription.get()

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/user/subscription"

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

url = URI("https://api.elevenlabs.io/v1/user/subscription")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/user/subscription")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/user/subscription', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/user/subscription");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/user/subscription")! as URL,
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