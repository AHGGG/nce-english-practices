# Get conversation details

GET https://api.elevenlabs.io/v1/convai/conversations/{conversation_id}

Get the details of a particular conversation

Reference: https://elevenlabs.io/docs/api-reference/conversations/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Conversation Details
  version: endpoint_conversationalAi/conversations.get
paths:
  /v1/convai/conversations/{conversation_id}:
    get:
      operationId: get
      summary: Get Conversation Details
      description: Get the details of a particular conversation
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/conversations
      parameters:
        - name: conversation_id
          in: path
          description: The id of the conversation you're taking the action on.
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
                $ref: '#/components/schemas/GetConversationResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    GetConversationResponseModelStatus:
      type: string
      enum:
        - value: initiated
        - value: in-progress
        - value: processing
        - value: done
        - value: failed
    ConversationHistoryTranscriptCommonModelOutputRole:
      type: string
      enum:
        - value: user
        - value: agent
    AgentMetadata:
      type: object
      properties:
        agent_id:
          type: string
        branch_id:
          type:
            - string
            - 'null'
        workflow_node_id:
          type:
            - string
            - 'null'
      required:
        - agent_id
    ConversationHistoryMultivoiceMessagePartModel:
      type: object
      properties:
        text:
          type: string
        voice_label:
          type:
            - string
            - 'null'
        time_in_call_secs:
          type:
            - integer
            - 'null'
      required:
        - text
        - voice_label
        - time_in_call_secs
    ConversationHistoryMultivoiceMessageModel:
      type: object
      properties:
        parts:
          type: array
          items:
            $ref: '#/components/schemas/ConversationHistoryMultivoiceMessagePartModel'
      required:
        - parts
    ToolType:
      type: string
      enum:
        - value: system
        - value: webhook
        - value: client
        - value: mcp
        - value: workflow
        - value: api_integration_webhook
        - value: api_integration_mcp
    ConversationHistoryTranscriptToolCallWebhookDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: webhook
        method:
          type: string
        url:
          type: string
        headers:
          type: object
          additionalProperties:
            type: string
        path_params:
          type: object
          additionalProperties:
            type: string
        query_params:
          type: object
          additionalProperties:
            type: string
        body:
          type:
            - string
            - 'null'
      required:
        - method
        - url
    ConversationHistoryTranscriptToolCallClientDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: client
        parameters:
          type: string
      required:
        - parameters
    ConversationHistoryTranscriptToolCallMCPDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: mcp
        mcp_server_id:
          type: string
        mcp_server_name:
          type: string
        integration_type:
          type: string
        parameters:
          type: object
          additionalProperties:
            type: string
        approval_policy:
          type: string
        requires_approval:
          type: boolean
          default: false
        mcp_tool_name:
          type: string
          default: ''
        mcp_tool_description:
          type: string
          default: ''
      required:
        - mcp_server_id
        - mcp_server_name
        - integration_type
        - approval_policy
    ConversationHistoryTranscriptToolCallApiIntegrationWebhookDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: api_integration_webhook
        integration_id:
          type: string
        credential_id:
          type: string
        integration_connection_id:
          type: string
        webhook_details:
          $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallWebhookDetails
      required:
        - integration_id
        - credential_id
        - integration_connection_id
        - webhook_details
    ConversationHistoryTranscriptToolCallCommonModelOutputToolDetails:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallWebhookDetails
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallClientDetails
        - $ref: '#/components/schemas/ConversationHistoryTranscriptToolCallMCPDetails'
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallApiIntegrationWebhookDetails
    ConversationHistoryTranscriptToolCallCommonModel-Output:
      type: object
      properties:
        type:
          oneOf:
            - $ref: '#/components/schemas/ToolType'
            - type: 'null'
        request_id:
          type: string
        tool_name:
          type: string
        params_as_json:
          type: string
        tool_has_been_called:
          type: boolean
        tool_details:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptToolCallCommonModelOutputToolDetails
            - type: 'null'
      required:
        - request_id
        - tool_name
        - params_as_json
        - tool_has_been_called
    DynamicVariableUpdateCommonModel:
      type: object
      properties:
        variable_name:
          type: string
        old_value:
          type:
            - string
            - 'null'
        new_value:
          type: string
        updated_at:
          type: number
          format: double
        tool_name:
          type: string
        tool_request_id:
          type: string
      required:
        - variable_name
        - old_value
        - new_value
        - updated_at
        - tool_name
        - tool_request_id
    ConversationHistoryTranscriptOtherToolsResultCommonModelType:
      type: string
      enum:
        - value: client
        - value: webhook
        - value: mcp
    ConversationHistoryTranscriptOtherToolsResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModelType
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
    EndCallToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: end_call_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
        message:
          type:
            - string
            - 'null'
    LanguageDetectionToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: language_detection_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
        language:
          type:
            - string
            - 'null'
    TransferToAgentToolResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_agent_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        from_agent:
          type: string
        to_agent:
          type: string
        condition:
          type: string
        delay_ms:
          type: integer
          default: 0
        transfer_message:
          type:
            - string
            - 'null'
        enable_transferred_agent_first_message:
          type: boolean
          default: false
      required:
        - from_agent
        - to_agent
        - condition
    TransferToAgentToolResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_agent_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        from_agent:
          type: string
        error:
          type: string
      required:
        - from_agent
        - error
    TransferToNumberResultTwilioSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_twilio_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        transfer_number:
          type: string
        reason:
          type:
            - string
            - 'null'
        client_message:
          type:
            - string
            - 'null'
        agent_message:
          type: string
        conference_name:
          type: string
        note:
          type:
            - string
            - 'null'
      required:
        - transfer_number
        - agent_message
        - conference_name
    TransferToNumberResultSipSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_sip_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        transfer_number:
          type: string
        reason:
          type:
            - string
            - 'null'
        note:
          type:
            - string
            - 'null'
      required:
        - transfer_number
    TransferToNumberResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        error:
          type: string
        details:
          type:
            - string
            - 'null'
      required:
        - error
    SkipTurnToolResponseModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: skip_turn_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
    PlayDTMFResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: play_dtmf_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        dtmf_tones:
          type: string
        reason:
          type:
            - string
            - 'null'
      required:
        - dtmf_tones
    PlayDTMFResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: play_dtmf_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        error:
          type: string
        details:
          type:
            - string
            - 'null'
      required:
        - error
    VoiceMailDetectionResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: voicemail_detection_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        voicemail_message:
          type:
            - string
            - 'null'
        reason:
          type:
            - string
            - 'null'
    TestToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: testing_tool_result
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type: string
          default: Skipping tool call in test mode
    ConversationHistoryTranscriptSystemToolResultCommonModelResult:
      oneOf:
        - $ref: '#/components/schemas/EndCallToolResultModel'
        - $ref: '#/components/schemas/LanguageDetectionToolResultModel'
        - $ref: '#/components/schemas/TransferToAgentToolResultSuccessModel'
        - $ref: '#/components/schemas/TransferToAgentToolResultErrorModel'
        - $ref: '#/components/schemas/TransferToNumberResultTwilioSuccessModel'
        - $ref: '#/components/schemas/TransferToNumberResultSipSuccessModel'
        - $ref: '#/components/schemas/TransferToNumberResultErrorModel'
        - $ref: '#/components/schemas/SkipTurnToolResponseModel'
        - $ref: '#/components/schemas/PlayDTMFResultSuccessModel'
        - $ref: '#/components/schemas/PlayDTMFResultErrorModel'
        - $ref: '#/components/schemas/VoiceMailDetectionResultSuccessModel'
        - $ref: '#/components/schemas/TestToolResultModel'
    ConversationHistoryTranscriptSystemToolResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: system
        result:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModelResult
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
    ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: api_integration_webhook
        integration_id:
          type: string
        credential_id:
          type: string
        integration_connection_id:
          type: string
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
        - integration_id
        - credential_id
        - integration_connection_id
    WorkflowToolEdgeStepModel:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: edge
        edge_id:
          type: string
        target_node_id:
          type: string
      required:
        - step_latency_secs
        - edge_id
        - target_node_id
    WorkflowToolNestedToolsStepModelOutputResultsItems:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output
    WorkflowToolNestedToolsStepModel-Output:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: nested_tools
        node_id:
          type: string
        requests:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptToolCallCommonModel-Output
        results:
          type: array
          items:
            $ref: >-
              #/components/schemas/WorkflowToolNestedToolsStepModelOutputResultsItems
        is_successful:
          type: boolean
      required:
        - step_latency_secs
        - node_id
        - requests
        - results
        - is_successful
    WorkflowToolMaxIterationsExceededStepModel:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: max_iterations_exceeded
        max_iterations:
          type: integer
      required:
        - step_latency_secs
        - max_iterations
    WorkflowToolResponseModelOutputStepsItems:
      oneOf:
        - $ref: '#/components/schemas/WorkflowToolEdgeStepModel'
        - $ref: '#/components/schemas/WorkflowToolNestedToolsStepModel-Output'
        - $ref: '#/components/schemas/WorkflowToolMaxIterationsExceededStepModel'
    WorkflowToolResponseModel-Output:
      type: object
      properties:
        steps:
          type: array
          items:
            $ref: '#/components/schemas/WorkflowToolResponseModelOutputStepsItems'
    ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: workflow
        result:
          oneOf:
            - $ref: '#/components/schemas/WorkflowToolResponseModel-Output'
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
    ConversationHistoryTranscriptCommonModelOutputToolResultsItems:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output
    UserFeedbackScore:
      type: string
      enum:
        - value: like
        - value: dislike
    UserFeedback:
      type: object
      properties:
        score:
          $ref: '#/components/schemas/UserFeedbackScore'
        time_in_call_secs:
          type: integer
      required:
        - score
        - time_in_call_secs
    MetricRecord:
      type: object
      properties:
        elapsed_time:
          type: number
          format: double
      required:
        - elapsed_time
    ConversationTurnMetrics:
      type: object
      properties:
        metrics:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/MetricRecord'
    RagChunkMetadata:
      type: object
      properties:
        document_id:
          type: string
        chunk_id:
          type: string
        vector_distance:
          type: number
          format: double
      required:
        - document_id
        - chunk_id
        - vector_distance
    EmbeddingModelEnum:
      type: string
      enum:
        - value: e5_mistral_7b_instruct
        - value: multilingual_e5_large_instruct
    RagRetrievalInfo:
      type: object
      properties:
        chunks:
          type: array
          items:
            $ref: '#/components/schemas/RagChunkMetadata'
        embedding_model:
          $ref: '#/components/schemas/EmbeddingModelEnum'
        retrieval_query:
          type: string
        rag_latency_secs:
          type: number
          format: double
      required:
        - chunks
        - embedding_model
        - retrieval_query
        - rag_latency_secs
    LLMTokensCategoryUsage:
      type: object
      properties:
        tokens:
          type: integer
          default: 0
        price:
          type: number
          format: double
          default: 0
    LLMInputOutputTokensUsage:
      type: object
      properties:
        input:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        input_cache_read:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        input_cache_write:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        output_total:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
    LLMUsage-Output:
      type: object
      properties:
        model_usage:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LLMInputOutputTokensUsage'
    ConversationHistoryTranscriptCommonModelOutputSourceMedium:
      type: string
      enum:
        - value: audio
        - value: text
    ConversationHistoryTranscriptCommonModel-Output:
      type: object
      properties:
        role:
          $ref: >-
            #/components/schemas/ConversationHistoryTranscriptCommonModelOutputRole
        agent_metadata:
          oneOf:
            - $ref: '#/components/schemas/AgentMetadata'
            - type: 'null'
        message:
          type:
            - string
            - 'null'
        multivoice_message:
          oneOf:
            - $ref: '#/components/schemas/ConversationHistoryMultivoiceMessageModel'
            - type: 'null'
        tool_calls:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptToolCallCommonModel-Output
        tool_results:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModelOutputToolResultsItems
        feedback:
          oneOf:
            - $ref: '#/components/schemas/UserFeedback'
            - type: 'null'
        llm_override:
          type:
            - string
            - 'null'
        time_in_call_secs:
          type: integer
        conversation_turn_metrics:
          oneOf:
            - $ref: '#/components/schemas/ConversationTurnMetrics'
            - type: 'null'
        rag_retrieval_info:
          oneOf:
            - $ref: '#/components/schemas/RagRetrievalInfo'
            - type: 'null'
        llm_usage:
          oneOf:
            - $ref: '#/components/schemas/LLMUsage-Output'
            - type: 'null'
        interrupted:
          type: boolean
          default: false
        original_message:
          type:
            - string
            - 'null'
        source_medium:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptCommonModelOutputSourceMedium
            - type: 'null'
      required:
        - role
        - time_in_call_secs
    ConversationDeletionSettings:
      type: object
      properties:
        deletion_time_unix_secs:
          type:
            - integer
            - 'null'
        deleted_logs_at_time_unix_secs:
          type:
            - integer
            - 'null'
        deleted_audio_at_time_unix_secs:
          type:
            - integer
            - 'null'
        deleted_transcript_at_time_unix_secs:
          type:
            - integer
            - 'null'
        delete_transcript_and_pii:
          type: boolean
          default: false
        delete_audio:
          type: boolean
          default: false
    ConversationFeedbackType:
      type: string
      enum:
        - value: thumbs
        - value: rating
    ConversationHistoryFeedbackCommonModel:
      type: object
      properties:
        type:
          oneOf:
            - $ref: '#/components/schemas/ConversationFeedbackType'
            - type: 'null'
        overall_score:
          oneOf:
            - $ref: '#/components/schemas/UserFeedbackScore'
            - type: 'null'
        likes:
          type: integer
          default: 0
        dislikes:
          type: integer
          default: 0
        rating:
          type:
            - integer
            - 'null'
        comment:
          type:
            - string
            - 'null'
    AuthorizationMethod:
      type: string
      enum:
        - value: invalid
        - value: public
        - value: authorization_header
        - value: signed_url
        - value: shareable_link
        - value: livekit_token
        - value: livekit_token_website
        - value: genesys_api_key
        - value: whatsapp
    LLMCategoryUsage:
      type: object
      properties:
        irreversible_generation:
          $ref: '#/components/schemas/LLMUsage-Output'
        initiated_generation:
          $ref: '#/components/schemas/LLMUsage-Output'
    ConversationChargingCommonModel:
      type: object
      properties:
        dev_discount:
          type: boolean
          default: false
        is_burst:
          type: boolean
          default: false
        tier:
          type:
            - string
            - 'null'
        llm_usage:
          $ref: '#/components/schemas/LLMCategoryUsage'
        llm_price:
          type:
            - number
            - 'null'
          format: double
        llm_charge:
          type:
            - integer
            - 'null'
        call_charge:
          type:
            - integer
            - 'null'
        free_minutes_consumed:
          type: number
          format: double
          default: 0
        free_llm_dollars_consumed:
          type: number
          format: double
          default: 0
    ConversationHistoryTwilioPhoneCallModelDirection:
      type: string
      enum:
        - value: inbound
        - value: outbound
    ConversationHistoryTwilioPhoneCallModel:
      type: object
      properties:
        direction:
          $ref: >-
            #/components/schemas/ConversationHistoryTwilioPhoneCallModelDirection
        phone_number_id:
          type: string
        agent_number:
          type: string
        external_number:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: twilio
        stream_sid:
          type: string
        call_sid:
          type: string
      required:
        - direction
        - phone_number_id
        - agent_number
        - external_number
        - type
        - stream_sid
        - call_sid
    ConversationHistorySipTrunkingPhoneCallModelDirection:
      type: string
      enum:
        - value: inbound
        - value: outbound
    ConversationHistorySIPTrunkingPhoneCallModel:
      type: object
      properties:
        direction:
          $ref: >-
            #/components/schemas/ConversationHistorySipTrunkingPhoneCallModelDirection
        phone_number_id:
          type: string
        agent_number:
          type: string
        external_number:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: sip_trunking
        call_sid:
          type: string
      required:
        - direction
        - phone_number_id
        - agent_number
        - external_number
        - type
        - call_sid
    ConversationHistoryMetadataCommonModelPhoneCall:
      oneOf:
        - $ref: '#/components/schemas/ConversationHistoryTwilioPhoneCallModel'
        - $ref: '#/components/schemas/ConversationHistorySIPTrunkingPhoneCallModel'
    ConversationHistoryBatchCallModel:
      type: object
      properties:
        batch_call_id:
          type: string
        batch_call_recipient_id:
          type: string
      required:
        - batch_call_id
        - batch_call_recipient_id
    ConversationHistoryErrorCommonModel:
      type: object
      properties:
        code:
          type: integer
        reason:
          type:
            - string
            - 'null'
      required:
        - code
    ConversationHistoryRagUsageCommonModel:
      type: object
      properties:
        usage_count:
          type: integer
        embedding_model:
          type: string
      required:
        - usage_count
        - embedding_model
    FeatureStatusCommonModel:
      type: object
      properties:
        enabled:
          type: boolean
          default: false
        used:
          type: boolean
          default: false
    WorkflowFeaturesUsageCommonModel:
      type: object
      properties:
        enabled:
          type: boolean
          default: false
        tool_node:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        standalone_agent_node:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        phone_number_node:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        end_node:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
    TestsFeatureUsageCommonModel:
      type: object
      properties:
        enabled:
          type: boolean
          default: false
        tests_ran_after_last_modification:
          type: boolean
          default: false
        tests_ran_in_last_7_days:
          type: boolean
          default: false
    FeaturesUsageCommonModel:
      type: object
      properties:
        language_detection:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        transfer_to_agent:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        transfer_to_number:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        multivoice:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        dtmf_tones:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        external_mcp_servers:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        pii_zrm_workspace:
          type: boolean
          default: false
        pii_zrm_agent:
          type: boolean
          default: false
        tool_dynamic_variable_updates:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        is_livekit:
          type: boolean
          default: false
        voicemail_detection:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
        workflow:
          $ref: '#/components/schemas/WorkflowFeaturesUsageCommonModel'
        agent_testing:
          $ref: '#/components/schemas/TestsFeatureUsageCommonModel'
        versioning:
          $ref: '#/components/schemas/FeatureStatusCommonModel'
    ConversationHistoryElevenAssistantCommonModel:
      type: object
      properties:
        is_eleven_assistant:
          type: boolean
          default: false
    ConversationInitiationSource:
      type: string
      enum:
        - value: unknown
        - value: android_sdk
        - value: node_js_sdk
        - value: react_native_sdk
        - value: react_sdk
        - value: js_sdk
        - value: python_sdk
        - value: widget
        - value: sip_trunk
        - value: twilio
        - value: genesys
        - value: swift_sdk
        - value: whatsapp
        - value: flutter_sdk
    DefaultConversationInitiationTrigger:
      type: object
      properties:
        trigger_type:
          type: string
          enum:
            - type: stringLiteral
              value: default
    ZendeskConversationInitiationTrigger:
      type: object
      properties:
        trigger_type:
          type: string
          enum:
            - type: stringLiteral
              value: zendesk
        ticket_id:
          type: integer
      required:
        - ticket_id
    ConversationHistoryMetadataCommonModelInitiationTrigger:
      oneOf:
        - $ref: '#/components/schemas/DefaultConversationInitiationTrigger'
        - $ref: '#/components/schemas/ZendeskConversationInitiationTrigger'
    AsyncConversationMetadataDeliveryStatus:
      type: string
      enum:
        - value: pending
        - value: success
        - value: failed
    AsyncConversationMetadata:
      type: object
      properties:
        delivery_status:
          $ref: '#/components/schemas/AsyncConversationMetadataDeliveryStatus'
        delivery_timestamp:
          type: integer
        delivery_error:
          type:
            - string
            - 'null'
        external_system:
          type: string
        external_id:
          type: string
        retry_count:
          type: integer
          default: 0
        last_retry_timestamp:
          type:
            - integer
            - 'null'
      required:
        - delivery_status
        - delivery_timestamp
        - external_system
        - external_id
    WhatsAppConversationInfoDirection:
      type: string
      enum:
        - value: inbound
        - value: outbound
        - value: unknown
      default: unknown
    WhatsAppConversationInfo:
      type: object
      properties:
        direction:
          $ref: '#/components/schemas/WhatsAppConversationInfoDirection'
        whatsapp_phone_number_id:
          type:
            - string
            - 'null'
        whatsapp_user_id:
          type: string
      required:
        - whatsapp_user_id
    AgentDefinitionSource:
      type: string
      enum:
        - value: cli
        - value: ui
        - value: api
        - value: template
        - value: unknown
    ConversationHistoryMetadataCommonModel:
      type: object
      properties:
        start_time_unix_secs:
          type: integer
        accepted_time_unix_secs:
          type:
            - integer
            - 'null'
        call_duration_secs:
          type: integer
        cost:
          type:
            - integer
            - 'null'
        deletion_settings:
          $ref: '#/components/schemas/ConversationDeletionSettings'
        feedback:
          $ref: '#/components/schemas/ConversationHistoryFeedbackCommonModel'
        authorization_method:
          $ref: '#/components/schemas/AuthorizationMethod'
        charging:
          $ref: '#/components/schemas/ConversationChargingCommonModel'
        phone_call:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryMetadataCommonModelPhoneCall
            - type: 'null'
        batch_call:
          oneOf:
            - $ref: '#/components/schemas/ConversationHistoryBatchCallModel'
            - type: 'null'
        termination_reason:
          type: string
          default: ''
        error:
          oneOf:
            - $ref: '#/components/schemas/ConversationHistoryErrorCommonModel'
            - type: 'null'
        warnings:
          type: array
          items:
            type: string
        main_language:
          type:
            - string
            - 'null'
        rag_usage:
          oneOf:
            - $ref: '#/components/schemas/ConversationHistoryRagUsageCommonModel'
            - type: 'null'
        text_only:
          type: boolean
          default: false
        features_usage:
          $ref: '#/components/schemas/FeaturesUsageCommonModel'
        eleven_assistant:
          $ref: '#/components/schemas/ConversationHistoryElevenAssistantCommonModel'
        initiator_id:
          type:
            - string
            - 'null'
        conversation_initiation_source:
          $ref: '#/components/schemas/ConversationInitiationSource'
        conversation_initiation_source_version:
          type:
            - string
            - 'null'
        timezone:
          type:
            - string
            - 'null'
        initiation_trigger:
          $ref: >-
            #/components/schemas/ConversationHistoryMetadataCommonModelInitiationTrigger
        async_metadata:
          oneOf:
            - $ref: '#/components/schemas/AsyncConversationMetadata'
            - type: 'null'
        whatsapp:
          oneOf:
            - $ref: '#/components/schemas/WhatsAppConversationInfo'
            - type: 'null'
        agent_created_from:
          $ref: '#/components/schemas/AgentDefinitionSource'
        agent_last_updated_from:
          $ref: '#/components/schemas/AgentDefinitionSource'
      required:
        - start_time_unix_secs
        - call_duration_secs
    EvaluationSuccessResult:
      type: string
      enum:
        - value: success
        - value: failure
        - value: unknown
    ConversationHistoryEvaluationCriteriaResultCommonModel:
      type: object
      properties:
        criteria_id:
          type: string
        result:
          $ref: '#/components/schemas/EvaluationSuccessResult'
        rationale:
          type: string
      required:
        - criteria_id
        - result
        - rationale
    LiteralJsonSchemaPropertyType:
      type: string
      enum:
        - value: boolean
        - value: string
        - value: integer
        - value: number
    LiteralJsonSchemaPropertyConstantValue:
      oneOf:
        - type: string
        - type: integer
        - type: number
          format: double
        - type: boolean
    LiteralJsonSchemaProperty:
      type: object
      properties:
        type:
          $ref: '#/components/schemas/LiteralJsonSchemaPropertyType'
        description:
          type: string
          default: ''
          description: The description of the property
        enum:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of allowed string values for string type parameters
        is_system_provided:
          type: boolean
          default: false
          description: >-
            If true, the value will be populated by the system at runtime. Used
            by Api Integration Webhook tools for templating.
        dynamic_variable:
          type: string
          default: ''
          description: The dynamic variable of the property
        constant_value:
          $ref: '#/components/schemas/LiteralJsonSchemaPropertyConstantValue'
          description: The constant value of the property
      required:
        - type
    DataCollectionResultCommonModel:
      type: object
      properties:
        data_collection_id:
          type: string
        value:
          description: Any type
        json_schema:
          oneOf:
            - $ref: '#/components/schemas/LiteralJsonSchemaProperty'
            - type: 'null'
        rationale:
          type: string
      required:
        - data_collection_id
        - rationale
    ConversationHistoryAnalysisCommonModel:
      type: object
      properties:
        evaluation_criteria_results:
          type: object
          additionalProperties:
            $ref: >-
              #/components/schemas/ConversationHistoryEvaluationCriteriaResultCommonModel
        data_collection_results:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/DataCollectionResultCommonModel'
        call_successful:
          $ref: '#/components/schemas/EvaluationSuccessResult'
        transcript_summary:
          type: string
        call_summary_title:
          type:
            - string
            - 'null'
      required:
        - call_successful
        - transcript_summary
    SoftTimeoutConfigOverride:
      type: object
      properties:
        message:
          type:
            - string
            - 'null'
          description: >-
            Message to show when soft timeout is reached while waiting for LLM
            response
    TurnConfigOverride:
      type: object
      properties:
        soft_timeout_config:
          oneOf:
            - $ref: '#/components/schemas/SoftTimeoutConfigOverride'
            - type: 'null'
          description: >-
            Configuration for soft timeout functionality. Provides immediate
            feedback during longer LLM responses.
    TTSConversationalConfigOverride:
      type: object
      properties:
        voice_id:
          type:
            - string
            - 'null'
          description: The voice ID to use for TTS
        stability:
          type:
            - number
            - 'null'
          format: double
          description: The stability of generated speech
        speed:
          type:
            - number
            - 'null'
          format: double
          description: The speed of generated speech
        similarity_boost:
          type:
            - number
            - 'null'
          format: double
          description: The similarity boost for generated speech
    ConversationConfigOverride:
      type: object
      properties:
        text_only:
          type:
            - boolean
            - 'null'
          description: >-
            If enabled audio will not be processed and only text will be used,
            use to avoid audio pricing.
    LLM:
      type: string
      enum:
        - value: gpt-4o-mini
        - value: gpt-4o
        - value: gpt-4
        - value: gpt-4-turbo
        - value: gpt-4.1
        - value: gpt-4.1-mini
        - value: gpt-4.1-nano
        - value: gpt-5
        - value: gpt-5.1
        - value: gpt-5.2
        - value: gpt-5.2-chat-latest
        - value: gpt-5-mini
        - value: gpt-5-nano
        - value: gpt-3.5-turbo
        - value: gemini-1.5-pro
        - value: gemini-1.5-flash
        - value: gemini-2.0-flash
        - value: gemini-2.0-flash-lite
        - value: gemini-2.5-flash-lite
        - value: gemini-2.5-flash
        - value: gemini-3-pro-preview
        - value: claude-sonnet-4-5
        - value: claude-sonnet-4
        - value: claude-haiku-4-5
        - value: claude-3-7-sonnet
        - value: claude-3-5-sonnet
        - value: claude-3-5-sonnet-v1
        - value: claude-3-haiku
        - value: grok-beta
        - value: custom-llm
        - value: qwen3-4b
        - value: qwen3-30b-a3b
        - value: gpt-oss-20b
        - value: gpt-oss-120b
        - value: glm-45-air-fp8
        - value: gemini-2.5-flash-preview-09-2025
        - value: gemini-2.5-flash-lite-preview-09-2025
        - value: gemini-2.5-flash-preview-05-20
        - value: gemini-2.5-flash-preview-04-17
        - value: gemini-2.5-flash-lite-preview-06-17
        - value: gemini-2.0-flash-lite-001
        - value: gemini-2.0-flash-001
        - value: gemini-1.5-flash-002
        - value: gemini-1.5-flash-001
        - value: gemini-1.5-pro-002
        - value: gemini-1.5-pro-001
        - value: claude-sonnet-4@20250514
        - value: claude-sonnet-4-5@20250929
        - value: claude-haiku-4-5@20251001
        - value: claude-3-7-sonnet@20250219
        - value: claude-3-5-sonnet@20240620
        - value: claude-3-5-sonnet-v2@20241022
        - value: claude-3-haiku@20240307
        - value: gpt-5-2025-08-07
        - value: gpt-5.1-2025-11-13
        - value: gpt-5.2-2025-12-11
        - value: gpt-5-mini-2025-08-07
        - value: gpt-5-nano-2025-08-07
        - value: gpt-4.1-2025-04-14
        - value: gpt-4.1-mini-2025-04-14
        - value: gpt-4.1-nano-2025-04-14
        - value: gpt-4o-mini-2024-07-18
        - value: gpt-4o-2024-11-20
        - value: gpt-4o-2024-08-06
        - value: gpt-4o-2024-05-13
        - value: gpt-4-0613
        - value: gpt-4-0314
        - value: gpt-4-turbo-2024-04-09
        - value: gpt-3.5-turbo-0125
        - value: gpt-3.5-turbo-1106
        - value: watt-tool-8b
        - value: watt-tool-70b
    PromptAgentAPIModelOverride:
      type: object
      properties:
        prompt:
          type:
            - string
            - 'null'
          description: The prompt for the agent
        llm:
          oneOf:
            - $ref: '#/components/schemas/LLM'
            - type: 'null'
          description: >-
            The LLM to query with the prompt and the chat history. If using data
            residency, the LLM must be supported in the data residency
            environment
        native_mcp_server_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of Native MCP server ids to be used by the agent
    AgentConfigOverride-Output:
      type: object
      properties:
        first_message:
          type:
            - string
            - 'null'
          description: >-
            If non-empty, the first message the agent will say. If empty, the
            agent waits for the user to start the discussion.
        language:
          type:
            - string
            - 'null'
          description: Language of the agent - used for ASR and TTS
        prompt:
          oneOf:
            - $ref: '#/components/schemas/PromptAgentAPIModelOverride'
            - type: 'null'
          description: The prompt for the agent
    ConversationConfigClientOverride-Output:
      type: object
      properties:
        turn:
          oneOf:
            - $ref: '#/components/schemas/TurnConfigOverride'
            - type: 'null'
          description: Configuration for turn detection
        tts:
          oneOf:
            - $ref: '#/components/schemas/TTSConversationalConfigOverride'
            - type: 'null'
          description: Configuration for conversational text to speech
        conversation:
          oneOf:
            - $ref: '#/components/schemas/ConversationConfigOverride'
            - type: 'null'
          description: Configuration for conversational events
        agent:
          oneOf:
            - $ref: '#/components/schemas/AgentConfigOverride-Output'
            - type: 'null'
          description: Agent specific configuration
    ConversationInitiationClientDataRequestOutputCustomLlmExtraBody:
      type: object
      properties: {}
    ConversationInitiationSourceInfo:
      type: object
      properties:
        source:
          oneOf:
            - $ref: '#/components/schemas/ConversationInitiationSource'
            - type: 'null'
          description: Source of the conversation initiation
        version:
          type:
            - string
            - 'null'
          description: The SDK version number
    ConversationInitiationClientDataRequestOutputDynamicVariables:
      oneOf:
        - type: string
        - type: number
          format: double
        - type: integer
        - type: boolean
    ConversationInitiationClientDataRequest-Output:
      type: object
      properties:
        conversation_config_override:
          $ref: '#/components/schemas/ConversationConfigClientOverride-Output'
        custom_llm_extra_body:
          $ref: >-
            #/components/schemas/ConversationInitiationClientDataRequestOutputCustomLlmExtraBody
        user_id:
          type:
            - string
            - 'null'
          description: >-
            ID of the end user participating in this conversation (for agent
            owner's user identification)
        source_info:
          $ref: '#/components/schemas/ConversationInitiationSourceInfo'
        dynamic_variables:
          type: object
          additionalProperties:
            oneOf:
              - $ref: >-
                  #/components/schemas/ConversationInitiationClientDataRequestOutputDynamicVariables
              - type: 'null'
    GetConversationResponseModel:
      type: object
      properties:
        agent_id:
          type: string
        conversation_id:
          type: string
        status:
          $ref: '#/components/schemas/GetConversationResponseModelStatus'
        user_id:
          type:
            - string
            - 'null'
        branch_id:
          type:
            - string
            - 'null'
        transcript:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModel-Output
        metadata:
          $ref: '#/components/schemas/ConversationHistoryMetadataCommonModel'
        analysis:
          oneOf:
            - $ref: '#/components/schemas/ConversationHistoryAnalysisCommonModel'
            - type: 'null'
        conversation_initiation_client_data:
          $ref: '#/components/schemas/ConversationInitiationClientDataRequest-Output'
        has_audio:
          type: boolean
        has_user_audio:
          type: boolean
        has_response_audio:
          type: boolean
      required:
        - agent_id
        - conversation_id
        - status
        - transcript
        - metadata
        - has_audio
        - has_user_audio
        - has_response_audio

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.conversations.get("123");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.conversations.get(
    conversation_id="123"
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

	url := "https://api.elevenlabs.io/v1/convai/conversations/123"

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

url = URI("https://api.elevenlabs.io/v1/convai/conversations/123")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/conversations/123")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/conversations/123', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/conversations/123");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/conversations/123")! as URL,
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